"use client";

import { useState } from "react";

import { AddProductForm } from "@/components/dashboard/AddProductForm";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { SuggestionsPanel } from "@/components/dashboard/SuggestionsPanel";
import { useStatus } from "@/lib/hooks";

export default function DashboardPage() {
  const { data: products, isLoading, isError } = useStatus();
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[26px]">Dashboard</h1>
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] text-text-secondary">
            Every product page CorSe is watching right now, rechecked on a polite, fixed interval.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuggestions(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-[13.5px] font-medium hover:border-accent"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M9 2.5c.5 2.5 1.3 3.3 3.8 3.8-2.5.5-3.3 1.3-3.8 3.8-.5-2.5-1.3-3.3-3.8-3.8 2.5-.5 3.3-1.3 3.8-3.8Z" />
              <path d="M15 10.5c.35 1.7.9 2.25 2.6 2.6-1.7.35-2.25.9-2.6 2.6-.35-1.7-.9-2.25-2.6-2.6 1.7-.35 2.25-.9 2.6-2.6Z" />
            </svg>
            Suggestions
          </button>
          <AddProductForm />
        </div>
      </div>

      {isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
      {isError && (
        <p className="text-sm text-critical">
          Couldn&apos;t reach the CorSe backend. Is it running at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}?
        </p>
      )}

      {products && products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">
          Nothing being watched yet. Add a product URL above to start monitoring it.
        </div>
      )}

      {products && products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {showSuggestions && <SuggestionsPanel onClose={() => setShowSuggestions(false)} />}
    </div>
  );
}
