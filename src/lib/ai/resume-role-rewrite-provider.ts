import {
  rewriteMockResumeRole,
  type ResumeRoleRewriteResult,
} from "@/lib/ai/resume-role-rewrite-mock";
import { rewriteResumeRoleWithGemini } from "@/lib/ai/resume-role-rewrite-gemini";
import { getPrimaryModelIdForTier, type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type { ResumeRoleRewritePromptInput } from "@/lib/resume-draft/role-rewrite-prompt";

export type ResumeRoleRewriteAIResult = ResumeRoleRewriteResult & {
  providerId: AIProviderId;
  modelName?: string;
  requestedModelTier?: ModelTier;
  modelFallbackApplied?: boolean;
};

export async function rewriteResumeRoleWithAI(
  input: ResumeRoleRewritePromptInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<ResumeRoleRewriteAIResult> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await rewriteResumeRoleWithGemini(input, apiKey, modelTier);
    return {
      bullets: result.bullets,
      notes: result.notes,
      providerId: "gemini",
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };
  }

  if (provider === "openai") {
    throw new Error("OpenAI resume role rewrite is not implemented yet.");
  }

  return {
    ...rewriteMockResumeRole(input),
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export function getResumeRoleRewriteModelName(
  providerId?: string | null,
  modelTier: ModelTier = "standard",
): string | undefined {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  return provider === "gemini" ? getPrimaryModelIdForTier(modelTier) : undefined;
}

export function getResumeRoleRewriteProviderLabel(providerId?: string | null): string {
  return getProviderLabel(resolveProviderId(providerId ?? process.env.AI_PROVIDER));
}
