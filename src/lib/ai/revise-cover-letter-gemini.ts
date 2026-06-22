import { GEMINI_MODEL } from "@/lib/ai/config";
import { buildCoverLetterRevisionPrompt } from "@/lib/cover-letter/revision-prompt";
import {
  parseCoverLetterRevisionJson,
  prepareCoverLetterRevisionResult,
  type CoverLetterRevisionModelResult,
} from "@/lib/cover-letter/revision-parse";
import type { CoverLetterRevisionPromptInput } from "@/lib/cover-letter/revision-prompt";
import { FORMAL_COVER_LETTER_MAX_WORDS } from "@/lib/cover-letter/word-limits";

async function callGeminiRevision(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
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
  return text;
}

function buildCompressionRevisionPrompt(
  input: CoverLetterRevisionPromptInput,
  draft: CoverLetterRevisionModelResult,
): string {
  return `${buildCoverLetterRevisionPrompt({ ...input, action: "shorten" })}

Previous revision was ${draft.wordCount} words. Compress to at most ${FORMAL_COVER_LETTER_MAX_WORDS} words.
Previous draft:
${draft.body}
`;
}

export async function reviseCoverLetterWithGemini(
  input: CoverLetterRevisionPromptInput,
  apiKey: string,
): Promise<CoverLetterRevisionModelResult> {
  const prompt = buildCoverLetterRevisionPrompt(input);
  const text = await callGeminiRevision(apiKey, prompt);
  const parsed = parseCoverLetterRevisionJson(text);
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.error ?? "Failed to parse cover letter revision.");
  }

  try {
    const prepared = prepareCoverLetterRevisionResult(parsed.value);
    return {
      body: prepared.body,
      wordCount: prepared.wordCount,
      warnings: prepared.warnings,
    };
  } catch {
    const compressionPrompt = buildCompressionRevisionPrompt(input, parsed.value);
    const retryText = await callGeminiRevision(apiKey, compressionPrompt);
    const retryParsed = parseCoverLetterRevisionJson(retryText);
    if (!retryParsed.ok || !retryParsed.value) {
      throw new Error(retryParsed.error ?? "Failed to parse compressed revision.");
    }
    const prepared = prepareCoverLetterRevisionResult(retryParsed.value);
    return {
      body: prepared.body,
      wordCount: prepared.wordCount,
      warnings: prepared.warnings,
    };
  }
}