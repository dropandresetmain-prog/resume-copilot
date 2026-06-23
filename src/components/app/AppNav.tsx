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
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-slate-950 transition hover:opacity-90"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-bold text-white shadow-sm">
            RC
          </span>
          <span className="hidden text-base font-semibold tracking-tight sm:inline">
            Resume Copilot
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 [&::-webkit-scrollbar]:hidden">
          {APP_NAV_ITEMS.map((item) => {
            const active = isAppNavActive(pathname, item.href);
            const isPrimary = item.primary === true;

            let className =
              "shrink-0 rounded-lg px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition sm:px-4 ";

            if (isPrimary) {
              className += active
                ? "bg-slate-950 text-white shadow-md"
                : "bg-slate-900 text-white shadow-sm hover:bg-slate-800";
            } else if (active) {
              className += "bg-slate-100 text-slate-950 ring-1 ring-slate-200";
            } else {
              className += "text-slate-600 hover:bg-slate-50 hover:text-slate-950";
            }

            return (
              <Link key={item.href} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </div>

        <p className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 lg:block">
          v{APP_VERSION}
        </p>
      </div>
    </nav>
  );
}
