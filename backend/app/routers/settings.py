"""
settings.py
-----------
GET/PUT for the single global settings row - check interval, Discord
webhook, stock-detection phrases, and quiet hours. Replaces hand-editing
config.json.
"""

from fastapi import APIRouter

from app.db import get_session
from app.models import Settings
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create(session) -> Settings:
    settings = session.get(Settings, 1)
    if settings is None:
        settings = Settings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _to_read(settings: Settings) -> SettingsRead:
    return SettingsRead(
        check_interval_seconds=settings.check_interval_seconds,
        discord_webhook_url=settings.discord_webhook_url,
        in_stock_phrases=settings.in_stock_phrases,
        out_of_stock_phrases=settings.out_of_stock_phrases,
        quiet_hours_start=settings.quiet_hours_start,
        quiet_hours_end=settings.quiet_hours_end,
        market_check_interval_hours=settings.market_check_interval_hours,
        market_price_label=settings.market_price_label,
        checkout_headless=settings.checkout_headless,
        checkout_session_timeout_minutes=settings.checkout_session_timeout_minutes,
    )


@router.get("", response_model=SettingsRead)
def get_settings():
    with get_session() as session:
        return _to_read(_get_or_create(session))


@router.put("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate):
    with get_session() as session:
        settings = _get_or_create(session)
        updates = payload.model_dump(exclude_unset=True)

        if "in_stock_phrases" in updates:
            settings.in_stock_phrases = updates.pop("in_stock_phrases")
        if "out_of_stock_phrases" in updates:
            settings.out_of_stock_phrases = updates.pop("out_of_stock_phrases")
        for field, value in updates.items():
            setattr(settings, field, value)

        session.add(settings)
        session.commit()
        session.refresh(settings)
        return _to_read(settings)
