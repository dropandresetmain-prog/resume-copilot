import { buildEnrichmentInput } from "@/lib/enrichment/payload";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentApiResponse } from "@/types/enrichment";

export async function requestInventoryEnrichment(
  collated: CollatedInventory,
): Promise<EnrichmentApiResponse> {
  const input = buildEnrichmentInput(collated);
  const response = await fetch("/api/ai/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | (EnrichmentApiResponse & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "AI enrichment request failed.");
  }

  if (!payload?.suggestions) {
    throw new Error("AI enrichment response was invalid.");
  }

  return payload;
}
