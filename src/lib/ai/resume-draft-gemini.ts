import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  getHardBlockValidationErrors,
  mergeGenerationWarningsIntoContent,
  prepareGeneratedResumeContent,
  ResumeDraftValidationError,
} from "@/lib/resume-draft/generation-validation";
import {
  ResumeDraftParseError,
  parseResumeDraftJson,
} from "@/lib/resume-draft/parse";
import { buildResumeDraftPrompt } from "@/lib/resume-draft/prompt";
import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import type { ResumeDraftGenerationResult } from "@/types/resume-draft";

export async function generateResumeDraftWithGemini(
  input: ResumeDraftGenerationInput,
  apiKey: string,
): Promise<ResumeDraftGenerationResult> {
  const prompt = buildResumeDraftPrompt(input);
  const { text } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
  });

  const parsed = parseResumeDraftJson(text);
  if (!parsed.ok) {
    throw new ResumeDraftParseError(parsed.error, parsed.rawText);
  }

  const prepared = prepareGeneratedResumeContent(parsed.value.content, {
    jdText: input.jobDescription.rawText,
    targetRoleTitle: input.jobDescription.roleTitle,
  });

  const hardBlockErrors = getHardBlockValidationErrors(prepared.validation);
  if (hardBlockErrors.length > 0) {
    throw new ResumeDraftValidationError(
      hardBlockErrors.map((entry) => entry.message).join(" "),
      hardBlockErrors,
    );
  }

  const rationale =
    prepared.repairMessages.length > 0
      ? {
          ...parsed.value.rationale,
          structureRepair: {
            actions: prepared.repairActions,
            messages: prepared.repairMessages,
            needsReview: prepared.needsReview,
          },
        }
      : parsed.value.rationale;

  return {
    content: prepared.content,
    rationale,
    draftStatus: prepared.draftStatus,
  };
}
