"""
market.py
---------
Market price tracking: one independent async loop per product that has a
market_price_url set, on its own slow cadence (hours, not seconds) -
completely decoupled from the restock monitor in monitor.py. This never
adds load to the retailer pages being watched for restocks, and never
feeds restock detection; it's shown for context only.

Uses the shared browser from browser.py to render pricing pages like a
real browser would (secondary-market pages, like a real TCGPlayer product
page checked while building this, render their price client-side - the
initial HTML has no price in it at all).
"""

import asyncio
import logging
import random
import re
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import select

from app.browser import render_page_text
from app.db import get_session
from app.models import MarketPrice, Product, Settings

logger = logging.getLogger("holo.market")

MAX_BACKOFF_MULTIPLIER = 8

_tasks: dict[int, asyncio.Task] = {}


def _get_settings(session) -> Settings:
    settings = session.get(Settings, 1)
    if settings is None:
        settings = Settings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _extract_price(page_text: str, label: str) -> Optional[float]:
    """
    Find `label` in the rendered page's text and pull the dollar amount
    that follows it (across whatever whitespace/tabs separate a label
    from its value in that site's layout).
    """
    pattern = re.escape(label) + r"[^\d$]{0,20}\$\s*([\d,]+\.\d{2})"
    match = re.search(pattern, page_text)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


async def _fetch_price(url: str, label: str) -> float:
    text, _html = await render_page_text(url)
    price = _extract_price(text, label)
    if price is None:
        raise ValueError(f'Could not find a "{label}" price on the page')
    return price


async def _check_once(product_id: int) -> None:
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None or not product.is_active or not product.market_price_url:
            return
        settings = _get_settings(session)
        url, label = product.market_price_url, settings.market_price_label

    try:
        price = await _fetch_price(url, label)
    except Exception as error:
        logger.warning("Market price check failed for product %d: %s", product_id, error)
        with get_session() as session:
            product = session.get(Product, product_id)
            if product:
                product.market_consecutive_failures += 1
                session.add(product)
                session.commit()
        return

    now = datetime.now(timezone.utc)
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None:
            return
        session.add(MarketPrice(product_id=product_id, price=price, fetched_at=now))
        product.latest_market_price = price
        product.latest_market_checked_at = now
        product.market_consecutive_failures = 0
        session.add(product)
        session.commit()
    logger.info("Market price for product %d: $%.2f", product_id, price)


def _next_interval_seconds(settings: Settings, consecutive_failures: int) -> float:
    base_seconds = settings.market_check_interval_hours * 3600
    multiplier = min(2 ** min(consecutive_failures, 3), MAX_BACKOFF_MULTIPLIER) if consecutive_failures else 1
    return base_seconds * multiplier + random.uniform(0, 60)


async def _product_loop(product_id: int) -> None:
    await asyncio.sleep(random.uniform(0, 10))

    while True:
        try:
            await _check_once(product_id)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected error checking market price for product %d", product_id)

        with get_session() as session:
            product = session.get(Product, product_id)
            if product is None or not product.is_active or not product.market_price_url:
                return
            settings = _get_settings(session)
            failures = product.market_consecutive_failures

        await asyncio.sleep(_next_interval_seconds(settings, failures))


def start_product_market_loop(product_id: int, market_price_url: Optional[str]) -> None:
    """Start (or restart) market price tracking for one product, if it has a URL set."""
    if not market_price_url:
        return
    existing = _tasks.get(product_id)
    if existing and not existing.done():
        return
    _tasks[product_id] = asyncio.create_task(_product_loop(product_id))


def stop_product_market_loop(product_id: int) -> None:
    task = _tasks.pop(product_id, None)
    if task:
        task.cancel()


async def refresh_now(product_id: int) -> float:
    """Used by POST /api/market/{id}/refresh - fetch immediately, outside the loop's wait."""
    await _check_once(product_id)
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None or product.latest_market_price is None:
            raise ValueError("Could not fetch a market price for this product")
        return product.latest_market_price


async def start_all() -> None:
    with get_session() as session:
        products = session.exec(
            select(Product).where(Product.is_active == True)  # noqa: E712
        ).all()
    started = 0
    for product in products:
        if product.market_price_url:
            start_product_market_loop(product.id, product.market_price_url)
            started += 1
    logger.info("Started market price tracking for %d product(s).", started)


async def stop_all() -> None:
    # Note: this does not close the shared browser from browser.py - it's
    # shared with monitor.py, so main.py's lifespan closes it once, after
    # both monitor.stop_all() and market.stop_all() have finished.
    tasks = list(_tasks.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    _tasks.clear()
