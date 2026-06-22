import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { getDateRangeEndSortKey } from "@/lib/date/duration";
import type { CollatedBullet, CollatedExperience } from "@/types/collated";

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

export function sortExperiencesForGeneration(
  experiences: readonly CollatedExperience[],
  referenceDate: Date = new Date(),
): CollatedExperience[] {
  const indexed = experiences.map((experience, index) => ({
    experience,
    index,
    ...getDateRangeEndSortKey(experience.dateRange, referenceDate),
  }));

  return [...indexed]
    .sort((a, b) => {
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

function scoreBulletForGeneration(
  bullet: CollatedBullet,
  experience: CollatedExperience,
  options: {
    jdTerms: readonly string[];
    acceptedWordingByBulletKey: ReadonlyMap<string, string>;
  },
): number {
  const bulletKey = buildBulletEnrichmentKey(
    experience.company,
    experience.role,
    bullet.description,
  );
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
}): {
  selected: GenerationBulletSelection[];
  totalBullets: number;
  jdTerms: string[];
} {
  const jdTerms = extractJdMatchTerms(options.jdText);
  const sortedExperiences = sortExperiencesForGeneration(options.experiences);
  const selected: GenerationBulletSelection[] = [];
  const totalBullets = options.experiences.reduce(
    (total, experience) => total + experience.bullets.length,
    0,
  );

  outer: for (const experience of sortedExperiences) {
    const sortedBullets = sortBulletsForGeneration(experience.bullets, experience, {
      jdTerms,
      acceptedWordingByBulletKey: options.acceptedWordingByBulletKey,
    });

    for (const bullet of sortedBullets) {
      if (selected.length >= options.maxBullets) {
        break outer;
      }

      selected.push({
        experience,
        bullet,
        bulletKey: buildBulletEnrichmentKey(
          experience.company,
          experience.role,
          bullet.description,
        ),
      });
    }
  }

  return { selected, totalBullets, jdTerms };
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
