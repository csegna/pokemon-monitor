import type { StockStatus } from "@/lib/types";

const STATUS_META: Record<StockStatus, { label: string; textClass: string; bgClass: string; dotClass: string }> = {
  in_stock: { label: "In stock", textClass: "text-good", bgClass: "bg-good-bg", dotClass: "bg-good" },
  out_of_stock: { label: "Out of stock", textClass: "text-critical", bgClass: "bg-critical-bg", dotClass: "bg-critical" },
  unknown: { label: "Watching", textClass: "text-warning", bgClass: "bg-warning-bg", dotClass: "bg-warning" },
  // Not a stock state - the page check itself is failing. Kept visually
  // distinct (muted, not red) so it doesn't read as "confirmed out of stock."
  error: { label: "Check failed", textClass: "text-text-muted", bgClass: "bg-surface-3", dotClass: "bg-text-muted" },
};

export function StatusPill({ status }: { status: StockStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold ${meta.bgClass} ${meta.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
