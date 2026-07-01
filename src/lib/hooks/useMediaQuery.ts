"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void) {
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener("change", onChange);
  return () => mediaQueryList.removeEventListener("change", onChange);
}

function getServerSnapshot() {
  return false;
}

// SSR-safe: server/first-paint snapshot is always false, then syncs to the
// real matchMedia result on the client via useSyncExternalStore.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}
