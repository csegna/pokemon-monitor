"use client";

import { useEffect, useRef, useState } from "react";

import { PhraseTagInput } from "@/components/alerts/PhraseTagInput";
import { ApiError } from "@/lib/api";
import { useProducts, useSettings, useTestWebhook, useUpdateProduct, useUpdateSettings } from "@/lib/hooks";
import type { Settings } from "@/lib/types";

const INTERVAL_OPTIONS = [30, 45, 60, 90, 120];
const AUTOSAVE_DELAY_MS = 700;

export default function AlertsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const testWebhook = useTestWebhook();

  const [draft, setDraft] = useState<Settings | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Skips the very first draft-set (loading from the server) so that
  // doesn't itself trigger a save.
  const skipNextAutosave = useRef(true);

  // Sync the local draft from the server once, when settings first load.
  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  // Auto-save: every edit (a phrase added, a select changed, a checkbox
  // flipped) persists on its own after a short pause, the same way every
  // other control in this app already works (per-product toggles, market
  // refresh). No "did I remember to click Save" step to forget.
  useEffect(() => {
    if (!draft) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    setSaveMessage("Saving…");
    const timeout = setTimeout(() => {
      updateSettings.mutate(draft, {
        onSuccess: () => setSaveMessage("Saved"),
        onError: (err) => setSaveMessage(err instanceof ApiError ? err.message : "Could not save settings."),
      });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs when the draft itself changes
  }, [draft]);

  function handleTestWebhook() {
    setSaveMessage(null);
    testWebhook.mutate(undefined, {
      onSuccess: () => setSaveMessage("Test alert sent - check Discord."),
      onError: (err) => setSaveMessage(err instanceof ApiError ? err.message : "Could not send test alert."),
    });
  }

  if (isLoading || !draft) {
    return <p className="text-sm text-text-secondary">Loading…</p>;
  }

  const quietHoursEnabled = draft.quiet_hours_start !== null && draft.quiet_hours_end !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[26px]">Alert settings</h1>
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] text-text-secondary">
            Choose how CorSe checks pages and how it reaches you the moment something restocks.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-secondary">
          {saveMessage === "Saving…" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" aria-hidden="true" />
          )}
          {saveMessage === "Saved" && <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />}
          {saveMessage ?? "Changes save automatically"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[15.5px] font-semibold">Discord notifications</div>
            <div className="text-[12.5px] text-text-secondary">
              Sent the instant a product flips from out-of-stock to in-stock.
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="webhook">
              Webhook URL
            </label>
            <input
              id="webhook"
              value={draft.discord_webhook_url ?? ""}
              onChange={(e) => setDraft({ ...draft, discord_webhook_url: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            />
            <div className="text-[11.5px] text-text-muted">
              Server Settings → Integrations → Webhooks → New Webhook.
            </div>
          </div>
          <button
            onClick={handleTestWebhook}
            disabled={testWebhook.isPending || !draft.discord_webhook_url}
            className="w-fit rounded-md border border-border px-3.5 py-2 text-[13.5px] font-medium disabled:opacity-50"
          >
            {testWebhook.isPending ? "Sending…" : "Send test alert"}
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[15.5px] font-semibold">Check frequency</div>
            <div className="text-[12.5px] text-text-secondary">Longer intervals are kinder to the retailer&apos;s servers.</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="interval">
              Recheck every
            </label>
            <select
              id="interval"
              value={draft.check_interval_seconds}
              onChange={(e) => setDraft({ ...draft, check_interval_seconds: Number(e.target.value) })}
              className="rounded-md border border-border bg-surface-2 px-3 py-2"
            >
              {INTERVAL_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
            <div className="text-[11.5px] text-text-muted">
              A small random delay is added automatically so checks aren&apos;t perfectly periodic.
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-[13.5px] font-semibold">
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    quiet_hours_start: e.target.checked ? 22 : null,
                    quiet_hours_end: e.target.checked ? 7 : null,
                  })
                }
              />
              Pause Discord pings overnight
            </label>
            {quietHoursEnabled && (
              <div className="flex items-center gap-2 text-[13px]">
                <select
                  value={draft.quiet_hours_start ?? 22}
                  onChange={(e) => setDraft({ ...draft, quiet_hours_start: Number(e.target.value) })}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
                <span className="text-text-muted">to</span>
                <select
                  value={draft.quiet_hours_end ?? 7}
                  onChange={(e) => setDraft({ ...draft, quiet_hours_end: Number(e.target.value) })}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-[11.5px] text-text-muted">
              Monitoring keeps running; restocks are still recorded - only the Discord ping waits until morning.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[15.5px] font-semibold">In-stock phrases</div>
            <div className="text-[12.5px] text-text-secondary">Page text that means &quot;buy me.&quot;</div>
          </div>
          <PhraseTagInput
            phrases={draft.in_stock_phrases}
            onChange={(next) => setDraft({ ...draft, in_stock_phrases: next })}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[15.5px] font-semibold">Out-of-stock phrases</div>
            <div className="text-[12.5px] text-text-secondary">Page text that means &quot;keep waiting.&quot;</div>
          </div>
          <PhraseTagInput
            phrases={draft.out_of_stock_phrases}
            onChange={(next) => setDraft({ ...draft, out_of_stock_phrases: next })}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[15.5px] font-semibold">Market price tracking</div>
            <div className="text-[12.5px] text-text-secondary">
              Only applies to products with a market price URL set. Fully separate cadence from restock checks.
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="market-interval">
              Recheck every
            </label>
            <select
              id="market-interval"
              value={draft.market_check_interval_hours}
              onChange={(e) => setDraft({ ...draft, market_check_interval_hours: Number(e.target.value) })}
              className="rounded-md border border-border bg-surface-2 px-3 py-2"
            >
              {[4, 6, 8, 12, 24].map((hours) => (
                <option key={hours} value={hours}>
                  {hours} hours
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="market-label">
              Price label on the page
            </label>
            <input
              id="market-label"
              value={draft.market_price_label}
              onChange={(e) => setDraft({ ...draft, market_price_label: e.target.value })}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            />
            <div className="text-[11.5px] text-text-muted">
              The text a pricing page shows right before the number, e.g. TCGPlayer uses &quot;Market Price&quot;.
            </div>
          </div>
        </div>
      </div>

      <PerProductNotifications />
    </div>
  );
}

function PerProductNotifications() {
  const { data: products, isLoading } = useProducts();
  const updateProduct = useUpdateProduct();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <div className="text-[15.5px] font-semibold">Per-product notifications</div>
        <div className="text-[12.5px] text-text-secondary">Turn alerts off for anything you&apos;ve already secured.</div>
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
            checked={product.notify_enabled}
            onChange={(e) => updateProduct.mutate({ id: product.id, input: { notify_enabled: e.target.checked } })}
          />
        </label>
      ))}
    </div>
  );
}
