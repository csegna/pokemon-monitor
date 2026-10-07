"use client";

import { useEffect, useState } from "react";

import { SessionList } from "@/components/checkout/SessionList";
import { SessionLogPanel } from "@/components/checkout/SessionLogPanel";
import { useCheckoutSessions, useProducts, useSettings, useUpdateProduct, useUpdateSettings } from "@/lib/hooks";

export default function CheckoutPage() {
  const { data: sessions } = useCheckoutSessions();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Default to the most recent session once sessions load, but don't
  // fight the user's own selection on later polls.
  useEffect(() => {
    if (selectedId === null && sessions && sessions.length > 0) {
      setSelectedId(sessions[0].id);
    }
  }, [sessions, selectedId]);

  const selectedSession = sessions?.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px]">Auto-checkout</h1>
        <p className="mt-1.5 max-w-[60ch] text-[13.5px] text-text-secondary">
          CorSe drives the boring first step. You finish anything that proves you&apos;re human.
        </p>
      </div>

      <div className="flex gap-3.5 rounded-xl border border-l-[3px] border-border border-l-accent bg-surface p-4">
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.7"
          className="mt-0.5 shrink-0"
        >
          <path d="M10 2 3 5v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V5l-7-3Z" />
          <path d="M10 9.5v3M10 6.5v.01" />
        </svg>
        <p className="text-[13px] leading-relaxed text-text-secondary">
          <b className="text-text-primary">What auto-checkout does and doesn&apos;t do.</b> When an armed product
          restocks, CorSe opens a real browser, loads the page, and clicks &quot;Add to Cart&quot; - the same public
          action any shopper can take. It stops there. If anything that looks like a CAPTCHA or verification
          challenge shows up, it stops immediately and leaves the browser open for you. It never logs in, pays, or
          tries to get past a waiting room or rate limit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <SessionList sessions={sessions ?? []} selectedId={selectedId} onSelect={setSelectedId} />
        <SessionLogPanel session={selectedSession} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AutoCheckoutToggleList />
        <CheckoutSettingsPanel />
      </div>
    </div>
  );
}

function CheckoutSettingsPanel() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <div className="text-[15.5px] font-semibold">Checkout behavior</div>
        <div className="text-[12.5px] text-text-secondary">Only matters while a checkout browser is open.</div>
      </div>

      <label className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13.5px] font-semibold">Show the browser window</span>
          <span className="text-xs text-text-muted">
            Keep this on - you need to see it to finish logging in, verifying, and paying.
          </span>
        </div>
        <input
          type="checkbox"
          checked={!settings.checkout_headless}
          onChange={(e) => updateSettings.mutate({ checkout_headless: !e.target.checked })}
        />
      </label>

      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <label className="text-xs font-semibold" htmlFor="checkout-timeout">
          Auto-close an idle session after
        </label>
        <select
          id="checkout-timeout"
          value={settings.checkout_session_timeout_minutes}
          onChange={(e) => updateSettings.mutate({ checkout_session_timeout_minutes: Number(e.target.value) })}
          className="rounded-md border border-border bg-surface-2 px-3 py-2"
        >
          {[10, 20, 30, 45, 60].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AutoCheckoutToggleList() {
  const { data: products, isLoading } = useProducts();
  const updateProduct = useUpdateProduct();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <div className="text-[15.5px] font-semibold">Armed products</div>
        <div className="text-[12.5px] text-text-secondary">
          Turn this on for anything you want CorSe to add to cart the instant it restocks.
        </div>
      </div>
      {isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
      {products?.length === 0 && <p className="text-sm text-text-secondary">No products yet.</p>}
      {products?.map((product, i) => (
        <label
          key={product.id}
          className={`flex items-center justify-between gap-3 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-semibold">{product.name}</span>
            <span className="text-xs text-text-muted">{product.store}</span>
          </div>
          <input
            type="checkbox"
            checked={product.auto_checkout_enabled}
            onChange={(e) => updateProduct.mutate({ id: product.id, input: { auto_checkout_enabled: e.target.checked } })}
          />
        </label>
      ))}
    </div>
  );
}
