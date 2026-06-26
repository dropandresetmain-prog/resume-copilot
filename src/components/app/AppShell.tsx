import type { ReactNode } from "react";

import { AppNav } from "@/components/app/AppNav";
import { TopBar } from "@/components/app/TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFDF7]">
      <AppNav />

      {/* Content area — offset by sidebar width */}
      <div className="ml-[220px] flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1 px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
