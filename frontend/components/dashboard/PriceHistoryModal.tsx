"use client";

import { useEffect } from "react";

import { useMarketHistory, useRefreshMarketPrice } from "@/lib/hooks";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { Product } from "@/lib/types";

import { StatusPill } from "./StatusPill";
import { PriceHistoryChart } from "./PriceHistoryChart";

export function PriceHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: history, isLoading } = useMarketHistory(product.id);
  const refresh = useRefreshMarketPrice();

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

  const premium =
    product.latest_market_price != null && product.retail_price
      ? `${(product.latest_market_price / product.retail_price).toFixed(1)}×`
      : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" className="mt-10 flex w-full max-w-[560px] flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-text-muted">
              {product.store}
            </span>
            <StatusPill status={product.last_status} />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <h2 className="font-display text-[21px]">{product.name}</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 rounded-md border border-border p-2.5">
            <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Retail</span>
            <span className="tabular text-[19px] font-semibold">{formatCurrency(product.retail_price)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border p-2.5">
            <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Market price</span>
            <span className="tabular text-[19px] font-semibold text-accent">
              {formatCurrency(product.latest_market_price)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border p-2.5">
            <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Premium</span>
            <span className="tabular text-[19px] font-semibold">{premium}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[15.5px] font-semibold">Market price · last 26 weeks</div>
              <div className="text-[12.5px] text-text-secondary">
                Last checked {formatRelativeTime(product.latest_market_checked_at)}
              </div>
            </div>
            <button
              onClick={() => refresh.mutate(product.id)}
              disabled={refresh.isPending}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-50"
            >
              {refresh.isPending ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
          {isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {history && <PriceHistoryChart points={history} retailPrice={product.retail_price} />}
          {refresh.isError && <p className="mt-2 text-[12.5px] text-critical">Could not fetch a fresh price.</p>}
          <p className="mt-2 text-[11.5px] text-text-muted">
            Pulled on its own slower schedule, separate from the page checks that trigger restock alerts.
          </p>
        </div>

        <a
          href={product.market_price_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-[12.5px] text-text-secondary underline hover:text-text-primary"
        >
          View pricing source →
        </a>
      </div>
    </div>
  );
}
