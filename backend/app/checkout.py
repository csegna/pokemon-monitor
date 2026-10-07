"""
checkout.py
-----------
Auto-checkout: triggered by monitor.py the moment a restock is detected
for a product with auto_checkout_enabled. Opens a real browser, loads the
product page, and clicks an "Add to Cart"-equivalent button - the same
public action any shopper can take. Then it stops.

What this deliberately never does: solve a CAPTCHA, fill in a login form,
enter payment details, or try to detect and route around a waiting-room
queue. If anything that looks like a human-verification challenge shows
up, this logs it and stops - you finish it yourself in the browser window
that's left open.

Concurrency and safety rules, not just suggestions:
  - A global semaphore caps how many checkout browser sessions can be
    open at once, so a burst of simultaneous restocks can't spawn a pile
    of Chromium processes.
  - Each store gets its own persistent browser profile (cookies/login
    reused across restocks at that store), separate from every other
    store's profile.
  - A session that sits open past its timeout closes itself and logs
    that it did, rather than leaking a browser window forever.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from playwright.async_api import BrowserContext, Page, async_playwright
from sqlmodel import select

from app.db import get_session
from app.models import CheckoutLog, CheckoutSession, Product, Settings

logger = logging.getLogger("holo.checkout")

MAX_CONCURRENT_SESSIONS = 2
ADD_TO_CART_LABELS = ["Add to Cart", "Add to Bag", "Add to Basket", "Buy Now"]

# Patterns that mean "a human needs to prove they're a human here" - if any
# of these show up, this stops immediately rather than trying to get past
# them. Matched against the rendered page's own text and its frame URLs.
VERIFICATION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"captcha",
        r"are you a human",
        r"are you a robot",
        r"verify you are human",
        r"access denied",
        r"queue-?it",
        r"waiting room",
        r"pardon our interruption",
    ]
]

PROFILE_ROOT = Path(__file__).resolve().parent.parent / "browser_profiles"

_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SESSIONS)
_playwright_ctx = None
_contexts: dict[str, BrowserContext] = {}
_open_pages: dict[int, Page] = {}
_released_sessions: set[int] = set()


def _get_settings(session) -> Settings:
    settings = session.get(Settings, 1)
    if settings is None:
        settings = Settings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _log(session_id: int, level: str, message: str) -> None:
    with get_session() as db:
        db.add(CheckoutLog(session_id=session_id, level=level, message=message))
        db.commit()
    logger.info("[session %d] %s: %s", session_id, level, message)


def _set_state(session_id: int, state: str, closed: bool = False) -> None:
    with get_session() as db:
        checkout_session = db.get(CheckoutSession, session_id)
        if checkout_session is None:
            return
        checkout_session.state = state
        if closed:
            checkout_session.closed_at = datetime.now(timezone.utc)
        db.add(checkout_session)
        db.commit()


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "store"


async def _get_context(store: str, headless: bool) -> BrowserContext:
    global _playwright_ctx
    if _playwright_ctx is None:
        _playwright_ctx = await async_playwright().start()

    existing = _contexts.get(store)
    if existing is not None:
        return existing

    profile_dir = PROFILE_ROOT / _slugify(store)
    profile_dir.mkdir(parents=True, exist_ok=True)
    context = await _playwright_ctx.chromium.launch_persistent_context(
        user_data_dir=str(profile_dir),
        headless=headless,
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    )
    _contexts[store] = context
    return context


async def _looks_like_verification(page: Page) -> Optional[str]:
    """Return a description of what was detected, or None if the page looks normal."""
    try:
        text = await page.inner_text("body")
    except Exception:
        text = ""

    for pattern in VERIFICATION_PATTERNS:
        if pattern.search(text):
            return f'page text matched "{pattern.pattern}"'

    for frame in page.frames:
        if any(pattern.search(frame.url) for pattern in VERIFICATION_PATTERNS):
            return f"a frame URL looked like a verification challenge ({frame.url})"

    return None


def _release_once(session_id: int) -> None:
    if session_id not in _released_sessions:
        _released_sessions.add(session_id)
        _semaphore.release()


async def close_session(session_id: int, reason: str = "closed by you") -> None:
    page = _open_pages.pop(session_id, None)
    if page is not None:
        try:
            await page.close()
        except Exception:
            pass
    _set_state(session_id, "closed", closed=True)
    _log(session_id, "info", f"Session closed - {reason}.")
    _release_once(session_id)


async def _auto_close_after_timeout(session_id: int, minutes: int) -> None:
    await asyncio.sleep(minutes * 60)
    if session_id in _open_pages:
        _log(session_id, "wait", f"No activity for {minutes} minutes - closing this session automatically.")
        await close_session(session_id, reason="timed out")
        _set_state(session_id, "timed_out", closed=True)


async def run_checkout(product_id: int) -> None:
    """Entry point: called by monitor.py right after a restock is detected."""
    with get_session() as db:
        product = db.get(Product, product_id)
        if product is None or not product.auto_checkout_enabled:
            return
        settings = _get_settings(db)
        name, url, store = product.name, product.url, product.store
        headless = settings.checkout_headless
        timeout_minutes = settings.checkout_session_timeout_minutes

    acquired = False
    try:
        acquired = await asyncio.wait_for(_semaphore.acquire(), timeout=1)
    except asyncio.TimeoutError:
        pass

    with get_session() as db:
        checkout_session = CheckoutSession(product_id=product_id, state="opening")
        db.add(checkout_session)
        db.commit()
        db.refresh(checkout_session)
        session_id = checkout_session.id

    if not acquired:
        _log(
            session_id,
            "wait",
            f"{MAX_CONCURRENT_SESSIONS} checkout sessions already open - skipping automation for this restock. "
            "Add it to your cart manually if you want it.",
        )
        _set_state(session_id, "skipped_capacity", closed=True)
        return

    _log(session_id, "info", f"Restock detected for '{name}' ({store}) - opening browser.")

    try:
        context = await _get_context(store, headless)
        page = await context.new_page()
        _open_pages[session_id] = page

        await page.goto(url, timeout=30000)
        _log(session_id, "ok", "Loaded the product page.")

        verification = await _looks_like_verification(page)
        if verification:
            _log(session_id, "human", f"Verification challenge detected ({verification}) - stopping here.")
            _log(session_id, "human", "Please complete this yourself in the open browser window.")
            _set_state(session_id, "needs_verification")
            asyncio.create_task(_auto_close_after_timeout(session_id, timeout_minutes))
            return

        clicked_label = None
        for label in ADD_TO_CART_LABELS:
            try:
                await page.get_by_role("button", name=label, exact=False).click(timeout=3000)
                clicked_label = label
                break
            except Exception:
                continue

        if clicked_label:
            _log(session_id, "ok", f'Clicked a "{clicked_label}" button.')
            verification = await _looks_like_verification(page)
            if verification:
                _log(session_id, "human", f"Verification challenge appeared after adding to cart ({verification}).")
                _set_state(session_id, "needs_verification")
            else:
                _set_state(session_id, "cart_ready")
                _log(session_id, "human", "Cart ready - log in, solve any CAPTCHA, and pay yourself from here.")
        else:
            _set_state(session_id, "add_to_cart_failed")
            _log(session_id, "wait", "Couldn't find an add-to-cart button automatically - please add it manually.")

        asyncio.create_task(_auto_close_after_timeout(session_id, timeout_minutes))

    except Exception as error:
        logger.exception("Checkout automation failed for product %d", product_id)
        _log(session_id, "error", f"Automation error: {error}")
        _set_state(session_id, "error", closed=True)
        _open_pages.pop(session_id, None)
        _release_once(session_id)


async def shutdown() -> None:
    """Called on app shutdown - close every open page/context cleanly."""
    for session_id in list(_open_pages.keys()):
        await close_session(session_id, reason="server shutting down")

    for context in _contexts.values():
        try:
            await context.close()
        except Exception:
            pass
    _contexts.clear()

    global _playwright_ctx
    if _playwright_ctx is not None:
        await _playwright_ctx.stop()
        _playwright_ctx = None
