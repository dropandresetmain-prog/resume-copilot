import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";

export const SMALL_BATCH_DEFAULT_SIZE = 5;
export const SMALL_BATCH_MIN_SIZE = 3;

export type EnrichmentBatchMode = "full" | "small_batch_test";

export function selectSmallBatchBullets(
  input: EnrichmentInventoryInput,
  maxBullets = SMALL_BATCH_DEFAULT_SIZE,
): EnrichmentInventoryInput {
  const limit = Math.min(
    Math.max(SMALL_BATCH_MIN_SIZE, maxBullets),
    SMALL_BATCH_DEFAULT_SIZE,
    input.bullets.length,
  );
  return {
    bullets: input.bullets.slice(0, limit),
  };
}

export function resolveEnrichmentInput(
  input: EnrichmentInventoryInput,
  mode: EnrichmentBatchMode = "full",
  maxBullets = SMALL_BATCH_DEFAULT_SIZE,
): EnrichmentInventoryInput {
  if (mode === "small_batch_test") {
    return selectSmallBatchBullets(input, maxBullets);
  }
  return input;
}
