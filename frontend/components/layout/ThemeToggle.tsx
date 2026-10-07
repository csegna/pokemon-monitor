"use client";

import { useEffect, useState } from "react";

import { MoonIcon } from "./icons";

type ThemeOverride = "light" | "dark" | null;

function readCurrentOverride(): ThemeOverride {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" || attr === "light" ? attr : null;
}

export function ThemeToggle() {
  // Starts null (no override - follow the OS) and only reads the DOM
  // after mount, since the server has no notion of the user's OS theme.
  const [override, setOverride] = useState<ThemeOverride>(null);

  useEffect(() => {
    setOverride(readCurrentOverride());
  }, []);

  function toggle() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveIsDark = override ? override === "dark" : prefersDark;
    const next: ThemeOverride = effectiveIsDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setOverride(next);
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-text-primary"
    >
      <MoonIcon className="h-[13px] w-[13px]" />
      Toggle theme
    </button>
  );
}
