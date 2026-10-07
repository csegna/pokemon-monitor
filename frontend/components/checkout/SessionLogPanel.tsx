"use client";

import { useCloseCheckoutSession } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import type { CheckoutSession } from "@/lib/types";

import { CheckoutStateBadge } from "./CheckoutStateBadge";

const LEVEL_COLOR: Record<string, string> = {
  info: "#9CA6BC",
  ok: "#6FE3A6",
  wait: "#F2C063",
  human: "#FF80C0",
  error: "#F26B6B",
};

export function SessionLogPanel({ session }: { session: CheckoutSession | null }) {
  const closeSession = useCloseCheckoutSession();
  const isOpen = session && session.closed_at === null;

  return (
    <div className="flex min-h-[320px] flex-col gap-3 rounded-2xl border border-border p-4" style={{ background: "#0D1016" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-[#EDEFF3]">
            {session ? `${session.product_name} · ${session.store}` : "Select a session"}
          </div>
          {session && <div className="mt-1"><CheckoutStateBadge state={session.state} /></div>}
        </div>
        {isOpen && (
          <button
            onClick={() => closeSession.mutate(session.id)}
            disabled={closeSession.isPending}
            className="shrink-0 rounded-md border border-[#333B4C] px-3 py-1.5 text-[12px] font-medium text-[#C7CCDA] disabled:opacity-50"
          >
            {closeSession.isPending ? "Closing…" : "Close session"}
          </button>
        )}
      </div>

      {!session && <p className="text-[13px] text-[#5F6879]">Pick a session on the left to see its activity log.</p>}

      {session && (
        <div className="flex flex-col gap-1 font-mono text-[12.5px]">
          {session.logs.map((log, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="shrink-0 text-[#5F6879]">{formatDateTime(log.ts)}</span>
              <span style={{ color: LEVEL_COLOR[log.level] ?? "#9CA6BC" }}>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
