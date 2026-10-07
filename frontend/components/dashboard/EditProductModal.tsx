"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useUpdateProduct } from "@/lib/hooks";
import type { Product } from "@/lib/types";

export function EditProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const updateProduct = useUpdateProduct();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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

    updateProduct.mutate(
      {
        id: product.id,
        input: {
          name,
          url,
          store,
          retail_price: retailPriceRaw ? Number(retailPriceRaw) : null,
          market_price_url: marketPriceUrl || null,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save those changes."),
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mt-10 flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-[19px]">Edit product</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" htmlFor="edit-name">
              Product name
            </label>
            <input
              id="edit-name"
              name="name"
              required
              defaultValue={product.name}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" htmlFor="edit-url">
              Product page URL
            </label>
            <input
              id="edit-url"
              name="url"
              type="url"
              required
              defaultValue={product.url}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-semibold" htmlFor="edit-store">
                Store
              </label>
              <input
                id="edit-store"
                name="store"
                required
                defaultValue={product.store}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div className="flex w-32 flex-col gap-1">
              <label className="text-xs font-semibold" htmlFor="edit-retail-price">
                Retail price
              </label>
              <input
                id="edit-retail-price"
                name="retail_price"
                type="number"
                step="0.01"
                placeholder="49.99"
                defaultValue={product.retail_price ?? ""}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" htmlFor="edit-market-price-url">
              Market price URL <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              id="edit-market-price-url"
              name="market_price_url"
              type="url"
              placeholder="https://www.tcgplayer.com/product/..."
              defaultValue={product.market_price_url ?? ""}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-[12.5px] text-critical">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={updateProduct.isPending}
              className="flex-1 rounded-md border border-accent bg-accent py-2 text-[13.5px] font-medium text-accent-ink disabled:opacity-50"
            >
              {updateProduct.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2 text-[13.5px] font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
