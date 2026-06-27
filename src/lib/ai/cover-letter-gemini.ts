import { callGeminiWithRetry, type CallGeminiWithRetryResult } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import {
  CoverLetterValidationError,
  prepareGeneratedCoverLetterResult,
} from "@/lib/cover-letter/generation-validation";
import { CoverLetterParseError, parseCoverLetterJsonOrThrow } from "@/lib/cover-letter/parse";
import {
  buildCoverLetterCompressionPrompt,
  buildCoverLetterPrompt,
} from "@/lib/cover-letter/prompt";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export type CoverLetterGeminiResult = CoverLetterGenerationResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" },
} as const;

export const COVER_LETTER_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    formalCoverLetter: {
      type: "object",
      properties: {
        content: { type: "string" },
        wordCount: { type: "integer" },
      },
      required: ["content", "wordCount"],
    },
    emailCoverLetter: {
      type: "object",
      properties: { content: { type: "string" } },
      required: ["content"],
    },
    linkedinMessage: {
      type: "object",
      properties: { content: { type: "string" } },
      required: ["content"],
    },
    recruiterDm: {
      type: "object",
      properties: { content: { type: "string" } },
      required: ["content"],
    },
    whatsappIntro: {
      type: "object",
      properties: { content: { type: "string" } },
      required: ["content"],
    },
    rationale: {
      type: "object",
      properties: {
        selectedThemes: STRING_ARRAY_SCHEMA,
        whyTheseThemes: { type: "string" },
        selectedCompanyFacts: STRING_ARRAY_SCHEMA,
        selectedRoleRequirements: STRING_ARRAY_SCHEMA,
        companyRoleStoryBridges: STRING_ARRAY_SCHEMA,
        companyContextUsed: STRING_ARRAY_SCHEMA,
        riskFlags: STRING_ARRAY_SCHEMA,
      },
      required: [
        "selectedThemes",
        "whyTheseThemes",
        "selectedCompanyFacts",
        "selectedRoleRequirements",
        "companyRoleStoryBridges",
        "companyContextUsed",
        "riskFlags",
      ],
    },
  },
  required: [
    "formalCoverLetter",
    "emailCoverLetter",
    "linkedinMessage",
    "recruiterDm",
    "whatsappIntro",
    "rationale",
  ],
} as const;

async function callGeminiJson(
  apiKey: string,
  prompt: string,
  modelTier: ModelTier,
  logicalStep: string,
): Promise<CallGeminiWithRetryResult> {
  return callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.3,
    responseMimeType: "application/json",
    responseSchema: COVER_LETTER_RESPONSE_SCHEMA,
    models: resolveModelsForTier(modelTier),
    logicalStep,
    modelTier,
  });
}

function shouldRetryCompression(error: unknown): boolean {
  if (!(error instanceof CoverLetterValidationError)) {
    return false;
  }
  return error.errors.some(
    (entry) => entry.code === "word_count_over_max" || entry.code === "banned_phrase",
  );
}

export async function generateCoverLetterWithGemini(
  input: CoverLetterGenerationInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<CoverLetterGeminiResult> {
  const prompt = buildCoverLetterPrompt(input);
  let geminiResult = await callGeminiJson(apiKey, prompt, modelTier, "generate_cover_letter");

  let parsed;
  try {
    parsed = parseCoverLetterJsonOrThrow(geminiResult.text);
  } catch (error) {
    if (error instanceof CoverLetterParseError) {
      throw error;
    }
    throw error;
  }

  try {
    const prepared = prepareGeneratedCoverLetterResult(parsed, {
      companyDisplayName: input.companyDisplayName ?? input.companyName,
    });
    const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
    return {
      formalContent: prepared.formalContent,
      rationale: {
        ...prepared.rationale,
        modelSelection: {
          requestedTier: selection.requestedTier,
          fallbackApplied: geminiResult.fallbackApplied,
        },
      },
      modelName: selection.actualModelId,
      requestedModelTier: selection.requestedTier,
      modelFallbackApplied: geminiResult.fallbackApplied,
    };
  } catch (error) {
    if (error instanceof CoverLetterValidationError && shouldRetryCompression(error)) {
      const compressionPrompt = buildCoverLetterCompressionPrompt(input, {
        formalContent: parsed.formalContent,
        wordCount: countWords(parsed.formalContent),
      });
      geminiResult = await callGeminiJson(
        apiKey,
        compressionPrompt,
        modelTier,
        "compress_cover_letter",
      );
      const retryParsed = parseCoverLetterJsonOrThrow(geminiResult.text);
      const prepared = prepareGeneratedCoverLetterResult(retryParsed, {
        companyDisplayName: input.companyDisplayName ?? input.companyName,
      });
      const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
      return {
        formalContent: prepared.formalContent,
        rationale: {
          ...prepared.rationale,
          modelSelection: {
            requestedTier: selection.requestedTier,
            fallbackApplied: geminiResult.fallbackApplied,
          },
        },
        modelName: selection.actualModelId,
        requestedModelTier: selection.requestedTier,
        modelFallbackApplied: geminiResult.fallbackApplied,
      };
    }
    throw error;
  }
}
