import { countWords } from "@/lib/cover-letter/resume-evidence";
import type { CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export type CoverLetterValidationWarning = {
  code: string;
  message: string;
};

export type CoverLetterValidationResult = {
  ok: boolean;
  warnings: CoverLetterValidationWarning[];
  errors: CoverLetterValidationWarning[];
};

const MIN_WORDS = 350;
const MAX_WORDS = 500;

export function validateCoverLetterGenerationResult(
  result: CoverLetterGenerationResult,
): CoverLetterValidationResult {
  const warnings: CoverLetterValidationWarning[] = [];
  const errors: CoverLetterValidationWarning[] = [];
  const wordCount = countWords(result.formalContent);

  if (!result.formalContent.trim()) {
    errors.push({
      code: "missing_formal_content",
      message: "Formal cover letter content is required.",
    });
  }

  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) {
    warnings.push({
      code: "word_count_outside_target",
      message: `Formal cover letter is ${wordCount} words (target ${MIN_WORDS}–${MAX_WORDS}, ideal ~420).`,
    });
  }

  if (/software engineer/i.test(result.formalContent)) {
    warnings.push({
      code: "software_engineer_label",
      message: 'Cover letter mentions "software engineer" — review for accuracy.',
    });
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
  };
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
      wordCount: countWords(result.formalContent),
    },
    validation,
  };
}
