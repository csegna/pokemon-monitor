// A thin fetch wrapper around the FastAPI backend built in backend/.
// Every function here corresponds to one endpoint documented in
// backend/README.md. Kept framework-free (no axios) since fetch is enough
// for a handful of small JSON endpoints.

import type {
  CheckoutSession,
  MarketPricePoint,
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  RestockEvent,
  Settings,
  SettingsUpdateInput,
  Suggestion,
  WeeklyRestockCount,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.detail ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getStatus: () => request<Product[]>("/api/status"),

  listProducts: () => request<Product[]>("/api/products"),
  createProduct: (input: ProductCreateInput) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(input) }),
  updateProduct: (id: number, input: ProductUpdateInput) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteProduct: (id: number) => request<void>(`/api/products/${id}`, { method: "DELETE" }),

  listRestocks: (params?: { limit?: number; store?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.store) search.set("store", params.store);
    const query = search.toString();
    return request<RestockEvent[]>(`/api/history/restocks${query ? `?${query}` : ""}`);
  },
  weeklyRestockCounts: (weeks = 11) =>
    request<WeeklyRestockCount[]>(`/api/history/weekly?weeks=${weeks}`),

  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (input: SettingsUpdateInput) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(input) }),

  testWebhook: () => request<{ sent: boolean }>("/api/webhook/test", { method: "POST" }),

  getMarketHistory: (productId: number, weeks = 26) =>
    request<MarketPricePoint[]>(`/api/market/${productId}/history?weeks=${weeks}`),
  refreshMarketPrice: (productId: number) =>
    request<{ price: number }>(`/api/market/${productId}/refresh`, { method: "POST" }),

  listCheckoutSessions: () => request<CheckoutSession[]>("/api/checkout/sessions"),
  closeCheckoutSession: (sessionId: number) =>
    request<{ closed: boolean }>(`/api/checkout/sessions/${sessionId}/close`, { method: "POST" }),

  getSuggestions: (params?: { limit?: number; refresh?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.refresh) search.set("refresh", "true");
    const query = search.toString();
    return request<Suggestion[]>(`/api/suggestions${query ? `?${query}` : ""}`);
  },
  dismissSuggestion: (tcgplayerProductId: string) =>
    request<{ dismissed: boolean }>(`/api/suggestions/${tcgplayerProductId}/dismiss`, { method: "POST" }),
};

export { ApiError };
