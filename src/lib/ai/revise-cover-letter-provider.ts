import { GEMINI_MODEL } from "@/lib/ai/config";
import { reviseMockCoverLetter } from "@/lib/ai/revise-cover-letter-mock";
import { reviseCoverLetterWithGemini } from "@/lib/ai/revise-cover-letter-gemini";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import { prepareCoverLetterRevisionResult } from "@/lib/cover-letter/revision-parse";
import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import type { CoverLetterRevisionResponse } from "@/types/cover-letter-draft";

export async function reviseCoverLetterWithAI(
  input: CoverLetterRevisionPromptInput,
  providerId?: string | null,
): Promise<CoverLetterRevisionResponse & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const timestamp = new Date().toISOString();

  let result;
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    result = await reviseCoverLetterWithGemini(input, apiKey);
  } else if (provider === "openai") {
    throw new Error("OpenAI cover letter revision is not implemented yet.");
  } else {
    result = prepareCoverLetterRevisionResult(reviseMockCoverLetter(input));
  }

  return {
    body: result.body,
    wordCount: result.wordCount,
    warnings: result.warnings,
    provider,
    isMock: provider === "mock",
    providerLabel: getProviderLabel(provider),
    modelName: provider === "gemini" ? GEMINI_MODEL : undefined,
    timestamp,
    providerId: provider,
  };
}
