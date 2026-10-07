# CorSe Drop Monitor backend (all phases)

The real backend behind the CorSe Drop Monitor dashboard concept: a FastAPI service with
a SQLite database, an async restock monitor, market price tracking, and
auto-checkout - replacing the standalone `tracker.py`/`checkout.py`
scripts (still at the repo root) with something the frontend can talk to
over HTTP.

Every phase from the implementation plan is now built: data storage, the
API, restock monitoring, Discord alerts, market price tracking, and
auto-checkout.

## What's running

- **One FastAPI process** serving the API, an async monitor task per
  watched product, and (for products that have one configured) an async
  market-price task on its own much slower cadence. Each loop runs
  independently, so one slow or broken check never delays any other.
- **SQLite** (`holo.db`, created automatically on first run) via SQLModel.
- **Restock detection**: renders the page with a real (shared, headless)
  browser and searches its visible text for your configured "in stock" /
  "out of stock" phrases. A real Target product page was checked while
  building this: the static HTML is a ~1KB JS shell containing generic
  "Add to Cart" button markup regardless of actual availability, and
  never the real "Out of stock" text (injected client-side) - a plain
  HTTP fetch would read every product as in-stock, always. Same boundary
  as always regardless: this only ever reads the exact product URLs you
  add, on a polite fixed interval - no CAPTCHA, login, queue, or
  rate-limit bypass anywhere in this codebase.
- **Market price tracking**: a *separate* per-product loop, checked every
  few hours (not seconds), that renders the product's pricing-source page
  with a real (headless) browser and reads off a labeled price - see
  "Why Playwright" below. It never feeds restock detection and never adds
  load to the pages being watched for restocks.
- **Auto-checkout**: when a product armed with `auto_checkout_enabled` is
  restocked, `checkout.py` opens a real browser, loads the page, and
  clicks an "Add to Cart"-equivalent button - then stops and leaves the
  browser open for you. It never fills in a login, payment, or CAPTCHA
  field, and it actively looks for verification challenges and stops
  before touching anything if it finds one. A global cap limits how many
  checkout sessions can be open at once; each store gets its own
  persistent browser profile so a login sticks around between restocks.
- **Product suggestions**: `suggestions.py` reads TCGPlayer's own "Best
  Selling" sort on its sealed Pokémon products page (rendered, cached for
  an hour) and filters out booster boxes. It never tries to auto-find the
  matching product on a retailer - see "Why suggestions only hand back
  search links" below.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium      # needed for market price tracking
cp .env.example .env             # adjust DATABASE_URL / CORS_ORIGINS if needed
uvicorn app.main:app --reload
```

Then open **http://localhost:8000/docs** for interactive API docs - the
fastest way to try every endpoint below without a frontend yet.

## API surface

| Method & path | Purpose |
|---|---|
| `GET /api/products` | list every watched product |
| `POST /api/products` | add a product `{name, url, store, retail_price}` - starts monitoring it immediately |
| `PATCH /api/products/{id}` | update a product; toggling `is_active` starts/stops its monitor loop |
| `DELETE /api/products/{id}` | remove a product and stop watching it |
| `GET /api/status` | current status of every active product (the dashboard feed) |
| `GET /api/history/restocks?limit=&store=` | recent restock events |
| `GET /api/history/weekly?weeks=` | restock counts per week, for the bar chart |
| `GET /api/settings` | current check interval, webhook URL, phrases, quiet hours |
| `PUT /api/settings` | update any of the above (partial updates supported) |
| `POST /api/webhook/test` | send a canned Discord message using the saved webhook URL |
| `GET /api/market/{id}/history?weeks=` | price history for the chart |
| `POST /api/market/{id}/refresh` | fetch a fresh price right now instead of waiting for the next cycle |
| `GET /api/checkout/sessions` | recent auto-checkout sessions, each with its full activity log |
| `GET /api/checkout/sessions/{id}` | one session's detail |
| `POST /api/checkout/sessions/{id}/close` | close an open session (or let it run to its timeout) |
| `GET /api/suggestions?limit=&refresh=` | best-selling sealed product not already tracked or dismissed |
| `POST /api/suggestions/{tcgplayer_product_id}/dismiss` | permanently hide a suggestion |
| `GET /api/health` | liveness check |

`POST/PATCH /api/products` also accept `market_price_url` (start tracking
secondary-market price) and `auto_checkout_enabled` (arm/disarm
auto-checkout). There is deliberately no "start a checkout" endpoint -
sessions are only ever created by a real, detected restock.

## Notable design choices (and why)

- **One monitor loop per product, not one shared loop.** Independent
  loops stagger requests naturally, isolate a hanging request to one
  product, and let a failing product back off on its own schedule
  (exponential, capped at 8x the base interval) without slowing down
  healthy ones.
- **A courtesy `robots.txt` check runs once per domain** when a product
  is added. It only logs a warning if a retailer's robots.txt disallows
  the path - it never blocks anything. You decide what to do with that
  information.
- **Settings live in the database now**, not `config.json` - `GET/PUT
  /api/settings` is the new source of truth. The root-level `config.json`
  and `products.json` belong to the original standalone script only.
- **Quiet hours suppress the Discord ping, never the monitoring itself
  or the in-app restock record** - you'll still see it in `/api/history`
  even if the notification waited until morning.
- **Why Playwright for market price but not for restock checks:** a real
  TCGPlayer product page was checked while building this - the initial
  HTML has no price in it at all, it's rendered client-side. Restock
  pages mostly aren't like that, so `monitor.py` stays on the cheaper
  plain-HTTP approach; `market.py` renders the page like a real browser
  would, which is still just reading a public page, not bypassing
  anything. One browser instance is shared across every product's checks
  rather than launching a new one per check.
- **The price-extraction logic is generic, not TCGPlayer-specific**: it
  searches the rendered page's text for a configurable label (`Settings.
  market_price_label`, default `"Market Price"`) followed by a dollar
  amount. Point `market_price_url` at a different pricing site and adjust
  the label if that site words it differently.
- **Why a semaphore holds for the whole session, not just the click**:
  the safety rule is a cap on concurrent open *browser windows*, not just
  automation-in-progress. A session keeps its concurrency slot from the
  moment its browser opens until it's closed (manually, or by timeout) -
  releasing it right after the click would let far more browser windows
  pile up than the cap intends.
- **`headless: false` is the real default on purpose.** This whole
  project assumes the backend runs on the same machine you're sitting
  at - the point of leaving the browser visible is that you can actually
  see and finish the checkout yourself. (Testing this feature during
  development used `headless: true` against a local test fixture, never
  a real retailer page, for exactly that reason - see the note below.)
- **Verification detection is deliberately simple and conservative**: it
  checks the rendered page's text and every frame's URL against a short
  list of patterns (CAPTCHA, "are you a human", queue/waiting-room
  wording, etc.) and stops the instant anything matches - before clicking
  anything if it's caught early enough. It does not try to be clever
  about telling a real challenge from a false positive; a false positive
  just means a session that stops slightly too early, which is the safe
  direction to fail in.
- **Why suggestions only hand back retailer search links, never a
  matched product URL**: tested live while building this. Searching
  Target's own site for a suggested product's exact name returned the
  right item first, but mixed with unrelated results (a different set's
  box, an accessory). Walmart and Pokémon Center both actively challenge
  headless browsers before a search even returns results ("Robot or
  human?" / "Pardon Our Interruption") - and deliberately were not probed
  any further than confirming that, since getting past that wasn't the
  point of the check. Auto-picking a "best guess" retailer URL under
  those conditions risks silently tracking (and potentially
  auto-checking-out on) the wrong product. A plain, unrendered search URL
  costs nothing to get wrong - you just search again yourself.

## Known limitations of this phase

- No auth yet - anyone who can reach this API can add products or change
  settings. Fine for local development; needs a login before this is
  exposed to anything but `localhost`.
- Deleting a product doesn't cascade-delete its `stock_checks` /
  `restock_events` rows. Harmless at this scale (they just become
  orphaned rows), worth revisiting if the database grows large.
- `stock_checks` grows one row per product per check forever - fine for
  now, but plan to prune or roll up old rows before this runs unattended
  for months.
- Market price extraction depends on a label appearing near a dollar
  amount in the rendered page's visible text - it'll silently find
  nothing (not crash) if a pricing site redesigns its page or uses a
  different label than configured.
- Auto-checkout was verified end-to-end against a local test fixture
  (a page I controlled, served on localhost) - not against any real
  retailer site. The add-to-cart button search (a short list of common
  labels) and the verification-pattern list are both generic best
  effort; a real retailer's exact markup or a verification system not on
  that list could behave differently. Try it cautiously and watch the
  first few runs yourself before trusting it unattended.
- If a product's stock status flaps (in stock, then out, then back in
  stock again quickly), each transition can trigger its own checkout
  session for the same product - there's no per-product "already have a
  session open" guard, only the global concurrency cap.
- Auto-checkout sessions and their logs aren't cascade-deleted when a
  product is removed, same as the other event tables.
- Suggestions are sourced entirely from TCGPlayer's best-seller ranking -
  a product missing from there (too new, too niche) just won't show up,
  no matter how much you might want it.
- The "booster box" filter is a plain case-insensitive substring match on
  the product title. It won't catch a box that TCGPlayer titles some
  other way, and it also excludes "Booster Box Case" (a case of boxes) -
  which is probably what you'd want anyway.
