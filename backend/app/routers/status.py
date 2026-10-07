"""
status.py
---------
GET /api/status - the dashboard's main feed: every active product's
current status, straight from the denormalized fields on Product (kept
up to date by the monitor loop) rather than scanning stock_checks.
"""

from fastapi import APIRouter
from sqlmodel import select

from app.db import get_session
from app.models import Product
from app.schemas import ProductRead, product_to_read

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("", response_model=list[ProductRead])
def get_status():
    with get_session() as session:
        products = session.exec(
            select(Product).where(Product.is_active == True).order_by(Product.name)  # noqa: E712
        ).all()
        return [product_to_read(p) for p in products]
