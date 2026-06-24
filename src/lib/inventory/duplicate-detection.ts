import { buildCollatedBulletKey } from "@/lib/inventory/edits";
import { bulletsAreSimilar, normalizeBulletText } from "@/lib/inventory/normalize";
import type { CollatedExperience, CollatedInventory } from "@/types/collated";
import type { InventoryEdits } from "@/types/inventory-edits";
import { normalizeInventoryEdits } from "@/lib/inventory/edits";

const METRIC_TOKEN_PATTERN =
  /\b(?:\$|usd\s*)?\d[\d,.]*(?:%|k|m|b|x|\+)?\b|\b\d+(?:\.\d+)?%/gi;

const STOP_WORDS = new Set([
  "about",
  "across",
  "after",
  "also",
  "and",
  "are",
  "been",
  "being",
  "both",
  "for",
  "from",
  "have",
  "into",
  "more",
  "over",
  "than",
  "that",
  "the",
  "their",
  "them",
  "these",
  "this",
  "through",
  "under",
  "using",
  "were",
  "with",
  "within",
  "year",
  "years",
]);

export type DuplicateDetectionSignal =
  | "same_normalized_text"
  | "substring_variant"
  | "shared_metrics"
  | "shared_action_keywords";

export type InventoryDuplicateGroup = {
  id: string;
  experienceId: string;
  company: string;
  role: string;
  bulletKeys: string[];
  descriptions: string[];
  reasons: string[];
  signals: DuplicateDetectionSignal[];
};

export function extractMetricTokens(text: string): string[] {
  const matches = text.match(METRIC_TOKEN_PATTERN) ?? [];
  return [
    ...new Set(
      matches.map((token) =>
        token
          .toLowerCase()
          .replace(/[,$]/g, "")
          .replace(/\s+/g, "")
          .trim(),
      ),
    ),
  ].filter(Boolean);
}

export function extractActionKeywords(text: string): string[] {
  return [
    ...new Set(
      normalizeBulletText(text)
        .split(" ")
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
    ),
  ];
}

export type DuplicatePairScore = {
  match: boolean;
  reasons: string[];
  signals: DuplicateDetectionSignal[];
};

export function scoreDuplicateBulletPair(a: string, b: string): DuplicatePairScore {
  const reasons: string[] = [];
  const signals: DuplicateDetectionSignal[] = [];

  const na = normalizeBulletText(a);
  const nb = normalizeBulletText(b);
  if (na && nb && na === nb) {
    signals.push("same_normalized_text");
    reasons.push("Same normalized wording");
  } else if (bulletsAreSimilar(a, b)) {
    if (
      na.length > 20 &&
      nb.length > 20 &&
      (na.includes(nb) || nb.includes(na))
    ) {
      signals.push("substring_variant");
      reasons.push("One bullet is a shorter or longer variant of the other");
    } else {
      signals.push("shared_action_keywords");
      reasons.push("Very similar wording within the same role");
    }
  }

  const metricsA = extractMetricTokens(a);
  const metricsB = extractMetricTokens(b);
  const sharedMetrics = metricsA.filter((metric) => metricsB.includes(metric));

  const wordsA = extractActionKeywords(a);
  const wordsB = new Set(extractActionKeywords(b));
  const sharedKeywords = wordsA.filter((word) => wordsB.has(word));

  if (sharedMetrics.length >= 1 && sharedKeywords.length >= 2) {
    if (!signals.includes("shared_metrics")) {
      signals.push("shared_metrics");
    }
    if (!signals.includes("shared_action_keywords")) {
      signals.push("shared_action_keywords");
    }
    reasons.push(
      `Shared metrics (${sharedMetrics.join(", ")}) and overlapping keywords (${sharedKeywords.slice(0, 4).join(", ")})`,
    );
  } else if (sharedMetrics.length >= 2) {
    signals.push("shared_metrics");
    reasons.push(`Shared numbers or metrics: ${sharedMetrics.join(", ")}`);
  } else if (
    sharedMetrics.length === 1 &&
    sharedKeywords.length >= 3 &&
    !signals.length
  ) {
    signals.push("shared_metrics", "shared_action_keywords");
    reasons.push(
      `Same metric (${sharedMetrics[0]}) with similar action keywords`,
    );
  }

  return {
    match: signals.length > 0,
    reasons: [...new Set(reasons)],
    signals: [...new Set(signals)],
  };
}

function buildDuplicateGroupId(
  experienceId: string,
  bulletKeys: string[],
): string {
  const fingerprint = [...bulletKeys].sort().join("|");
  return `inv-dup-${experienceId}-${fingerprint.slice(0, 48)}`;
}

function mergePairReasons(
  target: InventoryDuplicateGroup,
  score: DuplicatePairScore,
): void {
  for (const reason of score.reasons) {
    if (!target.reasons.includes(reason)) {
      target.reasons.push(reason);
    }
  }
  for (const signal of score.signals) {
    if (!target.signals.includes(signal)) {
      target.signals.push(signal);
    }
  }
}

function detectGroupsWithinExperience(
  experience: CollatedExperience,
): InventoryDuplicateGroup[] {
  const entries = experience.bullets.map((bullet) => ({
    bullet,
    bulletKey: buildCollatedBulletKey(experience, bullet),
    description: bullet.description,
  }));

  if (entries.length < 2) {
    return [];
  }

  const parent = entries.map((_, index) => index);

  function find(index: number): number {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]!);
    }
    return parent[index]!;
  }

  function union(left: number, right: number): void {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) {
      parent[rootRight] = rootLeft;
    }
  }

  const pairScores = new Map<string, DuplicatePairScore>();

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const score = scoreDuplicateBulletPair(
        entries[i]!.description,
        entries[j]!.description,
      );
      if (!score.match) {
        continue;
      }
      union(i, j);
      pairScores.set(`${i}:${j}`, score);
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < entries.length; i += 1) {
    const root = find(i);
    const bucket = clusters.get(root) ?? [];
    bucket.push(i);
    clusters.set(root, bucket);
  }

  const groups: InventoryDuplicateGroup[] = [];

  for (const indices of clusters.values()) {
    if (indices.length < 2) {
      continue;
    }

    const bulletKeys = indices.map((index) => entries[index]!.bulletKey);
    const descriptions = indices.map((index) => entries[index]!.description);
    const group: InventoryDuplicateGroup = {
      id: buildDuplicateGroupId(experience.id, bulletKeys),
      experienceId: experience.id,
      company: experience.company,
      role: experience.role,
      bulletKeys,
      descriptions,
      reasons: [],
      signals: [],
    };

    for (let a = 0; a < indices.length; a += 1) {
      for (let b = a + 1; b < indices.length; b += 1) {
        const left = indices[a]!;
        const right = indices[b]!;
        const key =
          left < right ? `${left}:${right}` : `${right}:${left}`;
        const score = pairScores.get(key);
        if (score) {
          mergePairReasons(group, score);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

export function detectInventoryDuplicateGroups(
  collated: CollatedInventory,
): InventoryDuplicateGroup[] {
  return collated.experiences.flatMap((experience) =>
    detectGroupsWithinExperience(experience),
  );
}

export function listActiveInventoryDuplicateGroups(
  collated: CollatedInventory,
  editsInput?: InventoryEdits,
): InventoryDuplicateGroup[] {
  const edits = normalizeInventoryEdits(editsInput);
  const dismissed = new Set(edits.dismissedDuplicateGroupIds ?? []);
  const hidden = new Set(edits.hiddenBulletKeys);

  return detectInventoryDuplicateGroups(collated).filter((group) => {
    if (dismissed.has(group.id)) {
      return false;
    }

    const visibleKeys = group.bulletKeys.filter((key) => !hidden.has(key));
    return visibleKeys.length >= 2;
  });
}
