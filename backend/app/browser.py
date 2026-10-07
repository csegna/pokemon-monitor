"""
browser.py
----------
One shared, ephemeral Playwright browser instance used by both
monitor.py (restock checks) and market.py (price checks) - the
"render a public page like a real browser would, then read its text"
pattern that both need. checkout.py deliberately does NOT use this: it
needs persistent per-store contexts (so a login sticks around), which is
a different lifecycle than "open a page, read it, close it."

Sharing one browser process across both read-only loops instead of each
maintaining its own halves the Chromium processes this app runs.
"""

import logging
from typing import Optional

from playwright.async_api import Browser, Page, async_playwright

logger = logging.getLogger("holo.browser")

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_playwright_ctx = None
_browser: Optional[Browser] = None


async def get_browser() -> Browser:
    global _playwright_ctx, _browser
    if _browser is None:
        _playwright_ctx = await async_playwright().start()
        _browser = await _playwright_ctx.chromium.launch()
    return _browser


async def render_page_text(url: str, settle_ms: int = 4500) -> tuple[str, str]:
    """
    Load `url` like a real browser, wait for client-side rendering to
    settle, and return (visible_body_text, raw_html). Both are handed
    back since monitor.py needs the text for phrase matching and the raw
    HTML for the og:image meta tag, which inner_text() doesn't expose.
    """
    browser = await get_browser()
    page: Page = await browser.new_page(user_agent=DEFAULT_USER_AGENT)
    try:
        await page.goto(url, timeout=30000, wait_until="load")
        await page.wait_for_timeout(settle_ms)
        text = await page.inner_text("body")
        html = await page.content()
    finally:
        await page.close()
    return text, html


async def shutdown() -> None:
    global _browser, _playwright_ctx
    if _browser is not None:
        await _browser.close()
        _browser = None
    if _playwright_ctx is not None:
        await _playwright_ctx.stop()
        _playwright_ctx = None
