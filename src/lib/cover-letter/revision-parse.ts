import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  validateFormalCoverLetterBody,
  type CoverLetterValidationWarning,
} from "@/lib/cover-letter/generation-validation";

export type CoverLetterRevisionModelResult = {
  body: string;
  wordCount: number;
  warnings: string[];
};

export function parseCoverLetterRevisionJson(rawText: string): {
  ok: boolean;
  value?: CoverLetterRevisionModelResult;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const body = typeof parsed.body === "string" ? parsed.body : "";
    if (!body.trim()) {
      return { ok: false, error: "Missing revised body." };
    }
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === "string")
      : [];
    return {
      ok: true,
      value: {
        body,
        wordCount:
          typeof parsed.wordCount === "number" ? parsed.wordCount : countWords(body),
        warnings,
      },
    };
  } catch {
    return { ok: false, error: "Invalid revision JSON." };
  }
}

export function prepareCoverLetterRevisionResult(
  result: CoverLetterRevisionModelResult,
): CoverLetterRevisionModelResult & {
  validationWarnings: CoverLetterValidationWarning[];
} {
  const validation = validateFormalCoverLetterBody(result.body, {
    strictMax: true,
    checkBannedPhrases: true,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.map((entry) => entry.message).join(" "));
  }

  return {
    body: result.body,
    wordCount: validation.wordCount,
    warnings: [
      ...result.warnings,
      ...validation.warnings.map((entry) => entry.message),
    ],
    validationWarnings: validation.warnings,
  };
}
