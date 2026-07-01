"use client";

import { useState, type ReactNode } from "react";

import { AppNav } from "@/components/app/AppNav";
import { TopBar } from "@/components/app/TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-folio-background">
      <AppNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

      {/* Content area — offset by sidebar width at md+; full width below md,
          where the sidebar becomes a drawer opened from TopBar's hamburger */}
      <div className="flex min-h-screen flex-col md:ml-[220px]">
        <TopBar onMenuClick={() => setIsNavOpen(true)} />
        <main className="flex-1 px-4 py-5 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
