import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-folio-outline-variant/40 bg-folio-background px-10">
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
