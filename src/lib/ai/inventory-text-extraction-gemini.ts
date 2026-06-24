import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import { buildInventoryTextExtractionPrompt } from "@/lib/inventory-text-extraction/prompt";
import { parseInventoryTextExtractionJson } from "@/lib/inventory-text-extraction/parse";
import type { InventoryTextExtractionRequest } from "@/types/inventory-text-extraction";
import type { InventoryTextExtractionResult } from "@/types/inventory-text-extraction";

export async function extractInventoryTextWithGemini(
  input: InventoryTextExtractionRequest,
  apiKey: string,
): Promise<InventoryTextExtractionResult> {
  const prompt = buildInventoryTextExtractionPrompt(input);
  const { text } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
    logicalStep: "extract_inventory_from_text",
  });

  return parseInventoryTextExtractionJson(text, "gemini");
}
