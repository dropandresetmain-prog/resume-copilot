import type {
  InventoryTextExtractionApiErrorResponse,
  InventoryTextExtractionApiResponse,
  InventoryTextExtractionRequest,
} from "@/types/inventory-text-extraction";
import type { ProviderStatusResponse } from "@/types/enrichment";

export type InventoryTextExtractionClientError = Error & {
  rawModelResponse?: string;
  statusCode?: number;
};

export async function fetchInventoryTextExtractionProviderStatus(): Promise<ProviderStatusResponse> {
  const response = await fetch("/api/ai/extract-inventory-from-text");
  return (await response.json()) as ProviderStatusResponse;
}

export async function extractInventoryTextFromApi(
  input: InventoryTextExtractionRequest,
): Promise<InventoryTextExtractionApiResponse> {
  const response = await fetch("/api/ai/extract-inventory-from-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | InventoryTextExtractionApiResponse
    | InventoryTextExtractionApiErrorResponse
    | null;

  if (!response.ok || !payload || "error" in payload) {
    const message =
      payload && "error" in payload
        ? payload.error
        : "Inventory text extraction failed.";
    const error = new Error(message) as InventoryTextExtractionClientError;
    error.statusCode = response.status;
    if (payload && "rawModelResponse" in payload) {
      error.rawModelResponse = payload.rawModelResponse;
    }
    throw error;
  }

  return payload;
}
