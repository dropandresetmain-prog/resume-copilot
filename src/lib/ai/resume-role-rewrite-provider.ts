import {
  rewriteMockResumeRole,
  type ResumeRoleRewriteResult,
} from "@/lib/ai/resume-role-rewrite-mock";
import { rewriteResumeRoleWithGemini } from "@/lib/ai/resume-role-rewrite-gemini";
import {
  assertOpenAiFeatureNotImplemented,
  requireGeminiApiKey,
  resolveActiveProviderId,
} from "@/lib/ai/feature-provider-helpers";
import { type ModelTier } from "@/lib/ai/model-tiers";
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
  const provider = resolveActiveProviderId(providerId);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const result = await rewriteResumeRoleWithGemini(input, requireGeminiApiKey(), modelTier);
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
    assertOpenAiFeatureNotImplemented("resume role rewrite");
  }

  return {
    ...rewriteMockResumeRole(input),
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export function getResumeRoleRewriteProviderLabel(providerId?: string | null): string {
  return getProviderLabel(resolveProviderId(providerId ?? process.env.AI_PROVIDER));
}
