import { experienceKey, normalizeItemText } from "@/lib/inventory/normalize";
import {
  combineProjectBulletDescriptions,
  isProjectLikeOverlayExperience,
  listOverlayBulletsForExperience,
  resolveProjectNameFromOverlayExperience,
} from "@/lib/inventory-text-extraction/project-guard";
import type {
  InventoryAddedBullet,
  InventoryAddedExperience,
  InventoryEdits,
} from "@/types/inventory-edits";

export type ProjectOverlayAuditItem = {
  experienceId: string;
  company: string;
  role: string;
  descriptor?: string;
  dateRange?: string;
  location?: string;
  bullets: InventoryAddedBullet[];
  proposedAdditionalExperienceLine: string;
  experienceKey: string;
};

function createOverlayId(): string {
  return crypto.randomUUID();
}

export function buildProjectOverlayRepairProposal(
  experience: InventoryAddedExperience,
  bullets: InventoryAddedBullet[],
): string {
  const projectName = resolveProjectNameFromOverlayExperience(experience);
  return combineProjectBulletDescriptions(projectName, [
    experience.descriptor ?? "",
    ...bullets.map((bullet) => bullet.description),
  ]);
}

function isDismissedOrKept(
  edits: InventoryEdits,
  experienceId: string,
): boolean {
  const dismissed = edits.dismissedProjectOverlayCleanupIds ?? [];
  const kept = edits.keptProjectLikeWorkExperienceIds ?? [];
  return dismissed.includes(experienceId) || kept.includes(experienceId);
}

export function auditProjectLikeOverlayPollution(
  edits: InventoryEdits,
): ProjectOverlayAuditItem[] {
  const items: ProjectOverlayAuditItem[] = [];

  for (const experience of edits.addedExperiences ?? []) {
    if (!isProjectLikeOverlayExperience(experience.company, experience.role, experience.descriptor)) {
      continue;
    }
    if (isDismissedOrKept(edits, experience.id)) {
      continue;
    }

    const bullets = listOverlayBulletsForExperience(edits, experience.company, experience.role);
    items.push({
      experienceId: experience.id,
      company: experience.company,
      role: experience.role,
      descriptor: experience.descriptor,
      dateRange: experience.dateRange,
      location: experience.location,
      bullets,
      proposedAdditionalExperienceLine: buildProjectOverlayRepairProposal(experience, bullets),
      experienceKey: experienceKey(experience.company, experience.role),
    });
  }

  return items;
}

function additionalLineAlreadyExists(edits: InventoryEdits, line: string): boolean {
  const target = normalizeItemText(line);
  return (edits.addedAdditionalExperienceItems ?? []).some(
    (item) => normalizeItemText(item.text) === target,
  );
}

export function moveProjectOverlayToAdditionalExperience(
  edits: InventoryEdits,
  experienceId: string,
): InventoryEdits {
  const experience = (edits.addedExperiences ?? []).find((item) => item.id === experienceId);
  if (!experience) {
    return edits;
  }
  if (
    !isProjectLikeOverlayExperience(experience.company, experience.role, experience.descriptor)
  ) {
    return edits;
  }

  const bullets = listOverlayBulletsForExperience(edits, experience.company, experience.role);
  const line = buildProjectOverlayRepairProposal(experience, bullets);
  const key = experienceKey(experience.company, experience.role);

  const addedAdditionalExperienceItems = [...(edits.addedAdditionalExperienceItems ?? [])];
  if (!additionalLineAlreadyExists(edits, line)) {
    addedAdditionalExperienceItems.push({
      id: createOverlayId(),
      text: line,
      category: "Projects",
      addedAt: new Date().toISOString(),
    });
  }

  const addedExperiences = (edits.addedExperiences ?? []).filter((item) => item.id !== experienceId);
  const addedBulletsByExperienceKey = { ...(edits.addedBulletsByExperienceKey ?? {}) };
  delete addedBulletsByExperienceKey[key];

  return {
    ...edits,
    addedExperiences,
    addedBulletsByExperienceKey,
    addedAdditionalExperienceItems,
    projectInventoryCleanupAt: new Date().toISOString(),
  };
}

export function keepProjectOverlayAsWorkExperience(
  edits: InventoryEdits,
  experienceId: string,
): InventoryEdits {
  const kept = new Set(edits.keptProjectLikeWorkExperienceIds ?? []);
  kept.add(experienceId);
  return {
    ...edits,
    keptProjectLikeWorkExperienceIds: [...kept],
  };
}

export function dismissProjectOverlayCleanup(
  edits: InventoryEdits,
  experienceId: string,
): InventoryEdits {
  const dismissed = new Set(edits.dismissedProjectOverlayCleanupIds ?? []);
  dismissed.add(experienceId);
  return {
    ...edits,
    dismissedProjectOverlayCleanupIds: [...dismissed],
  };
}

export function migrateAllProjectLikeOverlayExperiences(edits: InventoryEdits): InventoryEdits {
  let next = edits;
  for (const item of auditProjectLikeOverlayPollution(edits)) {
    next = moveProjectOverlayToAdditionalExperience(next, item.experienceId);
  }
  return next;
}

export function hasPendingProjectOverlayCleanup(edits: InventoryEdits): boolean {
  return auditProjectLikeOverlayPollution(edits).length > 0;
}

export const REGENERATE_AFTER_PROJECT_CLEANUP_MESSAGE =
  "Existing generated drafts may still include old Work Experience placement. Regenerate to use cleaned inventory.";
