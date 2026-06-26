import type { CollatedBulletListing } from "@/lib/inventory/edits";
import type { ResumeDraftContent } from "@/types/resume-draft";

export type EvidencePendingActionType =
  | "remove_from_draft"
  | "add_to_draft"
  | "exclude_from_generation"
  | "include_on_full_regenerate"
  | "exclude_additional_on_regenerate";

export type EvidencePendingAction = {
  id: string;
  type: EvidencePendingActionType;
  bulletKey?: string;
  /** Additional Experience spine ID (`additional:{item.id}`). */
  evidenceId?: string;
  label: string;
};

export type EvidenceQueueSummary = {
  removeCount: number;
  addCount: number;
  excludeCount: number;
  includeAdditionalCount: number;
  excludeAdditionalCount: number;
  affectedRoleCount: number;
  summaryLines: string[];
  hasGeminiWork: boolean;
};

export function buildEvidenceQueueSummary(
  actions: EvidencePendingAction[],
  affectedRoleCount: number,
): EvidenceQueueSummary {
  const removeCount = actions.filter((action) => action.type === "remove_from_draft").length;
  const addCount = actions.filter((action) => action.type === "add_to_draft").length;
  const excludeCount = actions.filter(
    (action) => action.type === "exclude_from_generation",
  ).length;
  const includeAdditionalCount = actions.filter(
    (action) => action.type === "include_on_full_regenerate",
  ).length;
  const excludeAdditionalCount = actions.filter(
    (action) => action.type === "exclude_additional_on_regenerate",
  ).length;

  const summaryLines: string[] = [];
  if (removeCount > 0) {
    summaryLines.push(`Remove ${removeCount} bullet${removeCount === 1 ? "" : "s"} from draft`);
  }
  if (addCount > 0) {
    summaryLines.push(`Add ${addCount} evidence item${addCount === 1 ? "" : "s"} to draft`);
  }
  if (includeAdditionalCount > 0) {
    summaryLines.push(
      `Include ${includeAdditionalCount} additional experience item${includeAdditionalCount === 1 ? "" : "s"} on full regeneration (no targeted rewrite)`,
    );
  }
  if (excludeCount > 0) {
    summaryLines.push(
      `Exclude ${excludeCount} item${excludeCount === 1 ? "" : "s"} from future generation`,
    );
  }
  if (excludeAdditionalCount > 0) {
    summaryLines.push(
      `Exclude ${excludeAdditionalCount} additional experience item${excludeAdditionalCount === 1 ? "" : "s"} from future generation`,
    );
  }
  if (addCount > 0 && affectedRoleCount > 0) {
    summaryLines.push(
      `Will rewrite ${affectedRoleCount} affected role${affectedRoleCount === 1 ? "" : "s"} (1 AI step)`,
    );
  }

  return {
    removeCount,
    addCount,
    excludeCount,
    includeAdditionalCount,
    excludeAdditionalCount,
    affectedRoleCount,
    summaryLines,
    hasGeminiWork: addCount > 0,
  };
}

export function collectGeneratedBulletsWithKeys(
  content: ResumeDraftContent,
): Array<{
  experienceIndex: number;
  bulletIndex: number;
  text: string;
  sourceKeys: string[];
  company: string;
  role: string;
}> {
  const items: Array<{
    experienceIndex: number;
    bulletIndex: number;
    text: string;
    sourceKeys: string[];
    company: string;
    role: string;
  }> = [];

  content.experience.forEach((experience, experienceIndex) => {
    experience.bullets.forEach((bullet, bulletIndex) => {
      const sourceKeys = bullet.sourceRefs
        .map((ref) => ref.bulletKey?.trim())
        .filter((key): key is string => Boolean(key));
      items.push({
        experienceIndex,
        bulletIndex,
        text: bullet.text,
        sourceKeys,
        company: experience.company,
        role: experience.role,
      });
    });
  });

  return items;
}

export function inventoryKeysAlreadyInDraft(
  content: ResumeDraftContent,
): Set<string> {
  const keys = new Set<string>();
  for (const item of collectGeneratedBulletsWithKeys(content)) {
    for (const key of item.sourceKeys) {
      keys.add(key);
    }
  }
  return keys;
}

export function listingLabel(listing: CollatedBulletListing): string {
  return `${listing.experience.company} · ${listing.experience.role}`;
}
