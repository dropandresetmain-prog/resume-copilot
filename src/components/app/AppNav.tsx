"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS, isAppNavActive } from "@/components/app/nav";
import { APP_VERSION } from "@/lib/app-version";

function navLinkClassName(active: boolean, isPrimary: boolean): string {
  let className =
    "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition sm:px-3.5 sm:py-2.5 ";

  if (isPrimary) {
    className += active
      ? "bg-slate-950 text-white shadow-md"
      : "bg-slate-900 text-white shadow-sm hover:bg-slate-800";
  } else if (active) {
    className += "bg-slate-100 text-slate-950 ring-1 ring-slate-200";
  } else {
    className += "text-slate-600 hover:bg-slate-50 hover:text-slate-950";
  }

  return className;
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:shrink-0">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-slate-950 transition hover:opacity-90"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-bold text-white shadow-sm sm:size-9">
              RC
            </span>
            <span className="hidden text-base font-semibold tracking-tight md:inline">
              Resume Copilot
            </span>
          </Link>
          <p className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:hidden">
            v{APP_VERSION}
          </p>
        </div>

        {/* Relative wrapper so the fade overlay can be positioned against the scroll container */}
        <div className="relative min-w-0 flex-1 sm:flex-none sm:flex-1">
          <div
            className="flex w-full min-w-0 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-1 sm:justify-end sm:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Workspace pages"
          >
            {APP_NAV_ITEMS.map((item) => {
              const active = isAppNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClassName(active, item.primary === true)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {/* Right-edge fade affordance — signals that nav scrolls on narrow viewports */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/95 to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>

        <p className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 lg:block">
          v{APP_VERSION}
        </p>
      </div>
    </nav>
  );
}
