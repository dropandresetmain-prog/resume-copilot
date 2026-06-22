import { GEMINI_MODEL } from "@/lib/ai/config";
import {
  CoverLetterValidationError,
  prepareGeneratedCoverLetterResult,
} from "@/lib/cover-letter/generation-validation";
import { CoverLetterParseError, parseCoverLetterJsonOrThrow } from "@/lib/cover-letter/parse";
import { buildCoverLetterPrompt } from "@/lib/cover-letter/prompt";
import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export async function generateCoverLetterWithGemini(
  input: CoverLetterGenerationInput,
  apiKey: string,
): Promise<CoverLetterGenerationResult> {
  const prompt = buildCoverLetterPrompt(input);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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

  try {
    const parsed = parseCoverLetterJsonOrThrow(text);
    const prepared = prepareGeneratedCoverLetterResult(parsed);
    return {
      formalContent: prepared.formalContent,
      rationale: prepared.rationale,
    };
  } catch (error) {
    if (error instanceof CoverLetterParseError) {
      throw error;
    }
    if (error instanceof CoverLetterValidationError) {
      throw error;
    }
    throw error;
  }
}
