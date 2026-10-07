"use client";

import { Rail } from "./Rail";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="max-w-[1180px] px-4 pb-24 pt-6 md:px-7 md:pb-16">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
