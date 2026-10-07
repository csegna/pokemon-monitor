# CorSe Drop Monitor frontend (all phases)

The real dashboard UI, wired to the FastAPI backend in `../backend/` -
this replaces the fake data in the concept mockup artifact with live
`fetch` calls, and the mockup's decorative-only buttons with ones that
actually do something.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + TanStack
Query. No `tailwind.config.ts` - v4 configures itself from the `@theme`
block in `app/globals.css`, which is also where every design token
(palette, fonts) from the concept mockup lives now.

## Setup

The backend must be running first (see `../backend/README.md`):

```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
```

Then, in a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at http://localhost:8000 by default
npm run dev
```

Open **http://localhost:3000** - it redirects to `/dashboard`.

## What's real vs. what's still a stub

| Page | Status |
|---|---|
| **Dashboard** | Live. Polls `/api/status` every 10s. "Add product URL," "Edit," and "Remove" all actually call the API - Edit opens a modal pre-filled with the product's current values (name/URL/store/retail price/market price URL), so a mistake doesn't mean deleting and re-adding. |
| **Alerts** | Live. Reads/writes `/api/settings`, "Send test alert" really posts to Discord, per-product notify toggles save immediately. |
| **History** | Live. Weekly bar chart and restock timeline both read real data from `/api/history/*`. |
| **Auto-checkout** | Live. An "Armed products" list toggles `auto_checkout_enabled` per product; the session list and log panel poll real `/api/checkout/sessions` data; "Close session" really closes the browser. |

**Market price** is real too: products created with a `market_price_url`
show a Retail/Market row and a premium chip on their card; clicking the
card opens a modal with the actual price-history chart (real data from
`/api/market/{id}/history`, not the mockup's seeded random walk) plus a
"Refresh now" button. Products without a `market_price_url` just show
retail price, same as before - no fabricated numbers.

Still dropped, on purpose: the "restocks today" avg-detection-time and
tracked-value ticker stats - that data still doesn't exist server-side.

**Suggestions** (the "Suggestions" button on the Dashboard) shows
TCGplayer's real best-selling sealed Pokémon product, booster boxes
filtered out, with market price pulled in automatically. Adding one is
deliberately a two-step confirm: click a retailer chip to open a real
search in a new tab, find the product yourself, paste its URL back in.
Nothing here is auto-matched or auto-added - see the backend README for
why (short version: tested retailer search matching for real, it wasn't
reliable enough to trust silently).

## Project layout

```
app/
  layout.tsx        root shell: QueryProvider + AppShell (Rail/Topbar/MobileNav)
  page.tsx           redirects "/" -> "/dashboard"
  dashboard/page.tsx, alerts/page.tsx, history/page.tsx, checkout/page.tsx
components/
  layout/            Rail, Topbar, MobileNav, ThemeToggle, nav-items, icons
  dashboard/          ProductCard, StatusPill, AddProductForm, EditProductModal,
                      PriceHistoryModal, PriceHistoryChart,
                      SuggestionsPanel, SuggestionCard
  alerts/             PhraseTagInput
  history/            WeeklyBarChart, RestockTimeline
  checkout/           SessionList, SessionLogPanel, CheckoutStateBadge
  providers/          QueryProvider (TanStack Query client)
lib/
  api.ts             fetch wrapper - one function per backend endpoint
  types.ts           TypeScript mirror of backend/app/schemas.py
  hooks.ts           useQuery/useMutation hooks built on lib/api.ts
  format.ts          date/currency formatting - see the note below
```

## The one gotcha worth knowing about

The backend serializes datetimes **without a timezone suffix** (SQLite
drops tzinfo on round-trip - see `backend/app/routers/history.py`'s
`as_utc()` for the server-side half of this). A bare `new Date(iso)` on a
suffix-less string makes JavaScript assume *local* time, not UTC, which
silently shifts every timestamp by your browser's UTC offset. Every date
this app parses goes through `lib/format.ts`'s `parseApiDate()`, which
appends `Z` before parsing rather than trusting the string as-is - don't
bypass it with a raw `new Date(...)` on API data.

## Known limitations

- No auth - same as the backend right now, fine for local dev only.
- No websocket/SSE layer - the dashboard polls every 10s, checkout
  sessions every 3s, instead of updating instantly. Real-time push would
  be the natural next upgrade, especially for the checkout log.
- Verified end-to-end via `npm run build` (clean, zero type errors) and
  by driving the live API with curl while the dev server ran - not yet
  clicked through in an actual browser. Worth a manual pass before
  trusting the interactive bits (theme toggle, form validation, toggles).
- The auto-checkout UI was proven against a local test fixture (see the
  backend README), not a real retailer page. The mechanism works; how
  well it matches any *specific* retailer's real markup is untested.
