"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isAppNavActive } from "@/components/app/nav";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-b border-slate-200 bg-white shadow-sm"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            Career Resume Copilot
          </Link>
          <p className="text-xs text-slate-500">v0.6.5</p>
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {APP_NAV_ITEMS.map((item) => {
            const active = isAppNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
