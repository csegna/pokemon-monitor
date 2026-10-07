"""
models.py
---------
The database tables, defined as SQLModel classes. Each class doubles as
the Python object you work with in code and the schema for its SQLite
table.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Product(SQLModel, table=True):
    """A product page CorSe is watching for a restock."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    url: str
    store: str

    retail_price: Optional[float] = None
    is_active: bool = True
    notify_enabled: bool = True

    # Denormalized "current state" so the dashboard can be served with a
    # single query instead of scanning stock_checks every time.
    last_status: str = "unknown"
    last_checked_at: Optional[datetime] = None

    # Auto-extracted from the page's og:image meta tag during a stock
    # check (see monitor.py's _extract_image_url). Can also be set by
    # hand via PATCH if a product's page doesn't have one, or has the
    # wrong one.
    image_url: Optional[str] = None

    # Consecutive failed checks (timeouts, HTTP errors). The monitor loop
    # uses this to back off a misbehaving product instead of hammering it.
    consecutive_failures: int = 0

    # Optional: a public secondary-market pricing page for this exact
    # product (e.g. a TCGPlayer product URL). Market price tracking is
    # opt-in per product - leave this unset and it's simply never checked.
    market_price_url: Optional[str] = None
    latest_market_price: Optional[float] = None
    latest_market_checked_at: Optional[datetime] = None
    market_consecutive_failures: int = 0

    # If true, a restock triggers checkout.py: open a browser, load the
    # page, click "Add to Cart," then hand off to you. Off by default -
    # this is an opt-in per product, not a global switch.
    auto_checkout_enabled: bool = False

    created_at: datetime = Field(default_factory=utcnow)


class StockCheck(SQLModel, table=True):
    """One row per page check. Feeds the dashboard sparklines."""

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    status: str
    checked_at: datetime = Field(default_factory=utcnow, index=True)


class RestockEvent(SQLModel, table=True):
    """Recorded every time a product flips into stock. Powers the History view."""

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    previous_status: str
    detected_at: datetime = Field(default_factory=utcnow, index=True)
    notified_at: Optional[datetime] = None
    notify_error: Optional[str] = None


class MarketPrice(SQLModel, table=True):
    """
    One row per successful market-price fetch. Fully decoupled from
    stock_checks - this is read on its own, much slower cadence, and
    never feeds restock detection. Powers the price-history chart.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    price: float
    fetched_at: datetime = Field(default_factory=utcnow, index=True)


class CheckoutSession(SQLModel, table=True):
    """
    One row per automated checkout attempt (one per restock of an
    auto-checkout-armed product, not one per product overall). The state
    machine is intentionally short: this only ever automates the public,
    no-login-required steps and then hands off.

    States: opening -> cart_ready | add_to_cart_failed | needs_verification
            (any of those) -> closed | timed_out
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    state: str = "opening"
    opened_at: datetime = Field(default_factory=utcnow, index=True)
    closed_at: Optional[datetime] = None


class CheckoutLog(SQLModel, table=True):
    """One line of the human-readable activity log for a CheckoutSession."""

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="checkoutsession.id", index=True)
    ts: datetime = Field(default_factory=utcnow, index=True)
    level: str = "info"  # info, ok, wait, human, error
    message: str


class DismissedSuggestion(SQLModel, table=True):
    """A best-seller suggestion the user said no to - excluded from future
    /api/suggestions responses so dismissing something is permanent."""

    id: Optional[int] = Field(default=None, primary_key=True)
    tcgplayer_product_id: str = Field(index=True, unique=True)
    dismissed_at: datetime = Field(default_factory=utcnow)


class Settings(SQLModel, table=True):
    """
    Single-row table (id is always 1) holding the global monitoring and
    alert settings. A dedicated table instead of a JSON file so the API
    and the frontend can read/update it like any other resource.
    """

    id: Optional[int] = Field(default=1, primary_key=True)

    check_interval_seconds: int = 45

    discord_webhook_url: Optional[str] = None

    # Stored as JSON text since SQLite has no native array/list column.
    in_stock_phrases_json: str = json.dumps(
        ["add to cart", "add to bag", "add to basket", "buy now"]
    )
    out_of_stock_phrases_json: str = json.dumps(
        ["out of stock", "sold out", "unavailable", "notify me"]
    )

    # Quiet hours as local hour-of-day integers (0-23). Both null means
    # quiet hours are disabled. Wraps past midnight if start > end.
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None

    # Market price tracking: fully independent cadence from stock checks,
    # since it's read for context, not to trigger anything time-sensitive.
    market_check_interval_hours: int = 8
    # The label a pricing page shows next to the number we want (TCGPlayer
    # renders "Market Price  $85.24" as its own text node pair). Change
    # this if you point market_price_url at a site that labels it
    # differently.
    market_price_label: str = "Market Price"

    # Auto-checkout: keep this visible so a real browser window opens on
    # your own screen and you can pick up where the automation leaves off.
    # Only makes sense when the backend runs on the machine you're sitting
    # at, which is the assumption for this whole project.
    checkout_headless: bool = False
    checkout_session_timeout_minutes: int = 20

    @property
    def in_stock_phrases(self) -> list[str]:
        return json.loads(self.in_stock_phrases_json)

    @in_stock_phrases.setter
    def in_stock_phrases(self, phrases: list[str]) -> None:
        self.in_stock_phrases_json = json.dumps(phrases)

    @property
    def out_of_stock_phrases(self) -> list[str]:
        return json.loads(self.out_of_stock_phrases_json)

    @out_of_stock_phrases.setter
    def out_of_stock_phrases(self, phrases: list[str]) -> None:
        self.out_of_stock_phrases_json = json.dumps(phrases)
