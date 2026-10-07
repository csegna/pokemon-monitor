"use client";

import { useState } from "react";

import { useDeleteProduct, useUpdateProduct } from "@/lib/hooks";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { Product } from "@/lib/types";

import { StatusPill } from "./StatusPill";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { EditProductModal } from "./EditProductModal";

export function ProductCard({ product }: { product: Product }) {
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const [showHistory, setShowHistory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const hasMarketPrice = Boolean(product.market_price_url);

  function handleRemove() {
    if (confirm(`Stop watching "${product.name}"?`)) {
      deleteProduct.mutate(product.id);
    }
  }

  function toggleAutoCheckout() {
    updateProduct.mutate({ id: product.id, input: { auto_checkout_enabled: !product.auto_checkout_enabled } });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
      {product.image_url && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- external, user-supplied retailer domains; next/image would need every domain allowlisted up front
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="-mx-4 -mt-4 aspect-[4/3] w-[calc(100%+2rem)] rounded-t-2xl border-b border-border bg-surface-2 object-contain"
        />
      )}

      <div className="flex items-start justify-between gap-2.5">
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-text-muted">
          {product.store}
        </span>
        <StatusPill status={product.last_status} />
      </div>

      <div className="font-display text-[16.5px] leading-tight">{product.name}</div>

      {hasMarketPrice ? (
        <button onClick={() => setShowHistory(true)} className="flex flex-col gap-2 text-left">
          <div className="flex items-end justify-between gap-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Retail</span>
              <span className="tabular text-[17px] font-semibold">{formatCurrency(product.retail_price)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Market</span>
              <span className="tabular text-[17px] font-semibold text-accent">
                {formatCurrency(product.latest_market_price)}
              </span>
            </div>
          </div>
          {product.latest_market_price != null && product.retail_price && (
            <div className="flex items-center justify-between gap-2.5">
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                {(product.latest_market_price / product.retail_price).toFixed(1)}× retail
              </span>
              <span className="font-mono text-[11.5px] text-text-muted">
                checked {formatRelativeTime(product.last_checked_at)}
              </span>
            </div>
          )}
        </button>
      ) : (
        <div className="flex items-end justify-between gap-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10.5px] uppercase tracking-wide text-text-muted">Retail</span>
            <span className="tabular text-[17px] font-semibold">{formatCurrency(product.retail_price)}</span>
          </div>
          <span className="font-mono text-[11.5px] text-text-muted">
            checked {formatRelativeTime(product.last_checked_at)}
          </span>
        </div>
      )}

      <button
        onClick={toggleAutoCheckout}
        disabled={updateProduct.isPending}
        className={`rounded-md border py-1.5 text-[13px] font-medium disabled:opacity-50 ${
          product.auto_checkout_enabled
            ? "border-accent bg-accent text-accent-ink"
            : "border-border text-text-secondary hover:border-accent hover:text-text-primary"
        }`}
      >
        {product.auto_checkout_enabled ? "Auto-checkout armed" : "Arm auto-checkout"}
      </button>

      <div className="flex gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="flex-1 rounded-md border border-border py-1.5 text-[13px] font-medium hover:border-accent"
        >
          Edit
        </button>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-md border border-border py-1.5 text-center text-[13px] font-medium hover:border-accent"
        >
          View page
        </a>
      </div>
      <button
        onClick={handleRemove}
        disabled={deleteProduct.isPending}
        className="rounded-md border border-border py-1.5 text-[13px] font-medium text-critical hover:border-critical disabled:opacity-50"
      >
        {deleteProduct.isPending ? "Removing…" : "Remove"}
      </button>

      {showHistory && <PriceHistoryModal product={product} onClose={() => setShowHistory(false)} />}
      {showEdit && <EditProductModal product={product} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
