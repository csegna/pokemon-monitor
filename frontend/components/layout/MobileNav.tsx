"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-surface px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 md:hidden">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const isActive = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-[10.5px] ${
              isActive ? "text-accent" : "text-text-muted"
            }`}
          >
            <Icon className="h-[19px] w-[19px]" />
            {label === "Auto-Checkout" ? "Checkout" : label}
          </Link>
        );
      })}
    </nav>
  );
}
