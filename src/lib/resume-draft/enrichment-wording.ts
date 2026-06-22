import type { EnrichmentState } from "@/types/enrichment";

/** Latest accepted enrichment wording per bullet key (does not mutate inventory). */
export function buildAcceptedWordingByBulletKey(
  enrichment: EnrichmentState,
): Map<string, string> {
  const index = new Map<string, string>();

  for (const suggestion of enrichment.suggestions) {
    if (suggestion.status !== "accepted") {
      continue;
    }

    const wording = suggestion.acceptedWording?.trim();
    if (!wording) {
      continue;
    }

    index.set(suggestion.bulletKey, wording);
  }

  return index;
}

export function lookupAcceptedWording(
  acceptedWordingByBulletKey: Map<string, string>,
  bulletKey: string,
): string | undefined {
  return acceptedWordingByBulletKey.get(bulletKey);
}
