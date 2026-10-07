"use client";

import { useEffect } from "react";

import { useRefreshSuggestions, useSuggestions } from "@/lib/hooks";

import { SuggestionCard } from "./SuggestionCard";

export function SuggestionsPanel({ onClose }: { onClose: () => void }) {
  const { data: suggestions, isLoading, isError } = useSuggestions(true);
  const refresh = useRefreshSuggestions();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mt-10 flex w-full max-w-[560px] flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[19px]">Suggested products</h2>
            <p className="mt-1 text-[12.5px] text-text-secondary">
              Best-selling sealed Pokémon product on TCGplayer right now, booster boxes left out.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="w-fit rounded-md border border-border px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-50"
        >
          {refresh.isPending ? "Refreshing…" : "Refresh suggestions"}
        </button>

        {isLoading && <p className="text-sm text-text-secondary">Checking TCGplayer&apos;s best sellers…</p>}
        {isError && <p className="text-sm text-critical">Couldn&apos;t load suggestions right now.</p>}
        {suggestions?.length === 0 && (
          <p className="text-sm text-text-secondary">
            Nothing new right now - you&apos;re already tracking the best sellers, or dismissed the rest.
          </p>
        )}

        <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto">
          {suggestions?.map((suggestion) => (
            <SuggestionCard key={suggestion.tcgplayer_product_id} suggestion={suggestion} />
          ))}
        </div>
      </div>
    </div>
  );
}
