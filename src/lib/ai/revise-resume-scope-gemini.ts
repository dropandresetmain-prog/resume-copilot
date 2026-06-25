import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import {
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  type ResumeRoleCustomRevisionPromptInput,
  type ResumeSummaryCustomRevisionPromptInput,
} from "@/lib/resume-draft/custom-revision-prompt";
import { parseResumeSummaryCustomRevisionJson } from "@/lib/resume-draft/custom-revision-parse";
import { parseResumeRoleRewriteJson } from "@/lib/resume-draft/role-rewrite-parse";
import type { ResumeCustomRevisionModelResult } from "@/lib/ai/revise-resume-scope-mock";

export type ResumeCustomRevisionGeminiResult = ResumeCustomRevisionModelResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

export async function reviseResumeSummaryWithGemini(
  input: ResumeSummaryCustomRevisionPromptInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeCustomRevisionGeminiResult> {
  const prompt = buildResumeSummaryCustomRevisionPrompt(input);
  const geminiResult = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep: "revise_resume_summary",
    modelTier,
  });
  const parsed = parseResumeSummaryCustomRevisionJson(geminiResult.text);
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.error ?? "Failed to parse summary revision.");
  }
  const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
  return {
    scope: "professional_summary",
    professionalSummaryText: parsed.value.text,
    warnings: parsed.value.warnings,
    modelName: selection.actualModelId,
    requestedModelTier: selection.requestedTier,
    modelFallbackApplied: geminiResult.fallbackApplied,
  };
}

export async function reviseResumeRoleCustomWithGemini(
  input: ResumeRoleCustomRevisionPromptInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeCustomRevisionGeminiResult> {
  const prompt = buildResumeRoleCustomRevisionPrompt(input);
  const geminiResult = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep: "revise_resume_role_custom",
    modelTier,
  });
  const parsed = parseResumeRoleRewriteJson(geminiResult.text);
  const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
  return {
    scope: "selected_role",
    roleBullets: parsed.bullets,
    warnings: [],
    modelName: selection.actualModelId,
    requestedModelTier: selection.requestedTier,
    modelFallbackApplied: geminiResult.fallbackApplied,
  };
}
