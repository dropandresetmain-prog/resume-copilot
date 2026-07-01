"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { NavIcon } from "@/components/app/NavIcon";
import {
  APP_NAV_ITEMS,
  APP_UTILITY_ITEMS,
  isAppNavActive,
} from "@/components/app/nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { signOut } from "@/lib/supabase/auth";

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

function NavContent({
  pathname,
  onSignOut,
}: {
  pathname: string;
  onSignOut: () => void;
}) {
  return (
    <>
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
        <Link
          href="/generate"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-folio-cta px-4 py-2.5 text-sm font-medium text-white transition hover:bg-folio-cta-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add a job
        </Link>

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

        {/* Sign out */}
        <div className="mt-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/80"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export function AppNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      // Full navigation so middleware sees the cleared session cookie
      window.location.assign("/auth/login");
    }
  }

  // Close the mobile drawer whenever the route changes, so navigating never
  // leaves it open over the new page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Desktop: always-visible fixed sidebar, unchanged from before */}
      <aside
        aria-label="Main navigation"
        className="fixed inset-y-0 left-0 hidden w-[220px] flex-col bg-folio-sidebar md:flex"
      >
        <NavContent pathname={pathname} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile (<md): same nav content in a slide-in drawer */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent aria-label="Main navigation" className="md:hidden">
          <DialogPrimitive.Title className="sr-only">
            Main navigation
          </DialogPrimitive.Title>
          <NavContent pathname={pathname} onSignOut={handleSignOut} />
        </SheetContent>
      </Sheet>
    </>
  );
}
