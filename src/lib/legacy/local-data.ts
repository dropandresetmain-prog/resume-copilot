import { INVENTORY_STORAGE_KEY } from "@/lib/inventory/persistence";
import { JD_STORAGE_KEY } from "@/lib/jd/persistence";

export function detectLegacyLocalData(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hasInventory = Boolean(window.localStorage.getItem(INVENTORY_STORAGE_KEY));
  const hasJobDescriptions = Boolean(window.localStorage.getItem(JD_STORAGE_KEY));

  if (!hasInventory && !hasJobDescriptions) {
    return null;
  }

  return "Local-only data detected in this browser from an older version. Sign in and re-upload resumes or re-save job descriptions to sync to Supabase.";
}
