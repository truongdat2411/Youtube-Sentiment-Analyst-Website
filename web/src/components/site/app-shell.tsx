import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { AuthNav } from "@/components/site/auth-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Sentiment Studio</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/analysis" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
