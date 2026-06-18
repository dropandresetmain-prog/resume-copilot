import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type { EnrichmentResult } from "@/types/enrichment";

export type AIProviderId = "mock" | "gemini" | "openai";

export interface AIProvider {
  id: AIProviderId;
  enrichInventory(input: EnrichmentInventoryInput): Promise<EnrichmentResult>;
}
