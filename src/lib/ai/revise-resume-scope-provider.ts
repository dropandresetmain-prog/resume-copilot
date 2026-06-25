import {
  reviseMockResumeRoleCustom,
  reviseMockResumeSummary,
  reviseMockResumeBatch,
  type ResumeCustomRevisionModelResult,
  type ResumeBatchRevisionModelInput,
} from "@/lib/ai/revise-resume-scope-mock";
import {
  reviseResumeBatchWithGemini,
  reviseResumeRoleCustomWithGemini,
  reviseResumeSummaryWithGemini,
} from "@/lib/ai/revise-resume-scope-gemini";
import { getPrimaryModelIdForTier, type ModelTier } from "@/lib/ai/model-tiers";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type { ResumeBatchRevisionCandidates } from "@/lib/resume-draft/custom-revision-batch";
import type {
  ResumeRoleCustomRevisionPromptInput,
  ResumeSummaryCustomRevisionPromptInput,
} from "@/lib/resume-draft/custom-revision-prompt";
import type { ResumeCustomRevisionScope } from "@/types/resume-draft";

export type ResumeCustomRevisionAIInput =
  | ({ scope: "professional_summary" } & ResumeSummaryCustomRevisionPromptInput)
  | ({ scope: "selected_role" } & ResumeRoleCustomRevisionPromptInput);

export async function reviseResumeScopeWithAI(
  input: ResumeCustomRevisionAIInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<
  ResumeCustomRevisionModelResult & {
    providerId: AIProviderId;
    modelName?: string;
    requestedModelTier: ModelTier;
    modelFallbackApplied: boolean;
  }
> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result =
      input.scope === "professional_summary"
        ? await reviseResumeSummaryWithGemini(input, apiKey, modelTier)
        : await reviseResumeRoleCustomWithGemini(input, apiKey, modelTier);
    return {
      ...result,
      providerId: "gemini",
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };
  }

  if (provider === "openai") {
    throw new Error("OpenAI resume custom revision is not implemented yet.");
  }

  const result =
    input.scope === "professional_summary"
      ? reviseMockResumeSummary(input)
      : reviseMockResumeRoleCustom(input);

  return {
    ...result,
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export async function reviseResumeBatchWithAI(
  input: ResumeBatchRevisionModelInput,
  providerId?: string | null,
  options?: { modelTier?: ModelTier },
): Promise<
  ResumeBatchRevisionCandidates & {
    providerId: AIProviderId;
    modelName?: string;
    requestedModelTier: ModelTier;
    modelFallbackApplied: boolean;
  }
> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  const modelTier = options?.modelTier ?? "standard";

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await reviseResumeBatchWithGemini(input, apiKey, modelTier);
    return {
      ...result,
      providerId: "gemini",
      modelName: result.modelName,
      requestedModelTier: result.requestedModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };
  }

  if (provider === "openai") {
    throw new Error("OpenAI resume batch revision is not implemented yet.");
  }

  const result = reviseMockResumeBatch(input);
  return {
    ...result,
    providerId: "mock",
    modelName: undefined,
    requestedModelTier: modelTier,
    modelFallbackApplied: false,
  };
}

export function getResumeCustomRevisionModelName(
  providerId?: string | null,
  modelTier: ModelTier = "standard",
): string | undefined {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  return provider === "gemini" ? getPrimaryModelIdForTier(modelTier) : undefined;
}

export function getResumeCustomRevisionProviderLabel(providerId?: string | null): string {
  return getProviderLabel(resolveProviderId(providerId ?? process.env.AI_PROVIDER));
}

export function isResumeCustomRevisionScope(value: string): value is ResumeCustomRevisionScope {
  return value === "professional_summary" || value === "selected_role";
}
