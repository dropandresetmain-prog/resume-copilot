export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-[#bec9c2]/40 bg-[#FAFDF7] px-10">
      {/* Notification bell */}
      <button
        type="button"
        aria-label="Notifications"
        className="flex size-8 items-center justify-center rounded-lg text-[#3f4944] transition hover:bg-[#f0edea]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>

      {/* Avatar */}
      <button
        type="button"
        aria-label="Account"
        className="size-8 overflow-hidden rounded-full bg-[#2a7a5e] ring-2 ring-white transition hover:ring-[#bec9c2]"
      >
        <span className="flex size-full items-center justify-center text-xs font-semibold text-white">
          U
        </span>
      </button>
    </header>
  );
}
