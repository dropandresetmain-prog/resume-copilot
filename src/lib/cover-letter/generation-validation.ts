import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  FORMAL_COVER_LETTER_MIN_WORDS,
  FORMAL_COVER_LETTER_TARGET_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MIN_WORDS,
} from "@/lib/cover-letter/word-limits";
import type { CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export type CoverLetterValidationWarning = {
  code: string;
  message: string;
};

export type CoverLetterValidationResult = {
  ok: boolean;
  wordCount: number;
  warnings: CoverLetterValidationWarning[];
  errors: CoverLetterValidationWarning[];
};

export function validateFormalCoverLetterBody(
  body: string,
  options: { strictMax?: boolean; checkBannedPhrases?: boolean } = {},
): CoverLetterValidationResult {
  const strictMax = options.strictMax ?? true;
  const checkBannedPhrases = options.checkBannedPhrases ?? true;
  const warnings: CoverLetterValidationWarning[] = [];
  const errors: CoverLetterValidationWarning[] = [];
  const wordCount = countWords(body);

  if (!body.trim()) {
    errors.push({
      code: "missing_formal_content",
      message: "Formal cover letter content is required.",
    });
  }

  if (strictMax && wordCount > FORMAL_COVER_LETTER_MAX_WORDS) {
    errors.push({
      code: "word_count_over_max",
      message: `Formal cover letter is ${wordCount} words (hard max ${FORMAL_COVER_LETTER_MAX_WORDS}).`,
    });
  } else if (!strictMax && wordCount > FORMAL_COVER_LETTER_MAX_WORDS) {
    warnings.push({
      code: "word_count_over_max",
      message: `Formal cover letter is ${wordCount} words (hard max ${FORMAL_COVER_LETTER_MAX_WORDS}).`,
    });
  }

  if (wordCount < FORMAL_COVER_LETTER_MIN_WORDS) {
    warnings.push({
      code: "word_count_below_min",
      message: `Formal cover letter is ${wordCount} words (minimum suggested ${FORMAL_COVER_LETTER_MIN_WORDS}).`,
    });
  } else if (
    wordCount < FORMAL_COVER_LETTER_TARGET_MIN_WORDS ||
    wordCount > FORMAL_COVER_LETTER_TARGET_MAX_WORDS
  ) {
    warnings.push({
      code: "word_count_outside_target",
      message: `Formal cover letter is ${wordCount} words (target ${FORMAL_COVER_LETTER_TARGET_MIN_WORDS}–${FORMAL_COVER_LETTER_TARGET_MAX_WORDS}).`,
    });
  }

  if (/software engineer/i.test(body)) {
    warnings.push({
      code: "software_engineer_label",
      message: 'Cover letter mentions "software engineer" — review for accuracy.',
    });
  }

  if (checkBannedPhrases) {
    const banned = detectBannedPhrases(body);
    if (banned.length > 0) {
      errors.push({
        code: "banned_phrase",
        message: `Cover letter contains banned phrasing: ${banned.join(", ")}.`,
      });
    }
  }

  if (!/min htet/i.test(body)) {
    warnings.push({
      code: "missing_signature",
      message: 'Cover letter should end with "Min Htet".',
    });
  }

  return {
    ok: errors.length === 0,
    wordCount,
    warnings,
    errors,
  };
}

export function validateCoverLetterGenerationResult(
  result: CoverLetterGenerationResult,
): CoverLetterValidationResult {
  return validateFormalCoverLetterBody(result.formalContent, {
    strictMax: true,
    checkBannedPhrases: true,
  });
}

export class CoverLetterValidationError extends Error {
  errors: CoverLetterValidationWarning[];

  constructor(message: string, errors: CoverLetterValidationWarning[]) {
    super(message);
    this.name = "CoverLetterValidationError";
    this.errors = errors;
  }
}

export function prepareGeneratedCoverLetterResult(
  result: CoverLetterGenerationResult,
): CoverLetterGenerationResult & { validation: CoverLetterValidationResult } {
  const validation = validateCoverLetterGenerationResult(result);
  if (!validation.ok) {
    throw new CoverLetterValidationError(
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors,
    );
  }

  return {
    ...result,
    rationale: {
      ...result.rationale,
      wordCount: validation.wordCount,
    },
    validation,
  };
}

export function assertExportableCoverLetterBody(body: string): void {
  const validation = validateFormalCoverLetterBody(body, {
    strictMax: true,
    checkBannedPhrases: false,
  });
  if (!validation.ok) {
    throw new CoverLetterValidationError(
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors,
    );
  }
}
