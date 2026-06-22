import { GEMINI_MODEL } from "@/lib/ai/config";
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
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini API error: ${message}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned no content.");
  }

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
