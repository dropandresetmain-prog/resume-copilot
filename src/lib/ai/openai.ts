import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import type { EnrichmentResult } from "@/types/enrichment";
import type { AIProvider } from "@/lib/ai/types";

export const openaiProvider: AIProvider = {
  id: "openai",

  async enrichInventory(input: EnrichmentInventoryInput): Promise<EnrichmentResult> {
    void input;
    throw new Error(
      "OpenAI provider is not implemented yet. Set AI_PROVIDER=mock or AI_PROVIDER=gemini.",
    );
  },
};
