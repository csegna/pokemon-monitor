"""
suggestions.py
---------------
Product discovery: "what's selling well right now that you might want to
track?" Sourced from TCGPlayer's own "Best Selling" sort on its sealed
Pokémon products page - confirmed by rendering the real page while
building this (the sort control isn't reflected in the URL, so it has to
be selected via the page's own dropdown, not guessed as a query param).

What this deliberately does NOT try to do: find the matching product on
Target/Walmart/Best Buy/GameStop/Pokémon Center automatically. A real
test run of a Target on-site search for a suggested product's name
returned the right item first but mixed with unrelated ones (a different
set's box, an accessory); Walmart and Pokémon Center both actively
challenge headless browsers ("Robot or human?" / "Pardon Our
Interruption") before you even get to a result. Auto-matching under
those conditions risks silently pointing a suggestion at the wrong
product - which matters a lot once auto-checkout can be armed on it. So
this only ever hands back plain, unrendered search-URLs for each
retailer; you open them yourself and paste in the URL you find.
"""

import logging
import re
import time
from typing import Optional
from urllib.parse import quote_plus

from sqlmodel import select

from app.browser import get_browser
from app.db import get_session
from app.models import DismissedSuggestion, Product

logger = logging.getLogger("holo.suggestions")

TCGPLAYER_SEALED_URL = (
    "https://www.tcgplayer.com/search/pokemon/product"
    "?productLineName=pokemon&page=1&view=grid&ProductTypeName=Sealed+Products"
)

# Plain, unrendered search URLs - never scraped, just handed to the user
# to open in their own browser. Pokémon Center's pattern is best-effort
# (its search page actively blocks headless automation, so it was never
# actually confirmed the way Target's was - see the module docstring).
RETAILER_SEARCH_TEMPLATES = {
    "Target": "https://www.target.com/s?searchTerm={q}",
    "Walmart": "https://www.walmart.com/search?q={q}",
    "Best Buy": "https://www.bestbuy.com/site/searchpage.jsp?st={q}",
    "GameStop": "https://www.gamestop.com/search/?q={q}",
    "Pokémon Center": "https://www.pokemoncenter.com/search/all?q={q}",
}

CACHE_TTL_SECONDS = 60 * 60  # 1 hour - best sellers don't move minute to minute
_cache: dict = {"fetched_at": 0.0, "items": []}


def retailer_search_links(product_name: str) -> dict[str, str]:
    query = quote_plus(product_name)
    return {store: template.format(q=query) for store, template in RETAILER_SEARCH_TEMPLATES.items()}


def _extract_tcgplayer_id(url: str) -> Optional[str]:
    """Pulls the numeric id out of .../product/593355/pokemon-... - used to
    de-duplicate suggestions against products already being tracked."""
    match = re.search(r"/product/(\d+)", url)
    return match.group(1) if match else None


async def _scrape_best_sellers(limit: int) -> list[dict]:
    browser = await get_browser()
    page = await browser.new_page(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    )
    try:
        await page.goto(TCGPLAYER_SEALED_URL, timeout=30000, wait_until="load")
        await page.wait_for_timeout(3000)

        # The sort dropdown's element ids are auto-generated per render, so
        # this locates it by its current label text ("Best Match" is the
        # default) rather than a fragile id - confirmed necessary: the
        # numeric ids genuinely changed between two page loads while
        # building this.
        trigger = page.locator('[id^="tcg-input-"]').filter(has_text="Best Match")
        await trigger.first.click(timeout=8000)
        await page.wait_for_timeout(500)
        option = page.locator('[id*="dropdown-item-"]', has_text="Best Selling")
        await option.first.click(timeout=8000)
        await page.wait_for_timeout(3000)

        cards = await page.eval_on_selector_all(
            ".product-card",
            """(els) => els.map(el => {
                const setName = el.querySelector(".product-card__set-name__variant")?.textContent.trim();
                const title = el.querySelector(".product-card__title")?.textContent.trim();
                const price = el.querySelector(".product-card__market-price--value")?.textContent.trim();
                const href = el.querySelector('a[href*="/product/"]')?.getAttribute("href");
                return {setName, title, price, href};
            })""",
        )
    finally:
        await page.close()

    results = []
    for card in cards:
        title = card.get("title")
        href = card.get("href")
        price_text = card.get("price")
        if not title or not href or not price_text:
            continue
        if "booster box" in title.lower():
            continue  # the one product type explicitly excluded

        product_id = _extract_tcgplayer_id(href)
        if not product_id:
            continue

        try:
            price = float(price_text.replace("$", "").replace(",", ""))
        except ValueError:
            continue

        results.append(
            {
                "tcgplayer_product_id": product_id,
                "name": title,
                "set_name": card.get("setName") or "",
                "market_price": price,
                "tcgplayer_url": f"https://www.tcgplayer.com{href.split('?')[0]}",
            }
        )
        if len(results) >= limit:
            break

    return results


async def get_suggestions(limit: int = 10, force_refresh: bool = False) -> list[dict]:
    now = time.time()
    cache_is_fresh = (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS
    if force_refresh or not cache_is_fresh:
        try:
            # Scrape more than `limit` since dedup/dismissal filtering
            # happens after caching, against a fixed raw batch.
            _cache["items"] = await _scrape_best_sellers(limit=30)
            _cache["fetched_at"] = now
        except Exception:
            logger.exception("Could not fetch TCGPlayer best sellers")
            if not _cache["items"]:
                return []

    with get_session() as session:
        dismissed_ids = {
            row.tcgplayer_product_id for row in session.exec(select(DismissedSuggestion)).all()
        }
        tracked_products = session.exec(
            select(Product).where(Product.market_price_url != None)  # noqa: E711
        ).all()
        tracked_ids = {
            tid for p in tracked_products if (tid := _extract_tcgplayer_id(p.market_price_url))
        }

    filtered = [
        item
        for item in _cache["items"]
        if item["tcgplayer_product_id"] not in dismissed_ids and item["tcgplayer_product_id"] not in tracked_ids
    ]

    for item in filtered:
        item["retailer_links"] = retailer_search_links(item["name"])

    return filtered[:limit]


def dismiss(tcgplayer_product_id: str) -> None:
    with get_session() as session:
        exists = session.exec(
            select(DismissedSuggestion).where(
                DismissedSuggestion.tcgplayer_product_id == tcgplayer_product_id
            )
        ).first()
        if not exists:
            session.add(DismissedSuggestion(tcgplayer_product_id=tcgplayer_product_id))
            session.commit()
