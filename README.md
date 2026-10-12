# Pokemon Retail Drop Tracker

A beginner-friendly Python tool that watches public Pokemon product pages
(Target, Best Buy, Walmart, etc.) and tells you the moment one comes back
in stock - with an optional helper to speed up the boring part of checkout.

Pokémon Monitor is a personal project currently running in a local development environment. The application includes a working interface and product monitoring functionality, although some monitoring features are still being refined for accuracy and reliability. I’m continuing to troubleshoot errors and improve the application’s performance.

## What this tool does

- Reads a list of product page URLs from `products.json`.
- Visits each page every so often and looks for plain text like
  "Add to Cart", "Out of Stock", "Sold Out", or "Unavailable".
- Saves the latest status for every product to `status.json`.
- Prints a clean summary table to your terminal after every check.
- Sends a Discord notification the moment a product flips from
  out-of-stock to in-stock.
- (Optional) Opens a browser and clicks "Add to Cart" for you when a
  restock is detected.

## What this tool deliberately does NOT do

This tool is built to be a polite, honest shopper - not a bot that cheats:

- It does **not** bypass CAPTCHAs. If a retailer shows you one, you solve it.
- It does **not** bypass login walls. You log in yourself; the optional
  checkout helper just remembers your session like a normal browser would.
- It does **not** skip waiting-room / queue pages.
- It does **not** try to get around rate limits - it checks pages on a
  fixed, human-like delay (default: about every 45 seconds, with a little
  random jitter added).
- It only ever visits the exact product URLs you give it - it does not
  scrape a whole site or search for other products.

The optional "auto checkout" feature only automates the public,
no-authentication-required steps (loading the page, clicking "Add to
Cart"). It always stops and hands control back to you for logging in,
solving any CAPTCHA, entering payment info, and placing the order.

**Before using this on any site, check that retailer's Terms of Service.**
Some retailers prohibit automated monitoring or purchasing entirely - it's
on you to make sure you're allowed to do this.

## Files in this project

| File | Purpose |
|---|---|
| `tracker.py` | The main script you run. Loads products/config, checks each page on a loop, saves status, prints the summary, and triggers alerts/checkout. |
| `notifier.py` | Sends the Discord webhook message when a product restocks. |
| `checkout.py` | Opens a real browser window and clicks "Add to Cart" for you, then waits for you to finish the rest by hand. |
| `products.json` | The list of products you want to watch. Edit this to add/remove items. |
| `config.json` | Settings: how often to check, your Discord webhook URL, the keywords used to detect stock, and auto-checkout options. |
| `status.json` | Auto-generated. Stores the last known status of every product so the tool can tell when something *changed*. You don't need to edit this. |
| `requirements.txt` | The Python packages this project needs. |

## Setup

1. **Install Python 3.9+** if you don't already have it.

2. **Create a virtual environment (recommended)** and install dependencies:

   ```bash
   cd pokemon-drop-tracker
   python3 -m venv venv
   source venv/bin/activate        # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **(Optional) Install the browser for auto-checkout.** Only needed if you
   plan to turn on `auto_checkout` in `config.json`:

   ```bash
   playwright install chromium
   ```

## Configuring your products

Open `products.json` and list every product page you want watched:

```json
[
  {
    "name": "Pokemon Scarlet & Violet Booster Box",
    "url": "https://www.target.com/p/your-actual-product-link"
  },
  {
    "name": "Pokemon Elite Trainer Box",
    "url": "https://www.bestbuy.com/site/your-actual-product-link"
  }
]
```

- `name` is just a friendly label used in the terminal and Discord alerts.
- `url` must be a normal, public product page (no login required to view it).
- Add as many products as you like - just add more entries to the list.

## Setting up Discord alerts

1. In Discord, go to the server you want alerts in.
2. **Server Settings -> Integrations -> Webhooks -> New Webhook.**
3. Pick a channel, then click **Copy Webhook URL**.
4. Paste that URL into `config.json` under `"discord_webhook_url"`.

If you leave the default placeholder URL in place, the tracker will simply
skip sending Discord alerts (everything else still works).

## Configuring settings (`config.json`)

```json
{
  "check_interval_seconds": 45,
  "discord_webhook_url": "https://discord.com/api/webhooks/...",
  "in_stock_phrases": ["add to cart", "add to bag", "add to basket", "buy now"],
  "out_of_stock_phrases": ["out of stock", "sold out", "unavailable", "notify me"],
  "auto_checkout": {
    "enabled": false,
    "headless": false,
    "browser_profile_dir": "browser_profile"
  }
}
```

- `check_interval_seconds`: how long to wait between rounds of checks.
  Keep this at a reasonable value (30+ seconds) so you're not hammering
  the retailer's servers.
- `in_stock_phrases` / `out_of_stock_phrases`: the plain-text phrases the
  tool searches for on each page. Add more if a specific retailer uses
  different wording (e.g. "Ship It" or "Preorder").
- `auto_checkout.enabled`: set to `true` to have a browser window open
  automatically and attempt to click "Add to Cart" when a restock is
  detected. You still have to log in, solve any CAPTCHA, and pay yourself.
- `auto_checkout.headless`: keep this `false` so you can actually see and
  use the browser window when it opens.
- `auto_checkout.browser_profile_dir`: a folder where your browser login
  session is remembered between runs, so you don't have to log in every
  single time. It's created automatically the first time you use it.

## Running it

```bash
python tracker.py
```

You'll see output like:

```
Watching 2 product(s). Checking every ~45 seconds.
Press Ctrl+C to stop.

Product                                       Status          Last Checked
----------------------------------------------------------------------------------
Pokemon Scarlet & Violet Booster Box          out_of_stock    2026-07-08T17:05:12
Pokemon Elite Trainer Box                     in_stock        2026-07-08T17:05:13
```

Press `Ctrl+C` any time to stop. Your latest results stay saved in
`status.json`, so the next time you start the tracker it remembers where
things stood.

## Troubleshooting

- **Status always says "unknown"**: the retailer's page may load its stock
  info with JavaScript after the initial page load, so the plain HTML
  doesn't contain the text yet. Try adding more phrases to
  `in_stock_phrases` / `out_of_stock_phrases`, or check the page's HTML
  source to see the exact wording it uses.
- **Discord alert never arrives**: double check the webhook URL was pasted
  correctly into `config.json` and that the webhook's channel still exists.
- **Auto-checkout says Playwright isn't installed**: run
  `pip install -r requirements.txt` followed by `playwright install chromium`.
