import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  buildModelSelectionMetadata,
  resolveModelsForTier,
  type ModelTier,
} from "@/lib/ai/model-tiers";
import {
  getHardBlockValidationErrors,
  prepareGeneratedResumeContent,
  ResumeDraftValidationError,
} from "@/lib/resume-draft/generation-validation";
import {
  ResumeDraftParseError,
  parseResumeDraftJson,
} from "@/lib/resume-draft/parse";
import { mergeSpineSnapshotIntoSelectionAudit } from "@/lib/evidence/spine";
import { buildSourceBulletTextsByKey } from "@/lib/resume-draft/payload";
import { buildResumeDraftPrompt } from "@/lib/resume-draft/prompt";
import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import type { ResumeDraftGenerationResult } from "@/types/resume-draft";

export type ResumeDraftGeminiResult = ResumeDraftGenerationResult & {
  modelName: string;
  requestedModelTier: ModelTier;
  modelFallbackApplied: boolean;
};

export async function generateResumeDraftWithGemini(
  input: ResumeDraftGenerationInput,
  apiKey: string,
  modelTier: ModelTier = "standard",
): Promise<ResumeDraftGeminiResult> {
  const prompt = buildResumeDraftPrompt(input);
  const { text, modelUsed, fallbackApplied } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
    models: resolveModelsForTier(modelTier),
    logicalStep: "generate_resume",
    modelTier,
  });

  const parsed = parseResumeDraftJson(text);
  if (!parsed.ok) {
    throw new ResumeDraftParseError(parsed.error, parsed.rawText);
  }

  const rationaleBase = parsed.value.rationale;
  const rationaleWithSpine = input.evidenceSpine
    ? {
        ...rationaleBase,
        selectionAudit: mergeSpineSnapshotIntoSelectionAudit(
          input.evidenceSpine,
          rationaleBase.selectionAudit,
        ),
        omissions:
          rationaleBase.omissions.length > 0
            ? rationaleBase.omissions
            : input.evidenceSpine.honestGaps,
      }
    : rationaleBase;

  const prepared = prepareGeneratedResumeContent(parsed.value.content, {
    jdText: input.jobDescription.rawText,
    targetRoleTitle: input.jobDescription.roleTitle,
    forcedBulletKeys: input.regenerationControls?.forcedBulletKeys,
    unavailableForcedKeys: input.auditHints?.unavailableForcedBulletKeys,
    excludedBulletKeys: input.regenerationControls?.excludedBulletKeys,
    rationale: rationaleWithSpine,
    sourceBulletTextsByKey: buildSourceBulletTextsByKey(input),
  });

  const hardBlockErrors = getHardBlockValidationErrors(prepared.validation);
  if (hardBlockErrors.length > 0) {
    throw new ResumeDraftValidationError(
      hardBlockErrors.map((entry) => entry.message).join(" "),
      hardBlockErrors,
    );
  }

  const rationale =
    prepared.repairMessages.length > 0 || prepared.forcedBulletAudit
      ? {
          ...rationaleWithSpine,
          ...(prepared.forcedBulletAudit
            ? { forcedBulletAudit: prepared.forcedBulletAudit }
            : {}),
          ...(prepared.repairMessages.length > 0
            ? {
                structureRepair: {
                  actions: prepared.repairActions,
                  messages: prepared.repairMessages,
                  needsReview: prepared.needsReview,
                },
              }
            : {}),
        }
      : rationaleWithSpine;

  const selection = buildModelSelectionMetadata(modelTier, modelUsed);

  return {
    content: prepared.content,
    rationale,
    draftStatus: prepared.draftStatus,
    modelName: selection.actualModelId,
    requestedModelTier: selection.requestedTier,
    modelFallbackApplied: fallbackApplied,
  };
}
