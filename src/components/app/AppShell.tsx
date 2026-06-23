import type { ReactNode } from "react";

import { AppNav } from "@/components/app/AppNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-[#f6f4ef] text-slate-950">
      <AppNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        <div className="rounded-lg border border-white/70 bg-white/75 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/5 backdrop-blur sm:p-5 lg:p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
