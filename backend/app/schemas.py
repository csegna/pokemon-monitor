"""
schemas.py
----------
Request/response shapes for the API. Kept separate from models.py so the
database layout (models.py) is free to have internal-only fields
(consecutive_failures, notify_error, ...) without them leaking into every
API response.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SuggestionRead(BaseModel):
    tcgplayer_product_id: str
    name: str
    set_name: str
    market_price: float
    tcgplayer_url: str
    retailer_links: dict[str, str]


class ProductCreate(BaseModel):
    name: str
    url: str
    store: str
    retail_price: Optional[float] = None
    market_price_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    store: Optional[str] = None
    is_active: Optional[bool] = None
    notify_enabled: Optional[bool] = None
    retail_price: Optional[float] = None
    market_price_url: Optional[str] = None
    auto_checkout_enabled: Optional[bool] = None
    image_url: Optional[str] = None


class ProductRead(BaseModel):
    id: int
    name: str
    url: str
    store: str
    retail_price: Optional[float]
    is_active: bool
    notify_enabled: bool
    last_status: str
    last_checked_at: Optional[datetime]
    market_price_url: Optional[str]
    latest_market_price: Optional[float]
    latest_market_checked_at: Optional[datetime]
    auto_checkout_enabled: bool
    image_url: Optional[str]


class MarketPriceRead(BaseModel):
    price: float
    fetched_at: datetime


def product_to_read(product) -> "ProductRead":
    """Shared by every router that returns a Product, so the response
    shape only needs updating in one place as fields get added."""
    return ProductRead(
        id=product.id,
        name=product.name,
        url=product.url,
        store=product.store,
        retail_price=product.retail_price,
        is_active=product.is_active,
        notify_enabled=product.notify_enabled,
        last_status=product.last_status,
        last_checked_at=product.last_checked_at,
        market_price_url=product.market_price_url,
        latest_market_price=product.latest_market_price,
        latest_market_checked_at=product.latest_market_checked_at,
        auto_checkout_enabled=product.auto_checkout_enabled,
        image_url=product.image_url,
    )


class CheckoutLogRead(BaseModel):
    ts: datetime
    level: str
    message: str


class CheckoutSessionRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    store: str
    state: str
    opened_at: datetime
    closed_at: Optional[datetime]
    logs: list[CheckoutLogRead] = []


class RestockEventRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    store: str
    previous_status: str
    detected_at: datetime
    notified_at: Optional[datetime]


class WeeklyRestockCount(BaseModel):
    week_start: str
    count: int


class SettingsRead(BaseModel):
    check_interval_seconds: int
    discord_webhook_url: Optional[str]
    in_stock_phrases: list[str]
    out_of_stock_phrases: list[str]
    quiet_hours_start: Optional[int]
    quiet_hours_end: Optional[int]
    market_check_interval_hours: int
    market_price_label: str
    checkout_headless: bool
    checkout_session_timeout_minutes: int


class SettingsUpdate(BaseModel):
    check_interval_seconds: Optional[int] = Field(default=None, ge=15, le=600)
    discord_webhook_url: Optional[str] = None
    in_stock_phrases: Optional[list[str]] = None
    out_of_stock_phrases: Optional[list[str]] = None
    quiet_hours_start: Optional[int] = Field(default=None, ge=0, le=23)
    quiet_hours_end: Optional[int] = Field(default=None, ge=0, le=23)
    market_check_interval_hours: Optional[int] = Field(default=None, ge=1, le=168)
    market_price_label: Optional[str] = None
    checkout_headless: Optional[bool] = None
    checkout_session_timeout_minutes: Optional[int] = Field(default=None, ge=1, le=180)
