import { callGeminiWithRetry, type CallGeminiWithRetryResult } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import { buildCoverLetterRevisionPrompt } from "@/lib/cover-letter/revision-prompt";
import {
  parseCoverLetterRevisionJson,
  prepareCoverLetterRevisionResult,
  type CoverLetterRevisionModelResult,
} from "@/lib/cover-letter/revision-parse";
import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import { FORMAL_COVER_LETTER_MAX_WORDS } from "@/lib/cover-letter/word-limits";

export type CoverLetterRevisionGeminiResult = CoverLetterRevisionModelResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

async function callGeminiRevision(
  apiKey: string,
  prompt: string,
  modelTier: ModelTier,
  logicalStep: string,
): Promise<CallGeminiWithRetryResult> {
  return callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep,
    modelTier,
  });
}

function buildCompressionRevisionPrompt(
  input: CoverLetterRevisionPromptInput,
  draft: CoverLetterRevisionModelResult,
): string {
  return `${buildCoverLetterRevisionPrompt({ ...input, action: "shorten" })}

Previous revision was ${draft.wordCount} words. Compress to at most ${FORMAL_COVER_LETTER_MAX_WORDS} words.
Previous draft:
${draft.body}
`;
}

export async function reviseCoverLetterWithGemini(
  input: CoverLetterRevisionPromptInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<CoverLetterRevisionGeminiResult> {
  const prompt = buildCoverLetterRevisionPrompt(input);
  let geminiResult = await callGeminiRevision(
    apiKey,
    prompt,
    modelTier,
    "revise_cover_letter",
  );
  const parsed = parseCoverLetterRevisionJson(geminiResult.text);
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.error ?? "Failed to parse cover letter revision.");
  }

  try {
    const prepared = prepareCoverLetterRevisionResult(parsed.value, {
      candidateName: input.candidateName,
    });
    const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
    return {
      body: prepared.body,
      wordCount: prepared.wordCount,
      warnings: prepared.warnings,
      modelName: selection.actualModelId,
      requestedModelTier: selection.requestedTier,
      modelFallbackApplied: geminiResult.fallbackApplied,
    };
  } catch {
    const compressionPrompt = buildCompressionRevisionPrompt(input, parsed.value);
    geminiResult = await callGeminiRevision(
      apiKey,
      compressionPrompt,
      modelTier,
      "compress_cover_letter_revision",
    );
    const retryParsed = parseCoverLetterRevisionJson(geminiResult.text);
    if (!retryParsed.ok || !retryParsed.value) {
      throw new Error(retryParsed.error ?? "Failed to parse compressed revision.");
    }
    const prepared = prepareCoverLetterRevisionResult(retryParsed.value, {
      candidateName: input.candidateName,
    });
    const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
    return {
      body: prepared.body,
      wordCount: prepared.wordCount,
      warnings: prepared.warnings,
      modelName: selection.actualModelId,
      requestedModelTier: selection.requestedTier,
      modelFallbackApplied: geminiResult.fallbackApplied,
    };
  }
}
