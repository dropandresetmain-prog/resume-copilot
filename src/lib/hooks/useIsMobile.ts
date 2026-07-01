"use client";

import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

// Pinned to the app's nav-collapse breakpoint: below Tailwind's `md` (768px),
// the sidebar becomes a drawer. Keep this in sync with docs/DESIGN.md breakpoints.
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
