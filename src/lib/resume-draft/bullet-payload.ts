import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { getDateRangeEndSortKey } from "@/lib/date/duration";
import { buildEvidenceSpine } from "@/lib/evidence/spine";
import {
  isEarlyCareerExperience,
  scoreExperienceForGeneration,
} from "@/lib/resume-draft/tailoring-quality";
import type { CollatedBullet, CollatedExperience } from "@/types/collated";
import type { EnrichmentState } from "@/types/enrichment";

const JD_TERM_STOP_WORDS = new Set([
  "with",
  "that",
  "this",
  "from",
  "have",
  "will",
  "your",
  "their",
  "about",
  "through",
  "including",
  "role",
  "work",
  "team",
  "years",
  "experience",
]);

/** Lightweight JD term list for overlap tie-breaking — not a fit rubric. */
export function extractJdMatchTerms(jdText: string): string[] {
  const words = jdText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !JD_TERM_STOP_WORDS.has(word));

  return [...new Set(words)].slice(0, 40);
}

export function countJdTermOverlap(text: string, jdTerms: readonly string[]): number {
  const lower = text.toLowerCase();
  return jdTerms.filter((term) => lower.includes(term)).length;
}

export type GenerationBulletSelection = {
  experience: CollatedExperience;
  bullet: CollatedBullet;
  bulletKey: string;
};

function resolveInventoryBulletKey(
  experience: CollatedExperience,
  bullet: CollatedBullet,
): string {
  return (
    bullet.inventoryBulletKey ??
    buildBulletEnrichmentKey(experience.company, experience.role, bullet.description)
  );
}

function isBulletExcluded(
  bulletKey: string,
  excludedBulletKeys: ReadonlySet<string> | undefined,
): boolean {
  return excludedBulletKeys?.has(bulletKey) ?? false;
}

export function sortExperiencesForGeneration(
  experiences: readonly CollatedExperience[],
  options: { jdTerms?: readonly string[]; referenceDate?: Date } = {},
): CollatedExperience[] {
  const jdTerms = options.jdTerms ?? [];
  const referenceDate = options.referenceDate ?? new Date();

  const indexed = experiences.map((experience, index) => ({
    experience,
    index,
    relevanceScore: scoreExperienceForGeneration(experience, jdTerms, referenceDate),
    ...getDateRangeEndSortKey(experience.dateRange, referenceDate),
  }));

  return [...indexed]
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      if (a.hasDate && b.hasDate) {
        return b.sortKey - a.sortKey;
      }
      if (a.hasDate && !b.hasDate) {
        return -1;
      }
      if (!a.hasDate && b.hasDate) {
        return 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.experience);
}

export { isEarlyCareerExperience, scoreExperienceForGeneration };

function scoreBulletForGeneration(
  bullet: CollatedBullet,
  experience: CollatedExperience,
  options: {
    jdTerms: readonly string[];
    acceptedWordingByBulletKey: ReadonlyMap<string, string>;
  },
): number {
  const bulletKey = resolveInventoryBulletKey(experience, bullet);
  let score = 0;

  if (options.acceptedWordingByBulletKey.has(bulletKey)) {
    score += 1_000;
  }
  if (bullet.sourceCitations.length > 0) {
    score += 100;
  }

  const text = `${bullet.keyword ?? ""} ${bullet.description}`.trim();
  score += countJdTermOverlap(text, options.jdTerms) * 10;

  return score;
}

export function sortBulletsForGeneration(
  bullets: readonly CollatedBullet[],
  experience: CollatedExperience,
  options: {
    jdTerms: readonly string[];
    acceptedWordingByBulletKey: ReadonlyMap<string, string>;
  },
): CollatedBullet[] {
  return [...bullets]
    .map((bullet, index) => ({
      bullet,
      index,
      score: scoreBulletForGeneration(bullet, experience, options),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.bullet);
}

export function selectGenerationBullets(options: {
  experiences: readonly CollatedExperience[];
  maxBullets: number;
  jdText: string;
  acceptedWordingByBulletKey: ReadonlyMap<string, string>;
  forcedBulletKeys?: readonly string[];
  excludedBulletKeys?: readonly string[];
  enrichment?: EnrichmentState;
  companyContext?: import("@/types/company-context").CompanyContext;
}): {
  selected: GenerationBulletSelection[];
  totalBullets: number;
  jdTerms: string[];
  forcedCount: number;
  unavailableForcedKeys: string[];
} {
  const spine = buildEvidenceSpine({
    collated: {
      experiences: [...options.experiences],
      educationItems: [],
      additionalExperienceItems: [],
      skillItems: [],
    },
    enrichment: options.enrichment ?? { suggestions: [], keywordBank: [], duplicateGroups: [] },
    jdText: options.jdText,
    maxWorkBullets: options.maxBullets,
    regenerationControls: {
      forcedBulletKeys: [...(options.forcedBulletKeys ?? [])],
      excludedBulletKeys: [...(options.excludedBulletKeys ?? [])],
    },
    companyContext: options.companyContext,
    acceptedWordingByBulletKey: options.acceptedWordingByBulletKey,
  });

  const forcedSet = new Set(options.forcedBulletKeys ?? []);

  return {
    selected: spine.workBulletSelections,
    totalBullets: spine.totalWorkBullets,
    jdTerms: spine.jdTerms,
    forcedCount: spine.workBulletSelections.filter((item) => forcedSet.has(item.bulletKey))
      .length,
    unavailableForcedKeys: spine.unavailableForcedKeys,
  };
}

export function groupGenerationBulletsByExperience(
  selected: readonly GenerationBulletSelection[],
): Array<{
  experience: CollatedExperience;
  bullets: Array<{ bullet: CollatedBullet; bulletKey: string }>;
}> {
  const grouped = new Map<
    string,
    {
      experience: CollatedExperience;
      bullets: Array<{ bullet: CollatedBullet; bulletKey: string }>;
    }
  >();

  for (const item of selected) {
    const existing = grouped.get(item.experience.id);
    if (!existing) {
      grouped.set(item.experience.id, {
        experience: item.experience,
        bullets: [{ bullet: item.bullet, bulletKey: item.bulletKey }],
      });
      continue;
    }

    existing.bullets.push({ bullet: item.bullet, bulletKey: item.bulletKey });
  }

  return [...grouped.values()];
}
