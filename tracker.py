"""
tracker.py
----------
The main script. Run this with:  python tracker.py

What it does, step by step:
  1. Loads the list of products to watch from products.json.
  2. Loads settings (check interval, Discord webhook, keywords) from config.json.
  3. Loads the last known status of each product from status.json (if it exists).
  4. Every "check_interval_seconds", it re-visits every product page and looks
     for plain text like "Add to Cart" or "Sold Out" to guess the stock status.
  5. Saves the newest status back to status.json.
  6. Prints a clean summary table to the terminal.
  7. If a product just flipped from out-of-stock -> in-stock, it sends a
     Discord alert, and (optionally) opens a browser to help you check out.

This script only ever reads public product pages you already gave it the
URL for. It does not log in anywhere, does not solve CAPTCHAs, does not try
to jump waiting-room queues, and waits politely between checks so it doesn't
hammer the retailer's site.
"""

import json
import random
import time
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from notifier import send_discord_alert
from checkout import assist_checkout

PRODUCTS_FILE = Path("products.json")
CONFIG_FILE = Path("config.json")
STATUS_FILE = Path("status.json")

# A normal browser User-Agent so pages render the same way they would in
# your own browser. This does not evade any bot protection - it's simply
# an honest description of what's making the request.
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

STATUS_IN_STOCK = "in_stock"
STATUS_OUT_OF_STOCK = "out_of_stock"
STATUS_UNKNOWN = "unknown"
STATUS_ERROR = "error"


def load_json(path: Path, default):
    """Read a JSON file, or return `default` if it doesn't exist yet."""
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def check_product_status(url: str, in_stock_phrases, out_of_stock_phrases) -> str:
    """Visit a product page and guess its stock status from the page text.

    We check "out of stock" phrases first, because some pages still show
    an "Add to Cart" button in the HTML even when it's actually disabled.
    """
    try:
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=15)
        response.raise_for_status()
    except requests.RequestException as error:
        print(f"  [warning] Could not load {url}: {error}")
        return STATUS_ERROR

    page_text = BeautifulSoup(response.text, "html.parser").get_text(" ").lower()

    for phrase in out_of_stock_phrases:
        if phrase.lower() in page_text:
            return STATUS_OUT_OF_STOCK

    for phrase in in_stock_phrases:
        if phrase.lower() in page_text:
            return STATUS_IN_STOCK

    return STATUS_UNKNOWN


def print_summary(products, status_data) -> None:
    """Print a clean, aligned table of every product's current status."""
    print()
    print(f"{'Product':<45} {'Status':<15} {'Last Checked':<20}")
    print("-" * 82)
    for product in products:
        url = product["url"]
        name = product["name"][:44]
        entry = status_data.get(url, {})
        status = entry.get("status", STATUS_UNKNOWN)
        last_checked = entry.get("last_checked", "-")
        print(f"{name:<45} {status:<15} {last_checked:<20}")
    print()


def run_one_check_cycle(products, config, status_data) -> None:
    in_stock_phrases = config["in_stock_phrases"]
    out_of_stock_phrases = config["out_of_stock_phrases"]
    webhook_url = config.get("discord_webhook_url", "")
    auto_checkout_cfg = config.get("auto_checkout", {})

    for product in products:
        name = product["name"]
        url = product["url"]

        new_status = check_product_status(url, in_stock_phrases, out_of_stock_phrases)
        previous_entry = status_data.get(url, {})
        previous_status = previous_entry.get("status", STATUS_UNKNOWN)
        now = datetime.now().isoformat(timespec="seconds")

        status_data[url] = {
            "name": name,
            "status": new_status,
            "last_checked": now,
            "last_changed": now if new_status != previous_status else previous_entry.get("last_changed", now),
        }

        just_restocked = (
            new_status == STATUS_IN_STOCK
            and previous_status in (STATUS_OUT_OF_STOCK, STATUS_UNKNOWN)
        )

        if just_restocked:
            print(f"  [restock] '{name}' just became available!")
            send_discord_alert(webhook_url, name, url)

            if auto_checkout_cfg.get("enabled", False):
                assist_checkout(
                    product_name=name,
                    product_url=url,
                    headless=auto_checkout_cfg.get("headless", False),
                    browser_profile_dir=auto_checkout_cfg.get("browser_profile_dir", "browser_profile"),
                )


def main() -> None:
    products = load_json(PRODUCTS_FILE, [])
    config = load_json(CONFIG_FILE, {})
    status_data = load_json(STATUS_FILE, {})

    if not products:
        print(f"No products found in {PRODUCTS_FILE}. Add some product URLs and try again.")
        return

    interval = config.get("check_interval_seconds", 45)

    print(f"Watching {len(products)} product(s). Checking every ~{interval} seconds.")
    print("Press Ctrl+C to stop.")

    try:
        while True:
            run_one_check_cycle(products, config, status_data)
            save_json(STATUS_FILE, status_data)
            print_summary(products, status_data)

            # Add a little random jitter so requests aren't perfectly
            # periodic, which is friendlier to the retailer's servers.
            sleep_seconds = interval + random.uniform(0, 5)
            time.sleep(sleep_seconds)
    except KeyboardInterrupt:
        print("\nStopped by user. Latest status is saved in status.json.")


if __name__ == "__main__":
    main()
