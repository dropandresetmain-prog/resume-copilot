import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
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

  const { content, validation } = prepareGeneratedResumeContent(parsed.value.content);
  if (!validation.ok) {
    throw new ResumeDraftValidationError(
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors,
    );
  }

  return {
    content: mergeGenerationWarningsIntoContent(content, validation.warnings),
    rationale: parsed.value.rationale,
  };
}
