"use client";

import { useState } from "react";

import { useCreateProduct } from "@/lib/hooks";
import { ApiError } from "@/lib/api";

export function AddProductForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createProduct = useCreateProduct();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    const store = String(form.get("store") ?? "").trim();
    const retailPriceRaw = String(form.get("retail_price") ?? "").trim();
    const marketPriceUrl = String(form.get("market_price_url") ?? "").trim();

    if (!name || !url || !store) {
      setError("Name, URL, and store are all required.");
      return;
    }

    createProduct.mutate(
      {
        name,
        url,
        store,
        retail_price: retailPriceRaw ? Number(retailPriceRaw) : null,
        market_price_url: marketPriceUrl || null,
      },
      {
        onSuccess: () => setIsOpen(false),
        onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add that product."),
      }
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 py-2 text-[13.5px] font-medium text-accent-ink"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Add product URL
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 md:flex-row md:flex-wrap md:items-end"
    >
      <div className="flex flex-1 min-w-[160px] flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor="name">
          Product name
        </label>
        <input id="name" name="name" required className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent" />
      </div>
      <div className="flex flex-1 min-w-[220px] flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor="url">
          Product page URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://www.target.com/p/..."
          className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div className="flex w-32 flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor="store">
          Store
        </label>
        <input id="store" name="store" required className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent" />
      </div>
      <div className="flex w-28 flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor="retail_price">
          Retail price
        </label>
        <input
          id="retail_price"
          name="retail_price"
          type="number"
          step="0.01"
          placeholder="49.99"
          className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div className="flex flex-1 min-w-[220px] flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor="market_price_url">
          Market price URL <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          id="market_price_url"
          name="market_price_url"
          type="url"
          placeholder="https://www.tcgplayer.com/product/..."
          className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createProduct.isPending}
          className="rounded-md border border-accent bg-accent px-4 py-2 text-[13.5px] font-medium text-accent-ink disabled:opacity-50"
        >
          {createProduct.isPending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md border border-border px-4 py-2 text-[13.5px] font-medium"
        >
          Cancel
        </button>
      </div>

      <p className="w-full text-[11.5px] text-text-muted">
        A link to this exact product on a secondary-market pricing site (e.g. TCGPlayer). Checked every few hours,
        completely separate from restock monitoring - shown for context, never used to trigger alerts.
      </p>

      {error && <p className="w-full text-[12.5px] text-critical">{error}</p>}
    </form>
  );
}
