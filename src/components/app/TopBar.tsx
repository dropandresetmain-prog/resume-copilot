import Link from "next/link";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-folio-outline-variant/40 bg-folio-background px-4 md:justify-end md:px-10">
      {/* Hamburger — opens the mobile nav drawer, hidden at md+ where the sidebar is always visible */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="flex size-8 items-center justify-center rounded-lg text-folio-outline transition hover:bg-folio-surface-container md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Avatar — links to profile */}
      <Link
        href="/profile"
        aria-label="Profile"
        className="size-8 overflow-hidden rounded-full bg-folio-primary-container ring-2 ring-white transition hover:ring-folio-outline-variant"
      >
        <span className="flex size-full items-center justify-center text-xs font-semibold text-white">
          U
        </span>
      </Link>
    </header>
  );
}
