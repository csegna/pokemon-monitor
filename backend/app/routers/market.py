"""
market.py (router)
-------------------
Read the price history for a product's chart, and let the user force an
immediate fetch instead of waiting out the (multi-hour) regular cadence -
handy right after adding a market_price_url, and for testing.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.db import get_session
from app.market import refresh_now
from app.models import MarketPrice, Product
from app.schemas import MarketPriceRead

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/{product_id}/history", response_model=list[MarketPriceRead])
def get_price_history(product_id: int, weeks: int = 26):
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")

        rows = session.exec(
            select(MarketPrice)
            .where(MarketPrice.product_id == product_id)
            .where(MarketPrice.fetched_at >= cutoff)
            .order_by(MarketPrice.fetched_at)
        ).all()
        return [MarketPriceRead(price=r.price, fetched_at=r.fetched_at) for r in rows]


@router.post("/{product_id}/refresh")
async def refresh_price(product_id: int):
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        if not product.market_price_url:
            raise HTTPException(status_code=400, detail="This product has no market_price_url configured.")

    try:
        price = await refresh_now(product_id)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error))

    return {"price": price}
