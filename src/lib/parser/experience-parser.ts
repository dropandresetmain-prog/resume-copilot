/**
 * Layer 2 — generic work experience extraction.
 *
 * Tries registered format profiles in order and returns the best-scoring
 * result. Never discards raw section text — callers preserve lines/warnings.
 */

import {
  parseInlineExperience,
  INLINE_EXPERIENCE_PROFILE_ID,
} from "@/lib/parser/profiles/inline-experience";
import {
  parseTwoLineColumnExperience,
  TWO_LINE_COLUMN_PROFILE_ID,
} from "@/lib/parser/profiles/two-line-column";
import type {
  ExperienceParseProfile,
  ParseConfidence,
  ProfileParseResult,
} from "@/lib/parser/profiles/types";
import type { ParsedExperienceBlock } from "@/lib/parser/heuristics";

const EXPERIENCE_PROFILES: ExperienceParseProfile<ParsedExperienceBlock>[] = [
  {
    id: TWO_LINE_COLUMN_PROFILE_ID,
    name: "Two-line column (company + role/date)",
    parse: parseTwoLineColumnExperience,
  },
  {
    id: INLINE_EXPERIENCE_PROFILE_ID,
    name: "Inline (role/company/date on single line)",
    parse: parseInlineExperience,
  },
];

export type ExperienceSectionParseResult = ProfileParseResult<ParsedExperienceBlock>;

function pickBestResult(
  results: ProfileParseResult<ParsedExperienceBlock>[],
): ExperienceSectionParseResult {
  if (results.length === 0) {
    return {
      blocks: [],
      confidence: "low",
      score: 0,
      warnings: ["No experience parser profiles are registered."],
      unconsumedLines: [],
      profileId: "none",
      profileName: "None",
    };
  }

  return [...results].sort((left, right) => right.score - left.score)[0];
}

export function parseExperienceSection(lines: string[]): ExperienceSectionParseResult {
  const results = EXPERIENCE_PROFILES.map((profile) => profile.parse(lines));
  return pickBestResult(results);
}

export function getExperienceProfiles(): ReadonlyArray<{
  id: string;
  name: string;
}> {
  return EXPERIENCE_PROFILES.map((profile) => ({
    id: profile.id,
    name: profile.name,
  }));
}

export function isLowConfidence(confidence: ParseConfidence): boolean {
  return confidence === "low";
}
