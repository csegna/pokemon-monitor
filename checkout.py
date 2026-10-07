"""
checkout.py
-----------
A semi-automated "auto checkout" helper.

IMPORTANT - what this does and does NOT do:
  - It opens a real, visible browser window and loads the product page for you.
  - It tries to click an "Add to Cart" / "Add to Bag" style button, since that
    is just a normal, public action any shopper can take.
  - It then STOPS and hands control back to you. It never fills in login
    credentials, payment details, or CAPTCHA answers, and it never tries to
    skip a waiting-room/queue page or hammer the site with requests.
  - You stay in the driver's seat for anything that proves you're a human
    (logging in, solving a CAPTCHA, entering your card, clicking "Place Order").

This uses Playwright with a persistent browser profile, so if you log in to
the retailer once manually, your session/cookies are remembered for next time
(just like a normal browser).
"""

from pathlib import Path


def assist_checkout(product_name: str, product_url: str, headless: bool = False,
                     browser_profile_dir: str = "browser_profile") -> None:
    """Open a browser, load the product page, and try to add it to the cart.

    After that, this function waits for you (the human) to finish logging in,
    solving any CAPTCHA, and completing payment yourself.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("  [checkout] Playwright isn't installed. Run:")
        print("             pip install -r requirements.txt")
        print("             playwright install chromium")
        return

    profile_path = Path(browser_profile_dir).resolve()
    profile_path.mkdir(parents=True, exist_ok=True)

    print(f"  [checkout] Opening a browser for '{product_name}'...")

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(profile_path),
            headless=headless,
        )
        page = context.new_page()

        try:
            page.goto(product_url, timeout=30000)
        except Exception as error:
            print(f"  [checkout] Could not load the product page: {error}")
            context.close()
            return

        # Try a handful of common "add to cart" button labels. Sites word
        # this differently, so we just try each one and move on if it's
        # not found within a couple of seconds.
        button_labels = ["Add to Cart", "Add to Bag", "Add to Basket", "Buy Now"]
        clicked = False
        for label in button_labels:
            try:
                page.get_by_role("button", name=label, exact=False).click(timeout=3000)
                clicked = True
                print(f"  [checkout] Clicked a '{label}' button.")
                break
            except Exception:
                continue

        if not clicked:
            print("  [checkout] Couldn't find an add-to-cart button automatically.")
            print("             Please add the item to your cart manually in the browser window.")

        print()
        print("  ------------------------------------------------------------------")
        print("  The rest is up to you: log in, solve any CAPTCHA, review your cart,")
        print("  enter payment details, and place the order in the browser window.")
        print("  This script will NOT do any of that for you.")
        print("  ------------------------------------------------------------------")
        input("  Press Enter here once you're done (this keeps the browser open until then)... ")

        context.close()
