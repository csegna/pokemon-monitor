"""
notifier.py
-----------
Sends a Discord notification when a product goes from "out of stock" to
"in stock". Uses a Discord webhook, which is just a URL you can POST a
JSON message to - no bot login or token needed.

How to get a webhook URL:
1. In Discord, go to a server you manage -> Server Settings -> Integrations -> Webhooks.
2. Click "New Webhook", pick a channel, and copy the Webhook URL.
3. Paste that URL into config.json under "discord_webhook_url".
"""

import requests


def send_discord_alert(webhook_url: str, product_name: str, product_url: str) -> None:
    """Post a simple text message to a Discord webhook.

    If the webhook URL hasn't been configured yet, or the request fails,
    this prints a warning instead of crashing the whole tracker.
    """
    if not webhook_url or "REPLACE" in webhook_url:
        print("  [notifier] Skipping Discord alert - no webhook URL configured in config.json.")
        return

    message = {
        "content": f"IN STOCK: {product_name}\n{product_url}"
    }

    try:
        response = requests.post(webhook_url, json=message, timeout=10)
        response.raise_for_status()
        print(f"  [notifier] Discord alert sent for '{product_name}'.")
    except requests.RequestException as error:
        print(f"  [notifier] Failed to send Discord alert: {error}")
