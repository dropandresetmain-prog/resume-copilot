import { normalizeBulletText } from "@/lib/inventory/normalize";

/** Stable hash for enrichable bullet source text. */
export function hashEnrichmentSourceText(text: string): string {
  return normalizeBulletText(text);
}
