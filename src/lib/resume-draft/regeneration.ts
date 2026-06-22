import {
  MAX_BULLETS_PER_ROLE,
  MAX_WORK_EXPERIENCE_ROLES,
  TARGET_TOTAL_WORK_BULLETS_MAX,
} from "@/lib/resume-draft/generation-validation";
import { MAX_RESUME_DRAFT_BULLETS } from "@/lib/resume-draft/payload";
import type { ResumeDraftRegenerationControls } from "@/types/resume-draft";

export type RegenerationFeasibilityResult = {
  ok: boolean;
  warnings: string[];
  errors: string[];
};

export function assessRegenerationFeasibility(options: {
  regenerationControls?: ResumeDraftRegenerationControls;
  maxBullets?: number;
}): RegenerationFeasibilityResult {
  const maxBullets = options.maxBullets ?? MAX_RESUME_DRAFT_BULLETS;
  const forced = options.regenerationControls?.forcedBulletKeys ?? [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (forced.length > maxBullets) {
    errors.push(
      `Too many forced bullets (${forced.length}). Generation payload allows at most ${maxBullets}.`,
    );
  } else if (forced.length > TARGET_TOTAL_WORK_BULLETS_MAX) {
    warnings.push(
      `${forced.length} forced bullets may exceed the one-page target (${TARGET_TOTAL_WORK_BULLETS_MAX} work experience bullets). Generation may fail validation or require heavy compression.`,
    );
  }

  if (forced.length > MAX_WORK_EXPERIENCE_ROLES * MAX_BULLETS_PER_ROLE) {
    warnings.push(
      `Forced bullets exceed typical role density (${MAX_WORK_EXPERIENCE_ROLES} roles × ${MAX_BULLETS_PER_ROLE} bullets). Expect aggressive omission during generation.`,
    );
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
  };
}

export function collectBulletKeysFromDraftSourceRefs(
  experience: Array<{ bullets: Array<{ sourceRefs: Array<{ bulletKey?: string }> }> }>,
): string[] {
  const keys = new Set<string>();
  for (const section of experience) {
    for (const bullet of section.bullets) {
      for (const ref of bullet.sourceRefs) {
        if (ref.bulletKey?.trim()) {
          keys.add(ref.bulletKey);
        }
      }
    }
  }
  return [...keys];
}
