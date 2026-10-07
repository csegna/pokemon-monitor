"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useStatus } from "@/lib/hooks";

import { ThemeToggle } from "./ThemeToggle";
import { NAV_ITEMS } from "./nav-items";

export function Rail() {
  const pathname = usePathname();
  const { data: products } = useStatus();

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-[232px] shrink-0 flex-col gap-7 border-r border-border bg-surface p-3.5">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <div className="relative h-[30px] w-[30px] shrink-0 rounded-lg bg-linear-to-br from-accent to-accent-shimmer">
          <div className="absolute inset-1.5 rounded-sm bg-surface/90" />
        </div>
        <div>
          <div className="font-display text-[19px] font-semibold leading-tight">CorSe</div>
          <div className="-mt-0.5 text-[11px] uppercase tracking-wider text-text-muted">Drop Monitor</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
                isActive
                  ? "bg-surface-2 font-semibold text-text-primary shadow-[inset_2px_0_0_var(--accent)]"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-85" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5 px-2">
        <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_0_3px_var(--good-bg)]" />
          {products?.length ?? "—"} products watched
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
