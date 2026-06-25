import {
  calculateExperienceDuration,
  getDateRangeEndSortKey,
} from "@/lib/date/duration";
import { countJdTermOverlap } from "@/lib/resume-draft/bullet-payload";
import type { GenerationValidationIssue } from "@/lib/resume-draft/generation-validation";
import type { CollatedExperience } from "@/types/collated";
import type { ResumeDraftContent, ResumeDraftRationale } from "@/types/resume-draft";

/** Role titles that usually belong in Additional Experience unless highly JD-relevant. */
const EARLY_CAREER_ROLE_PATTERN =
  /\b(intern(ship)?|co-?op|trainee|apprentice|graduate (scheme|program(me)?)|student assistant|summer analyst)\b/i;

export const GENERIC_RESUME_PHRASES = [
  "strong alignment",
  "proven track record",
  "leveraging",
  "dynamic professional",
  "dynamic leader",
  "passionate about",
  "extensive experience",
  "results-driven professional",
  "cross-functional stakeholder",
  "synergy",
  "thought leader",
  "best-in-class",
] as const;

const INTERNAL_RATIONALE_PATTERNS: RegExp[] = [
  /\bbulletkey\b/i,
  /\bschemaversion\b/i,
  /\bneeds[_\s-]?review\b/i,
  /\btitle:\s*detail\b/i,
  /\bselectionaudit\b/i,
  /\bglobalriskflags\b/i,
  /advisory_keyword_bank/,
];

const METRIC_PATTERN =
  /(?:S\$|US\$|\$|€|£)?\d[\d,.]*(?:%|[kKmMbB](?:\b|$)?)|\d+(?:\.\d+)?%/gi;

export function isEarlyCareerExperience(
  experience: Pick<CollatedExperience, "role" | "descriptor" | "dateRange">,
  referenceDate = new Date(),
): boolean {
  const roleText = `${experience.role} ${experience.descriptor ?? ""}`;
  if (EARLY_CAREER_ROLE_PATTERN.test(roleText)) {
    return true;
  }

  const dateRange = experience.dateRange?.trim();
  if (!dateRange) {
    return false;
  }

  const duration = calculateExperienceDuration(dateRange, referenceDate);
  if (duration.totalMonths !== undefined && duration.totalMonths <= 4) {
    return true;
  }

  return false;
}

export function scoreExperienceForGeneration(
  experience: CollatedExperience,
  jdTerms: readonly string[],
  referenceDate = new Date(),
): number {
  const roleText = `${experience.role} ${experience.company} ${experience.descriptor ?? ""}`;
  let score = countJdTermOverlap(roleText, jdTerms) * 25;

  let bestBulletOverlap = 0;
  for (const bullet of experience.bullets) {
    const bulletText = `${bullet.keyword ?? ""} ${bullet.description}`.trim();
    bestBulletOverlap = Math.max(bestBulletOverlap, countJdTermOverlap(bulletText, jdTerms));
    if (bullet.sourceCitations.length > 0) {
      score += 5;
    }
  }
  score += bestBulletOverlap * 30;

  const { sortKey, hasDate } = getDateRangeEndSortKey(experience.dateRange, referenceDate);
  if (hasDate) {
    score += Math.min(sortKey / 500_000, 25);
  }

  if (isEarlyCareerExperience(experience, referenceDate)) {
    const jdRelevance = countJdTermOverlap(roleText, jdTerms) + bestBulletOverlap;
    score -= jdRelevance < 2 ? 50 : 20;
  }

  return score;
}

export function findGenericPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return GENERIC_RESUME_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function extractMetrics(text: string): string[] {
  const matches = text.match(METRIC_PATTERN) ?? [];
  return [...new Set(matches.map((metric) => metric.toLowerCase()))];
}

export function findUnsupportedMetrics(
  generatedText: string,
  sourceTexts: readonly string[],
): string[] {
  const sourceMetrics = new Set(sourceTexts.flatMap((text) => extractMetrics(text)));
  return extractMetrics(generatedText).filter((metric) => !sourceMetrics.has(metric));
}

function normalizeForDuplicateCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapRatio(left: string, right: string): number {
  const tokensLeft = new Set(
    normalizeForDuplicateCheck(left)
      .split(" ")
      .filter((word) => word.length > 3),
  );
  const tokensRight = new Set(
    normalizeForDuplicateCheck(right)
      .split(" ")
      .filter((word) => word.length > 3),
  );
  if (tokensLeft.size === 0 || tokensRight.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of tokensLeft) {
    if (tokensRight.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(tokensLeft.size, tokensRight.size);
}

export function areNearDuplicateBullets(left: string, right: string): boolean {
  const normalizedLeft = normalizeForDuplicateCheck(left);
  const normalizedRight = normalizeForDuplicateCheck(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  if (normalizedLeft === normalizedRight) {
    return true;
  }
  return tokenOverlapRatio(left, right) >= 0.85;
}

export function findNearDuplicateBulletPairs(
  bullets: readonly string[],
): Array<{ firstIndex: number; secondIndex: number }> {
  const pairs: Array<{ firstIndex: number; secondIndex: number }> = [];
  for (let firstIndex = 0; firstIndex < bullets.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < bullets.length; secondIndex += 1) {
      if (areNearDuplicateBullets(bullets[firstIndex], bullets[secondIndex])) {
        pairs.push({ firstIndex, secondIndex });
      }
    }
  }
  return pairs;
}

export function detectKeywordStuffing(
  text: string,
  jdTerms: readonly string[],
  threshold = 0.34,
): boolean {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);
  if (words.length < 10) {
    return false;
  }

  const jdHits = words.filter((word) =>
    jdTerms.some((term) => term.includes(word) || word.includes(term)),
  ).length;
  return jdHits / words.length > threshold;
}

function issue(
  code: string,
  message: string,
  severity: GenerationValidationIssue["severity"],
): GenerationValidationIssue {
  return { code, message, severity };
}

export function validateRationaleQuality(
  rationale?: ResumeDraftRationale | null,
): GenerationValidationIssue[] {
  if (!rationale) {
    return [
      issue(
        "missing_rationale",
        "Generation rationale is missing — fit summary may be thin.",
        "warning",
      ),
    ];
  }

  const warnings: GenerationValidationIssue[] = [];
  const rationaleText = [
    rationale.overall,
    rationale.toneNotes,
    rationale.selectionAudit?.positioningAngle,
    rationale.selectionAudit?.roleSelectionRationale,
    ...(rationale.selectionAudit?.strongestMatches ?? []),
    ...(rationale.omissions ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  for (const phrase of findGenericPhrases(rationaleText)) {
    warnings.push(
      issue(
        "generic_rationale_phrase",
        `Rationale uses generic filler ("${phrase}") — prefer specific JD/inventory language.`,
        "warning",
      ),
    );
  }

  for (const pattern of INTERNAL_RATIONALE_PATTERNS) {
    if (pattern.test(rationaleText)) {
      warnings.push(
        issue(
          "internal_rationale_label",
          "Rationale includes internal/technical labels — use user-facing language only.",
          "warning",
        ),
      );
      break;
    }
  }

  const hasStrongest =
    (rationale.selectionAudit?.strongestMatches?.length ?? 0) > 0 ||
    (rationale.omissions?.length ?? 0) > 0;
  const hasPositioning = Boolean(
    rationale.selectionAudit?.positioningAngle?.trim() || rationale.toneNotes?.trim(),
  );
  const hasRoleRationale = Boolean(rationale.selectionAudit?.roleSelectionRationale?.trim());

  if (!hasStrongest && rationale.overall.trim().length < 80) {
    warnings.push(
      issue(
        "thin_rationale",
        "Rationale is too thin — include strongest matches and honest gaps when possible.",
        "warning",
      ),
    );
  }

  if (!hasPositioning) {
    warnings.push(
      issue(
        "missing_positioning_angle",
        "Rationale lacks a positioning angle (toneNotes or selectionAudit.positioningAngle).",
        "warning",
      ),
    );
  }

  if (!hasRoleRationale && (rationale.selectionAudit?.selectedBulletKeys?.length ?? 0) > 0) {
    warnings.push(
      issue(
        "missing_role_selection_rationale",
        "Rationale lacks roleSelectionRationale — explain why Work Experience roles were chosen.",
        "warning",
      ),
    );
  }

  return warnings;
}

export type TailoringValidationOptions = {
  jdTerms?: readonly string[];
  sourceBulletTextsByKey?: ReadonlyMap<string, string>;
  rationale?: ResumeDraftRationale | null;
};

export function validateTailoringQuality(
  content: ResumeDraftContent,
  options: TailoringValidationOptions = {},
): GenerationValidationIssue[] {
  const warnings: GenerationValidationIssue[] = [];
  const jdTerms = options.jdTerms ?? [];
  const allBullets = content.experience.flatMap((role) => role.bullets);
  const bulletTexts = allBullets.map((bullet) => bullet.text);

  const duplicatePairs = findNearDuplicateBulletPairs(bulletTexts);
  for (const pair of duplicatePairs) {
    warnings.push(
      issue(
        "near_duplicate_bullets",
        `Work Experience bullets ${pair.firstIndex + 1} and ${pair.secondIndex + 1} are near-duplicates — consolidate or differentiate.`,
        "warning",
      ),
    );
  }

  for (const bullet of allBullets) {
    for (const phrase of findGenericPhrases(bullet.text)) {
      warnings.push(
        issue(
          "generic_bullet_phrase",
          `Bullet uses generic filler ("${phrase}") — prefer concrete action + outcome language.`,
          "warning",
        ),
      );
    }

    if (jdTerms.length > 0 && detectKeywordStuffing(bullet.text, jdTerms)) {
      warnings.push(
        issue(
          "keyword_stuffing",
          `Bullet may be keyword-stuffed: "${bullet.text.slice(0, 48)}..."`,
          "warning",
        ),
      );
    }

    const sourceTexts: string[] = [];
    for (const ref of bullet.sourceRefs) {
      const key = ref.bulletKey?.trim();
      if (key && options.sourceBulletTextsByKey?.has(key)) {
        sourceTexts.push(options.sourceBulletTextsByKey.get(key)!);
      }
    }

    if (sourceTexts.length > 0) {
      const unsupported = findUnsupportedMetrics(bullet.text, sourceTexts);
      if (unsupported.length > 0) {
        warnings.push(
          issue(
            "unsupported_metric",
            `Bullet may invent metrics not in inventory (${unsupported.join(", ")}): "${bullet.text.slice(0, 48)}..."`,
            "warning",
          ),
        );
      }
    }
  }

  warnings.push(...validateRationaleQuality(options.rationale));

  return warnings;
}
