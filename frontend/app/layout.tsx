import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "CorSe Drop Monitor",
  description: "A Pokémon retail drop tracker with restock alerts and semi-automated checkout.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
