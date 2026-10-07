"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import { useCreateProduct, useDismissSuggestion } from "@/lib/hooks";
import { formatCurrency } from "@/lib/format";
import type { Suggestion } from "@/lib/types";

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const [isAdding, setIsAdding] = useState(false);
  const [store, setStore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProduct = useCreateProduct();
  const dismissSuggestion = useDismissSuggestion();

  function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const url = String(form.get("url") ?? "").trim();
    const retailPriceRaw = String(form.get("retail_price") ?? "").trim();
    const storeValue = store.trim();

    if (!url || !storeValue) {
      setError("Paste the product URL and pick (or type) which store it's from.");
      return;
    }

    createProduct.mutate(
      {
        name: suggestion.name,
        url,
        store: storeValue,
        retail_price: retailPriceRaw ? Number(retailPriceRaw) : null,
        market_price_url: suggestion.tcgplayer_url,
      },
      {
        onSuccess: () => dismissSuggestion.mutate(suggestion.tcgplayer_product_id),
        onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add that product."),
      }
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-text-muted">{suggestion.set_name}</span>
          <span className="text-[14.5px] font-semibold leading-tight">{suggestion.name}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Market</span>
          <span className="tabular text-[15px] font-semibold text-accent">
            {formatCurrency(suggestion.market_price)}
          </span>
        </div>
      </div>

      {!isAdding ? (
        <div className="flex gap-2">
          <button
            onClick={() => dismissSuggestion.mutate(suggestion.tcgplayer_product_id)}
            disabled={dismissSuggestion.isPending}
            className="flex-1 rounded-md border border-border py-1.5 text-[12.5px] font-medium text-text-secondary hover:border-critical hover:text-critical disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 rounded-md border border-accent bg-accent py-1.5 text-[12.5px] font-medium text-accent-ink"
          >
            Add this product
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-2.5 border-t border-border pt-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-semibold">
              1. Find it at a retailer <span className="font-normal text-text-muted">(opens in a new tab)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(suggestion.retailer_links).map(([retailer, link]) => (
                <a
                  key={retailer}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setStore(retailer)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                    store === retailer
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-border text-text-secondary hover:border-accent hover:text-text-primary"
                  }`}
                >
                  {retailer}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold" htmlFor={`store-${suggestion.tcgplayer_product_id}`}>
              Store
            </label>
            <input
              id={`store-${suggestion.tcgplayer_product_id}`}
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Click a retailer above, or type one"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold" htmlFor={`url-${suggestion.tcgplayer_product_id}`}>
              2. Paste the product page URL you found
            </label>
            <input
              id={`url-${suggestion.tcgplayer_product_id}`}
              name="url"
              type="url"
              required
              placeholder="https://www.target.com/p/..."
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold" htmlFor={`price-${suggestion.tcgplayer_product_id}`}>
              Retail price <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              id={`price-${suggestion.tcgplayer_product_id}`}
              name="retail_price"
              type="number"
              step="0.01"
              placeholder="49.99"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-[12px] text-critical">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createProduct.isPending}
              className="flex-1 rounded-md border border-accent bg-accent py-1.5 text-[12.5px] font-medium text-accent-ink disabled:opacity-50"
            >
              {createProduct.isPending ? "Adding…" : "Add to CorSe"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 rounded-md border border-border py-1.5 text-[12.5px] font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
