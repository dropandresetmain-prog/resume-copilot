import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import {
  parseResumeRoleRewriteJson,
  ResumeRoleRewriteParseError,
} from "@/lib/resume-draft/role-rewrite-parse";
import { buildResumeRoleRewritePrompt } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeRoleRewritePromptInput } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeRoleRewriteResult } from "@/lib/ai/resume-role-rewrite-mock";

export type ResumeRoleRewriteGeminiResult = ResumeRoleRewriteResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

export async function rewriteResumeRoleWithGemini(
  input: ResumeRoleRewritePromptInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeRoleRewriteGeminiResult> {
  const prompt = buildResumeRoleRewritePrompt(input);
  const { text, modelUsed, fallbackApplied } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
  });

  try {
    const parsed = parseResumeRoleRewriteJson(text);
    const selection = buildModelSelectionMetadata(modelTier, modelUsed);
    return {
      ...parsed,
      modelName: selection.actualModelId,
      requestedModelTier: selection.requestedTier,
      modelFallbackApplied: fallbackApplied,
    };
  } catch (error) {
    if (error instanceof ResumeRoleRewriteParseError) {
      throw error;
    }
    throw error;
  }
}
