import type { ReactNode } from "react";

import { AppNav } from "@/components/app/AppNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-950">
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
