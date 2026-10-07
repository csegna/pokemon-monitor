"use client";

import { useMemo, useState } from "react";

import { RestockTimeline } from "@/components/history/RestockTimeline";
import { WeeklyBarChart } from "@/components/history/WeeklyBarChart";
import { useProducts, useRestocks, useWeeklyCounts } from "@/lib/hooks";

export default function HistoryPage() {
  const [store, setStore] = useState<string | undefined>(undefined);
  const { data: weeklyCounts, isLoading: weeklyLoading } = useWeeklyCounts(11);
  const { data: restocks, isLoading: restocksLoading } = useRestocks(store);
  const { data: products } = useProducts();

  const stores = useMemo(() => {
    const unique = new Set((products ?? []).map((p) => p.store));
    return Array.from(unique).sort();
  }, [products]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px]">Restock history</h1>
        <p className="mt-1.5 max-w-[60ch] text-[13.5px] text-text-secondary">
          A record of every confirmed restock CorSe has caught, across every store you track.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3.5">
          <div className="text-[15.5px] font-semibold">Restocks per week</div>
          <div className="text-[12.5px] text-text-secondary">Last 11 weeks · current week in full color</div>
        </div>
        {weeklyLoading && <p className="text-sm text-text-secondary">Loading…</p>}
        {weeklyCounts && <WeeklyBarChart weeks={weeklyCounts} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStore(undefined)}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${
            !store ? "border-text-muted bg-surface-2 font-semibold" : "border-border bg-surface text-text-secondary"
          }`}
        >
          All stores
        </button>
        {stores.map((s) => (
          <button
            key={s}
            onClick={() => setStore(s)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${
              store === s ? "border-text-muted bg-surface-2 font-semibold" : "border-border bg-surface text-text-secondary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        {restocksLoading && <p className="text-sm text-text-secondary">Loading…</p>}
        {restocks && <RestockTimeline events={restocks} />}
      </div>
    </div>
  );
}
