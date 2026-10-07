"use client";

import { useMemo } from "react";

import { useRestocks, useStatus } from "@/lib/hooks";
import { parseApiDate } from "@/lib/format";

function TickerStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap border-r border-border px-5 py-4 last:border-r-0">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`tabular text-[21px] font-semibold ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

export function Topbar() {
  const { data: products } = useStatus();
  const { data: restocks } = useRestocks();

  const inStockCount = useMemo(() => products?.filter((p) => p.last_status === "in_stock").length ?? 0, [products]);

  const restocksToday = useMemo(() => {
    if (!restocks) return 0;
    const today = new Date().toDateString();
    return restocks.filter((event) => parseApiDate(event.detected_at).toDateString() === today).length;
  }, [restocks]);

  return (
    <header className="flex items-center overflow-x-auto border-b border-border bg-surface px-5">
      <TickerStat label="Tracked" value={products?.length ?? "—"} />
      <TickerStat label="In stock now" value={inStockCount} valueClassName="text-good" />
      <TickerStat label="Restocks today" value={restocksToday} />
      <div className="flex-1" />
    </header>
  );
}
