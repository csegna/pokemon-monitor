"""
notifier.py
-----------
Sends the Discord restock alert. Same idea as the original standalone
script's notifier.py, adapted to run inside the async backend and to
retry once before giving up, since a single dropped webhook call
shouldn't mean you miss a restock.
"""

import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger("holo.notifier")


async def send_discord_alert(webhook_url: str, product_name: str, product_url: str) -> tuple[bool, Optional[str]]:
    """
    POST a restock message to a Discord webhook.

    Returns (success, error_message). Never raises - a failed notification
    should not take down the monitor loop.
    """
    if not webhook_url:
        return False, "no webhook URL configured"

    message = {"content": f"IN STOCK: {product_name}\n{product_url}"}

    last_error = None
    async with httpx.AsyncClient(timeout=10) as client:
        for attempt in range(2):
            try:
                response = await client.post(webhook_url, json=message)
                response.raise_for_status()
                return True, None
            except httpx.HTTPError as error:
                last_error = str(error)
                logger.warning("Discord alert attempt %d failed: %s", attempt + 1, error)
                if attempt == 0:
                    await asyncio.sleep(2)

    return False, last_error
