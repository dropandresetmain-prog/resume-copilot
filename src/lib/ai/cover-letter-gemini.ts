import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  CoverLetterValidationError,
  prepareGeneratedCoverLetterResult,
} from "@/lib/cover-letter/generation-validation";
import { CoverLetterParseError, parseCoverLetterJsonOrThrow } from "@/lib/cover-letter/parse";
import {
  buildCoverLetterCompressionPrompt,
  buildCoverLetterPrompt,
} from "@/lib/cover-letter/prompt";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

async function callGeminiJson(apiKey: string, prompt: string): Promise<string> {
  const { text } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.3,
    responseMimeType: "application/json",
  });
  return text;
}

function shouldRetryCompression(error: unknown): boolean {
  if (!(error instanceof CoverLetterValidationError)) {
    return false;
  }
  return error.errors.some(
    (entry) => entry.code === "word_count_over_max" || entry.code === "banned_phrase",
  );
}

export async function generateCoverLetterWithGemini(
  input: CoverLetterGenerationInput,
  apiKey: string,
): Promise<CoverLetterGenerationResult> {
  const prompt = buildCoverLetterPrompt(input);
  const text = await callGeminiJson(apiKey, prompt);

  let parsed;
  try {
    parsed = parseCoverLetterJsonOrThrow(text);
  } catch (error) {
    if (error instanceof CoverLetterParseError) {
      throw error;
    }
    throw error;
  }

  try {
    const prepared = prepareGeneratedCoverLetterResult(parsed);
    return {
      formalContent: prepared.formalContent,
      rationale: prepared.rationale,
    };
  } catch (error) {
    if (error instanceof CoverLetterValidationError && shouldRetryCompression(error)) {
      const compressionPrompt = buildCoverLetterCompressionPrompt(input, {
        formalContent: parsed.formalContent,
        wordCount: countWords(parsed.formalContent),
      });
      const retryText = await callGeminiJson(apiKey, compressionPrompt);
      const retryParsed = parseCoverLetterJsonOrThrow(retryText);
      const prepared = prepareGeneratedCoverLetterResult(retryParsed);
      return {
        formalContent: prepared.formalContent,
        rationale: prepared.rationale,
      };
    }
    throw error;
  }
}
