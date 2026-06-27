"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon } from "@/components/app/NavIcon";
import {
  APP_NAV_ITEMS,
  APP_UTILITY_ITEMS,
  isAppNavActive,
} from "@/components/app/nav";

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: Parameters<typeof NavIcon>[0]["name"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/[0.12] text-white"
          : "text-white/50 hover:bg-white/[0.08] hover:text-white/80",
      ].join(" ")}
    >
      <NavIcon name={icon} size={16} />
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 flex w-[220px] flex-col bg-folio-sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-8">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
          F
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">Folio</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/50">
            Career tailoring
          </p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        {APP_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isAppNavActive(pathname, item.href)}
          />
        ))}
      </nav>

      {/* Spacer + CTA */}
      <div className="mt-auto px-3 pb-4">
        <div className="mb-4 border-t border-white/10" />

        {/* Add a job — terracotta CTA */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-folio-cta px-4 py-2.5 text-sm font-medium text-white transition hover:bg-folio-cta-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add a job
        </button>

        {/* Utility nav (Profile, Settings) */}
        <nav className="mt-4 flex flex-col gap-0.5">
          {APP_UTILITY_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isAppNavActive(pathname, item.href)}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
