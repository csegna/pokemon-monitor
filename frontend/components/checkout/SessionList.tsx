import type { CheckoutSession } from "@/lib/types";

import { CheckoutStateBadge } from "./CheckoutStateBadge";

export function SessionList({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: CheckoutSession[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-text-secondary">
        No checkout sessions yet. Arm a product below - the next time it restocks, a session will show up here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className={`flex flex-col gap-1.5 rounded-xl border bg-surface p-3.5 text-left ${
            selectedId === session.id ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-border"
          }`}
        >
          <div className="text-[13.5px] font-semibold">{session.product_name}</div>
          <div className="text-[11.5px] text-text-muted">{session.store}</div>
          <CheckoutStateBadge state={session.state} />
        </button>
      ))}
    </div>
  );
}
