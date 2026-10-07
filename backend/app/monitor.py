"""
monitor.py
----------
The restock monitor: one independent async loop per product, instead of
the original CLI script's single "check everything, then sleep" cycle.

Why per-product loops instead of one shared loop:
  - Staggering. If every product is checked back-to-back in one cycle,
    all requests to (say) Target fire in the same second every interval.
    Independent loops with a small startup stagger and per-check jitter
    spread requests out naturally.
  - Isolation. A slow or hanging request for one product's page can't
    delay checks for every other product.
  - Backoff. A product that starts erroring backs off on its own
    schedule without affecting healthy products.

Pages are rendered with a real (shared, headless) browser rather than a
plain HTTP fetch - checked against a real Target product page while
building this: the static HTML is a near-empty JS shell (~1KB of visible
text) that contains generic "Add to Cart" button markup regardless of
actual availability, but never the real "Out of stock" text, which only
gets injected by client-side JavaScript. A plain-HTTP fetch would read
that page as in-stock 100% of the time, regardless of real availability.

This module only decides *whether* a product is in stock and records
that. It never clicks anything itself - a detected restock just triggers
checkout.py's run_checkout() for products that have auto-checkout armed.
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional

from bs4 import BeautifulSoup
from sqlmodel import select

from app.browser import render_page_text
from app.checkout import run_checkout
from app.db import get_session
from app.models import Product, RestockEvent, Settings, StockCheck
from app.notifier import send_discord_alert
from app.robots import check_courtesy

logger = logging.getLogger("holo.monitor")

STATUS_IN_STOCK = "in_stock"
STATUS_OUT_OF_STOCK = "out_of_stock"
STATUS_UNKNOWN = "unknown"
STATUS_ERROR = "error"

MAX_BACKOFF_MULTIPLIER = 8

# Registry of running per-product loop tasks, so the API can start/stop
# monitoring a product as it's added, deactivated, or removed.
_tasks: dict[int, asyncio.Task] = {}


def _get_settings(session) -> Settings:
    settings = session.get(Settings, 1)
    if settings is None:
        settings = Settings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _in_quiet_hours(settings: Settings, now: datetime) -> bool:
    start, end = settings.quiet_hours_start, settings.quiet_hours_end
    if start is None or end is None:
        return False
    hour = now.hour
    if start == end:
        return False
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end  # overnight window, e.g. 22 -> 7


def _classify_status(page_text: str, settings: Settings) -> str:
    lowered = page_text.lower()
    # Out-of-stock phrases are checked first: some pages still render an
    # "Add to Cart" button in the markup even when it's actually disabled.
    for phrase in settings.out_of_stock_phrases:
        if phrase.lower() in lowered:
            return STATUS_OUT_OF_STOCK
    for phrase in settings.in_stock_phrases:
        if phrase.lower() in lowered:
            return STATUS_IN_STOCK
    return STATUS_UNKNOWN


def _extract_image_url(html: str) -> Optional[str]:
    """og:image is meant for social-link previews, so unlike stock text
    it's typically rendered server-side into <head> even on otherwise
    JS-heavy sites (confirmed against a real Target product page)."""
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
    return tag.get("content") if tag else None


async def _fetch_status(url: str, settings: Settings) -> tuple[str, Optional[str]]:
    text, html = await render_page_text(url)
    return _classify_status(text, settings), _extract_image_url(html)


async def _check_once(product_id: int) -> None:
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None or not product.is_active:
            return
        settings = _get_settings(session)

        previous_status = product.last_status
        try:
            new_status, image_url = await _fetch_status(product.url, settings)
            product.consecutive_failures = 0
            # Keep the existing image if this particular check didn't find
            # one, rather than blanking out a good image on a fluke.
            if image_url:
                product.image_url = image_url
        except Exception as error:
            logger.warning("Check failed for product %d (%s): %s", product.id, product.name, error)
            new_status = STATUS_ERROR
            product.consecutive_failures += 1

        now = datetime.now(timezone.utc)
        session.add(StockCheck(product_id=product.id, status=new_status, checked_at=now))

        just_restocked = new_status == STATUS_IN_STOCK and previous_status in (STATUS_OUT_OF_STOCK, STATUS_UNKNOWN)

        product.last_status = new_status
        product.last_checked_at = now
        session.add(product)
        session.commit()

        if just_restocked:
            await _handle_restock(product, previous_status, settings, now)


async def _handle_restock(product: Product, previous_status: str, settings: Settings, detected_at: datetime) -> None:
    logger.info("Restock detected: %s (%s)", product.name, product.store)

    with get_session() as session:
        event = RestockEvent(
            product_id=product.id,
            previous_status=previous_status,
            detected_at=detected_at,
        )

        should_notify = product.notify_enabled and settings.discord_webhook_url
        if should_notify and _in_quiet_hours(settings, detected_at.astimezone()):
            event.notify_error = "skipped: quiet hours"
            should_notify = False

        if should_notify:
            success, error = await send_discord_alert(settings.discord_webhook_url, product.name, product.url)
            if success:
                event.notified_at = datetime.now(timezone.utc)
            else:
                event.notify_error = error

        session.add(event)
        session.commit()

    if product.auto_checkout_enabled:
        # Fire-and-forget: browser automation takes seconds to minutes and
        # must never block this loop's next check for this (or any other)
        # product. checkout.py owns its own concurrency cap and logging.
        asyncio.create_task(run_checkout(product.id))


def _next_interval(settings: Settings, consecutive_failures: int) -> float:
    multiplier = min(2 ** min(consecutive_failures, 3), MAX_BACKOFF_MULTIPLIER) if consecutive_failures else 1
    return settings.check_interval_seconds * multiplier + random.uniform(0, 5)


async def _product_loop(product_id: int) -> None:
    # Small randomized startup delay so newly-added products don't all
    # fire their first check in lockstep with each other either.
    await asyncio.sleep(random.uniform(0, 3))

    while True:
        try:
            await _check_once(product_id)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected error checking product %d", product_id)

        with get_session() as session:
            product = session.get(Product, product_id)
            if product is None or not product.is_active:
                return  # product removed/deactivated - let the loop end
            settings = _get_settings(session)
            failures = product.consecutive_failures

        await asyncio.sleep(_next_interval(settings, failures))


def start_product_monitor(product_id: int, product_url: str) -> None:
    """Start (or restart) the monitor loop for one product."""
    check_courtesy(product_url)
    existing = _tasks.get(product_id)
    if existing and not existing.done():
        return
    _tasks[product_id] = asyncio.create_task(_product_loop(product_id))


def stop_product_monitor(product_id: int) -> None:
    """Stop the monitor loop for one product (deactivated or deleted)."""
    task = _tasks.pop(product_id, None)
    if task:
        task.cancel()


async def start_all() -> None:
    """Called once on app startup: begin monitoring every active product."""
    with get_session() as session:
        products = session.exec(select(Product).where(Product.is_active == True)).all()  # noqa: E712
    for product in products:
        start_product_monitor(product.id, product.url)
    logger.info("Started monitoring %d product(s).", len(products))


async def stop_all() -> None:
    """Called on app shutdown: cancel every running loop cleanly."""
    tasks = list(_tasks.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    _tasks.clear()
