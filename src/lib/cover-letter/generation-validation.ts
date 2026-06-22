import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import {
  detectCompanyUrlInCoverLetterProse,
  proseContainsUrlLikeCompanyReference,
} from "@/lib/cover-letter/company-name";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  FORMAL_COVER_LETTER_MIN_WORDS,
  FORMAL_COVER_LETTER_TARGET_MAX_WORDS,
  FORMAL_COVER_LETTER_TARGET_MIN_WORDS,
} from "@/lib/cover-letter/word-limits";
import type { CoverLetterGenerationResult } from "@/types/cover-letter-draft";
import type { CoverLetterRationale } from "@/types/cover-letter-draft";

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

export function validateCoverLetterRationaleQuality(
  rationale: CoverLetterRationale,
): CoverLetterValidationWarning[] {
  const errors: CoverLetterValidationWarning[] = [];
  const companyFacts =
    rationale.selectedCompanyFacts?.length ?? rationale.companyContextUsed.length;
  const roleRequirements = rationale.selectedRoleRequirements?.length ?? 0;
  const bridges = rationale.companyRoleStoryBridges?.length ?? 0;

  if (companyFacts < 2) {
    errors.push({
      code: "insufficient_company_facts",
      message: "Cover letter rationale must include at least 2 company-specific facts.",
    });
  }

  if (roleRequirements < 2) {
    errors.push({
      code: "insufficient_role_requirements",
      message: "Cover letter rationale must include at least 2 role-specific requirements.",
    });
  }

  if (bridges < 2) {
    errors.push({
      code: "insufficient_company_role_story_bridges",
      message:
        "Cover letter rationale must include at least 2 explicit company → role → story bridges.",
    });
  }

  return errors;
}

export function validateFormalCoverLetterBody(
  body: string,
  options: {
    strictMax?: boolean;
    checkBannedPhrases?: boolean;
    companyDisplayName?: string;
    rationale?: CoverLetterRationale;
  } = {},
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

  const urlsInProse = detectCompanyUrlInCoverLetterProse(body);
  if (urlsInProse.length > 0) {
    errors.push({
      code: "company_url_in_prose",
      message: `Cover letter must not include URLs in prose: ${urlsInProse.join(", ")}`,
    });
  }

  if (
    options.companyDisplayName &&
    proseContainsUrlLikeCompanyReference(body, options.companyDisplayName)
  ) {
    errors.push({
      code: "url_like_company_name",
      message: "Cover letter must use the company display name, not a website URL.",
    });
  }

  if (options.rationale) {
    errors.push(...validateCoverLetterRationaleQuality(options.rationale));
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
  options: { companyDisplayName?: string } = {},
): CoverLetterValidationResult {
  return validateFormalCoverLetterBody(result.formalContent, {
    strictMax: true,
    checkBannedPhrases: true,
    companyDisplayName: options.companyDisplayName,
    rationale: result.rationale,
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
  options: { companyDisplayName?: string } = {},
): CoverLetterGenerationResult & { validation: CoverLetterValidationResult } {
  const validation = validateCoverLetterGenerationResult(result, options);
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
