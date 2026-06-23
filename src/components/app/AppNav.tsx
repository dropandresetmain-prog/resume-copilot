"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isAppNavActive } from "@/components/app/nav";
import { APP_VERSION } from "@/lib/app-version";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 border-b border-slate-900/10 bg-[#f6f4ef]/90 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:min-w-64">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white">
              RC
            </span>
            <span>Resume Copilot</span>
          </Link>
          <p className="rounded-full border border-slate-900/10 bg-white/70 px-2.5 py-1 text-xs text-slate-500">
            v{APP_VERSION}
          </p>
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border border-slate-900/10 bg-white/75 p-1 shadow-sm lg:mx-0">
          {APP_NAV_ITEMS.map((item) => {
            const active = isAppNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
