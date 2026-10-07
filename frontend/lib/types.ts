// Mirrors backend/app/schemas.py. Kept as one file since the two sides
// aren't generated from a shared spec yet - if this API grows, generating
// these from the backend's OpenAPI schema (already served at /openapi.json)
// would be the next step instead of hand-syncing.

export type StockStatus = "in_stock" | "out_of_stock" | "unknown" | "error";

export interface Product {
  id: number;
  name: string;
  url: string;
  store: string;
  retail_price: number | null;
  is_active: boolean;
  notify_enabled: boolean;
  last_status: StockStatus;
  last_checked_at: string | null;
  market_price_url: string | null;
  latest_market_price: number | null;
  latest_market_checked_at: string | null;
  auto_checkout_enabled: boolean;
  image_url: string | null;
}

export interface ProductCreateInput {
  name: string;
  url: string;
  store: string;
  retail_price?: number | null;
  market_price_url?: string | null;
}

export interface ProductUpdateInput {
  name?: string;
  url?: string;
  store?: string;
  is_active?: boolean;
  notify_enabled?: boolean;
  retail_price?: number | null;
  market_price_url?: string | null;
  auto_checkout_enabled?: boolean;
  image_url?: string | null;
}

export interface MarketPricePoint {
  price: number;
  fetched_at: string;
}

export interface RestockEvent {
  id: number;
  product_id: number;
  product_name: string;
  store: string;
  previous_status: string;
  detected_at: string;
  notified_at: string | null;
}

export interface WeeklyRestockCount {
  week_start: string;
  count: number;
}

export interface Settings {
  check_interval_seconds: number;
  discord_webhook_url: string | null;
  in_stock_phrases: string[];
  out_of_stock_phrases: string[];
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  market_check_interval_hours: number;
  market_price_label: string;
  checkout_headless: boolean;
  checkout_session_timeout_minutes: number;
}

export type SettingsUpdateInput = Partial<Settings>;

export type CheckoutState =
  | "opening"
  | "cart_ready"
  | "add_to_cart_failed"
  | "needs_verification"
  | "skipped_capacity"
  | "closed"
  | "timed_out"
  | "error";

export interface CheckoutLog {
  ts: string;
  level: "info" | "ok" | "wait" | "human" | "error";
  message: string;
}

export interface CheckoutSession {
  id: number;
  product_id: number;
  product_name: string;
  store: string;
  state: CheckoutState;
  opened_at: string;
  closed_at: string | null;
  logs: CheckoutLog[];
}

export interface Suggestion {
  tcgplayer_product_id: string;
  name: string;
  set_name: string;
  market_price: number;
  tcgplayer_url: string;
  retailer_links: Record<string, string>;
}
