import type { CollatedBulletListing } from "@/lib/inventory/edits";
import type { ResumeDraftContent } from "@/types/resume-draft";

export type EvidencePendingActionType =
  | "remove_from_draft"
  | "add_to_draft"
  | "exclude_from_generation";

export type EvidencePendingAction = {
  id: string;
  type: EvidencePendingActionType;
  bulletKey: string;
  label: string;
};

export type EvidenceQueueSummary = {
  removeCount: number;
  addCount: number;
  excludeCount: number;
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

  const summaryLines: string[] = [];
  if (removeCount > 0) {
    summaryLines.push(`Remove ${removeCount} bullet${removeCount === 1 ? "" : "s"} from draft`);
  }
  if (addCount > 0) {
    summaryLines.push(`Add ${addCount} evidence item${addCount === 1 ? "" : "s"} to draft`);
  }
  if (excludeCount > 0) {
    summaryLines.push(
      `Exclude ${excludeCount} item${excludeCount === 1 ? "" : "s"} from future generation`,
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
