import type { InventoryState, ParsedResume } from "@/types/resume";
import type { InventoryEdits } from "@/types/inventory-edits";
import { createEmptyInventoryEdits } from "@/types/inventory-edits";
import { createEmptyEnrichmentState } from "@/lib/enrichment/state";
import { countSkillCategories } from "@/lib/parser/sections";

export type InventoryCounts = {
  resumes: number;
  workExperiences: number;
  workBullets: number;
  educationItems: number;
  skillCategories: number;
};

export type ResumeCounts = {
  workExperiences: number;
  workBullets: number;
  educationItems: number;
  skillCategories: number;
};

export function countWorkBullets(resume: ParsedResume): number {
  return resume.workExperiences.reduce(
    (total, experience) => total + experience.bullets.length,
    0,
  );
}

export function countResume(resume: ParsedResume): ResumeCounts {
  return {
    workExperiences: resume.workExperiences.length,
    workBullets: countWorkBullets(resume),
    educationItems: resume.education.length,
    skillCategories: countSkillCategories(resume.skills),
  };
}

export function countInventory(inventory: InventoryState): InventoryCounts {
  return {
    resumes: inventory.resumes.length,
    workExperiences: inventory.resumes.reduce(
      (total, resume) => total + resume.workExperiences.length,
      0,
    ),
    workBullets: inventory.resumes.reduce(
      (total, resume) => total + countWorkBullets(resume),
      0,
    ),
    educationItems: inventory.resumes.reduce(
      (total, resume) => total + resume.education.length,
      0,
    ),
    skillCategories: inventory.resumes.reduce(
      (total, resume) => total + countSkillCategories(resume.skills),
      0,
    ),
  };
}

/**
 * Add or replace a resume by filename (case-sensitive).
 * Replacing makes parser re-testing easy without accumulation.
 */
export function upsertResume(
  inventory: InventoryState,
  resume: ParsedResume,
): InventoryState {
  const existingIndex = inventory.resumes.findIndex(
    (entry) => entry.filename === resume.filename,
  );

  if (existingIndex >= 0) {
    const resumes = [...inventory.resumes];
    resumes[existingIndex] = resume;
    return { ...inventory, resumes };
  }

  return {
    ...inventory,
    resumes: [...inventory.resumes, resume],
  };
}

export function deleteResume(
  inventory: InventoryState,
  resumeId: string,
): InventoryState {
  return {
    ...inventory,
    resumes: inventory.resumes.filter((resume) => resume.id !== resumeId),
  };
}

export function clearAllResumes(): InventoryState {
  return {
    resumes: [],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
    edits: createEmptyInventoryEdits(),
  };
}

export function updateInventoryEdits(
  inventory: InventoryState,
  edits: InventoryEdits,
): InventoryState {
  return {
    ...inventory,
    edits,
  };
}
