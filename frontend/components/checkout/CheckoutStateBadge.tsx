import type { CheckoutState } from "@/lib/types";

const STATE_META: Record<CheckoutState, { label: string; textClass: string; bgClass: string; dotClass: string }> = {
  opening: { label: "Opening browser…", textClass: "text-warning", bgClass: "bg-warning-bg", dotClass: "bg-warning" },
  cart_ready: { label: "Cart ready — waiting on you", textClass: "text-good", bgClass: "bg-good-bg", dotClass: "bg-good" },
  add_to_cart_failed: {
    label: "Couldn't add to cart",
    textClass: "text-warning",
    bgClass: "bg-warning-bg",
    dotClass: "bg-warning",
  },
  needs_verification: {
    label: "Needs verification",
    textClass: "text-critical",
    bgClass: "bg-critical-bg",
    dotClass: "bg-critical",
  },
  skipped_capacity: {
    label: "Skipped — too many sessions",
    textClass: "text-warning",
    bgClass: "bg-warning-bg",
    dotClass: "bg-warning",
  },
  closed: { label: "Closed", textClass: "text-text-muted", bgClass: "bg-surface-3", dotClass: "bg-text-muted" },
  timed_out: { label: "Timed out", textClass: "text-text-muted", bgClass: "bg-surface-3", dotClass: "bg-text-muted" },
  error: { label: "Error", textClass: "text-critical", bgClass: "bg-critical-bg", dotClass: "bg-critical" },
};

export function CheckoutStateBadge({ state }: { state: CheckoutState }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold ${meta.bgClass} ${meta.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
