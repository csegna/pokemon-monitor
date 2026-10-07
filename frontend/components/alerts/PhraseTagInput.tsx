"use client";

import { useState } from "react";

export function PhraseTagInput({
  phrases,
  onChange,
}: {
  phrases: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addPhrase() {
    const trimmed = draft.trim();
    if (trimmed && !phrases.includes(trimmed)) {
      onChange([...phrases, trimmed]);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface-2 p-2.5">
      {phrases.map((phrase) => (
        <span
          key={phrase}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-1.5 text-[12.5px]"
        >
          {phrase}
          <button
            type="button"
            aria-label={`Remove "${phrase}"`}
            onClick={() => onChange(phrases.filter((p) => p !== phrase))}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-3 text-text-muted leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addPhrase();
          }
        }}
        placeholder="+ add phrase, then Enter"
        className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[12.5px] outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
