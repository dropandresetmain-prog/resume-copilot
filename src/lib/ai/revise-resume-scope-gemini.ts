import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import { buildResumeBatchRevisionPrompt } from "@/lib/resume-draft/custom-revision-batch-prompt";
import {
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSingleBulletRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  type ResumeRoleCustomRevisionPromptInput,
  type ResumeSingleBulletRevisionPromptInput,
  type ResumeSummaryCustomRevisionPromptInput,
} from "@/lib/resume-draft/custom-revision-prompt";
import { parseResumeBatchRevisionJson } from "@/lib/resume-draft/custom-revision-batch-parse";
import {
  sanitizeBatchRevisionOutput,
  type ResumeBatchRevisionCandidates,
} from "@/lib/resume-draft/custom-revision-batch";
import {
  parseResumeSingleBulletRevisionJson,
  parseResumeSummaryCustomRevisionJson,
} from "@/lib/resume-draft/custom-revision-parse";
import { parseResumeRoleRewriteJson } from "@/lib/resume-draft/role-rewrite-parse";
import type {
  ResumeCustomRevisionModelResult,
  ResumeBatchRevisionModelInput,
  ResumeSingleBulletRevisionModelResult,
} from "@/lib/ai/revise-resume-scope-mock";

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

export type ResumeSingleBulletRevisionGeminiResult = ResumeSingleBulletRevisionModelResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

export async function reviseResumeSingleBulletsWithGemini(
  input: ResumeSingleBulletRevisionPromptInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeSingleBulletRevisionGeminiResult> {
  const prompt = buildResumeSingleBulletRevisionPrompt(input);
  const geminiResult = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep: "revise_resume_single_bullet",
    modelTier,
  });
  const parsed = parseResumeSingleBulletRevisionJson(geminiResult.text);
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.error ?? "Failed to parse single-bullet revision.");
  }
  const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
  return {
    scope: "single_bullet",
    bulletCandidates: parsed.value.bullets,
    warnings: parsed.value.warnings,
    modelName: selection.actualModelId,
    requestedModelTier: selection.requestedTier,
    modelFallbackApplied: geminiResult.fallbackApplied,
  };
}

export type ResumeBatchRevisionGeminiResult = ResumeBatchRevisionCandidates & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

export async function reviseResumeBatchWithGemini(
  input: ResumeBatchRevisionModelInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeBatchRevisionGeminiResult> {
  const prompt = buildResumeBatchRevisionPrompt({
    content: input.content,
    queue: input.queue,
    jobDescriptionText: input.jobDescriptionText,
    targetRoleTitle: input.targetRoleTitle,
    bulletStyle: input.bulletStyle,
  });
  const geminiResult = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep: "revise_resume_batch",
    modelTier,
  });
  const parsed = parseResumeBatchRevisionJson(geminiResult.text);
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.error ?? "Failed to parse batch revision.");
  }
  const sanitized = sanitizeBatchRevisionOutput({
    content: input.content,
    queue: input.queue,
    parsed: parsed.value,
  });
  const selection = buildModelSelectionMetadata(modelTier, geminiResult.modelUsed);
  return {
    ...sanitized,
    modelName: selection.actualModelId,
    requestedModelTier: selection.requestedTier,
    modelFallbackApplied: geminiResult.fallbackApplied,
  };
}
