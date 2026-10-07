"""
products.py
-----------
CRUD for the watch list. This replaces hand-editing products.json - adding
a product here also starts (and removing/deactivating one stops) its
monitor loop immediately.
"""

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.db import get_session
from app.models import Product
from app.market import start_product_market_loop, stop_product_market_loop
from app.monitor import start_product_monitor, stop_product_monitor
from app.schemas import ProductCreate, ProductRead, ProductUpdate, product_to_read as _to_read

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products():
    with get_session() as session:
        products = session.exec(select(Product).order_by(Product.created_at)).all()
        return [_to_read(p) for p in products]


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(payload: ProductCreate):
    with get_session() as session:
        product = Product(
            name=payload.name,
            url=payload.url,
            store=payload.store,
            retail_price=payload.retail_price,
            market_price_url=payload.market_price_url,
        )
        session.add(product)
        session.commit()
        session.refresh(product)

    start_product_monitor(product.id, product.url)
    start_product_market_loop(product.id, product.market_price_url)
    return _to_read(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: int, payload: ProductUpdate):
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")

        was_active = product.is_active
        updates = payload.model_dump(exclude_unset=True)
        market_url_changed = "market_price_url" in updates
        for field, value in updates.items():
            setattr(product, field, value)

        session.add(product)
        session.commit()
        session.refresh(product)

    if was_active and not product.is_active:
        stop_product_monitor(product.id)
        stop_product_market_loop(product.id)
    elif not was_active and product.is_active:
        start_product_monitor(product.id, product.url)
        start_product_market_loop(product.id, product.market_price_url)
    elif product.is_active and market_url_changed:
        # URL was added, changed, or cleared while the product stayed
        # active - restart so the loop picks it up now, not on its next
        # (possibly hours-away) cycle.
        stop_product_market_loop(product.id)
        start_product_market_loop(product.id, product.market_price_url)

    return _to_read(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int):
    with get_session() as session:
        product = session.get(Product, product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        session.delete(product)
        session.commit()

    stop_product_monitor(product_id)
    stop_product_market_loop(product_id)
