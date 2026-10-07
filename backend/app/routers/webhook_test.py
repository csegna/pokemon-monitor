"""
webhook_test.py
---------------
POST /api/webhook/test - sends a canned Discord message using the
currently saved webhook URL, so you can confirm it works before relying
on it to tell you about a restock.
"""

from fastapi import APIRouter, HTTPException

from app.db import get_session
from app.models import Settings
from app.notifier import send_discord_alert

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/test")
async def test_webhook():
    with get_session() as session:
        settings = session.get(Settings, 1)
        webhook_url = settings.discord_webhook_url if settings else None

    if not webhook_url:
        raise HTTPException(status_code=400, detail="No Discord webhook URL saved in settings yet.")

    success, error = await send_discord_alert(
        webhook_url,
        product_name="CorSe test alert",
        product_url="This is a test - your Discord alerts are wired up correctly.",
    )
    if not success:
        raise HTTPException(status_code=502, detail=f"Discord rejected the test message: {error}")

    return {"sent": True}
