import { getDateRangeEndSortKey } from "@/lib/date/duration";
import {
  countJdTermOverlap,
  extractJdMatchTerms,
} from "@/lib/resume-draft/bullet-payload";
import {
  bulletReferencesForcedKey,
  collectForcedKeysFromBullets,
  collectForcedKeysPresentInOutput,
  normalizeForcedBulletKeys,
} from "@/lib/resume-draft/forced-bullets";
import {
  MAX_BULLETS_PER_ROLE,
  MAX_WORK_EXPERIENCE_ROLES,
  MIN_BULLETS_PER_ROLE,
  TARGET_TOTAL_WORK_BULLETS_MAX,
  TARGET_TOTAL_WORK_BULLETS_MIN,
} from "@/lib/resume-draft/generation-validation";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftExperienceSection,
} from "@/types/resume-draft";

export const RESUME_STRUCTURE_NEEDS_REVIEW_FLAG = "resume_structure_needs_review";

export type ResumeRepairAction =
  | "dropped_excess_role"
  | "trimmed_role_bullets"
  | "trimmed_total_bullets"
  | "moved_role_to_additional_experience"
  | "stripped_professional_summary"
  | "allowed_underfilled_work_experience"
  | "marked_needs_review"
  | "protected_forced_bullet"
  | "forced_bullet_removed_during_repair";

export type RepairGeneratedResumeContext = {
  jdText?: string;
  targetRoleTitle?: string;
  /** Inventory bullet keys the user forced — never trim these before non-forced bullets. */
  forcedBulletKeys?: readonly string[];
  unavailableForcedKeys?: readonly string[];
  excludedBulletKeys?: readonly string[];
  hiddenBulletKeys?: readonly string[];
  alreadyInPayloadKeys?: readonly string[];
};

export type RepairGeneratedResumeResult = {
  content: ResumeDraftContent;
  warnings: string[];
  repairActions: ResumeRepairAction[];
  repairMessages: string[];
  needsReview: boolean;
  forcedBulletsRemovedDuringRepair: string[];
  unableToPreserveForcedBullets: string[];
};

function scoreGeneratedBullet(
  bullet: ResumeDraftExperienceBullet,
  jdTerms: readonly string[],
): number {
  let score = 0;

  if (bullet.sourceRefs.length > 0) {
    score += 100;
  }

  score += countJdTermOverlap(bullet.text, jdTerms) * 10;

  if (bullet.jdAlignmentReason?.trim()) {
    score += countJdTermOverlap(bullet.jdAlignmentReason, jdTerms) * 5;
  }

  if (/\d/.test(bullet.text)) {
    score += 15;
  }

  if (bullet.confidence === "high") {
    score += 8;
  } else if (bullet.confidence === "medium") {
    score += 4;
  }

  return score;
}

function scoreGeneratedRole(
  role: ResumeDraftExperienceSection,
  jdTerms: readonly string[],
  referenceDate = new Date(),
): number {
  const roleText = `${role.company} ${role.role} ${role.companyDescriptor ?? ""}`;
  let score = countJdTermOverlap(roleText, jdTerms) * 20;

  const endSort = getDateRangeEndSortKey(role.dateRange, referenceDate);
  if (endSort.hasDate) {
    score += Math.min(endSort.sortKey / 1_000_000, 50);
  }

  const bulletScores = role.bullets.map((bullet) => scoreGeneratedBullet(bullet, jdTerms));
  if (bulletScores.length > 0) {
    score += Math.max(...bulletScores) * 2;
    score += bulletScores.reduce((total, value) => total + value, 0) / bulletScores.length;
  }

  return score;
}

function sortBulletsByRelevance(
  bullets: readonly ResumeDraftExperienceBullet[],
  jdTerms: readonly string[],
): ResumeDraftExperienceBullet[] {
  return [...bullets]
    .map((bullet, index) => ({
      bullet,
      index,
      score: scoreGeneratedBullet(bullet, jdTerms),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.bullet);
}

function roleToAdditionalExperienceItem(
  role: ResumeDraftExperienceSection,
): ResumeDraftContent["additionalExperience"][number] {
  const bullets = role.bullets.map((bullet) => bullet.text.trim()).filter(Boolean);
  const detailParts = [role.role, role.dateRange?.trim(), bullets.slice(0, 2).join("; ")]
    .filter(Boolean)
    .join(" — ");

  return {
    text: `${role.company}: ${detailParts}`,
    riskFlags: ["Auto-repair: role moved from Work Experience"],
  };
}

function trimRoleBulletsToMax(
  role: ResumeDraftExperienceSection,
  jdTerms: readonly string[],
  maxBullets: number,
  forcedKeys: ReadonlySet<string>,
): {
  role: ResumeDraftExperienceSection;
  trimmedCount: number;
  removedForcedKeys: string[];
  unableToPreserveForcedKeys: string[];
} {
  if (role.bullets.length <= maxBullets) {
    return { role, trimmedCount: 0, removedForcedKeys: [], unableToPreserveForcedKeys: [] };
  }

  // Keep user-forced bullets first; only non-forced bullets are candidates for removal.
  const forcedBullets = role.bullets.filter((bullet) => bulletReferencesForcedKey(bullet, forcedKeys));
  const nonForcedBullets = role.bullets.filter(
    (bullet) => !bulletReferencesForcedKey(bullet, forcedKeys),
  );
  const rankedNonForced = sortBulletsByRelevance(nonForcedBullets, jdTerms);
  const remainingSlots = Math.max(0, maxBullets - forcedBullets.length);
  const keptNonForced = rankedNonForced.slice(0, remainingSlots);
  const kept = [...forcedBullets, ...keptNonForced];

  const keptForcedKeys = new Set(collectForcedKeysFromBullets(kept, [...forcedKeys]));
  const removedForcedKeys = collectForcedKeysFromBullets(role.bullets, [...forcedKeys]).filter(
    (key) => !keptForcedKeys.has(key),
  );
  const unableToPreserveForcedKeys =
    forcedBullets.length > maxBullets
      ? collectForcedKeysFromBullets(forcedBullets.slice(maxBullets), [...forcedKeys])
      : [];

  return {
    role: { ...role, bullets: kept },
    trimmedCount: role.bullets.length - kept.length,
    removedForcedKeys,
    unableToPreserveForcedKeys,
  };
}

function trimTotalBulletsToMax(
  experience: ResumeDraftExperienceSection[],
  jdTerms: readonly string[],
  maxTotal: number,
  forcedKeys: ReadonlySet<string>,
): {
  experience: ResumeDraftExperienceSection[];
  trimmedCount: number;
  removedForcedKeys: string[];
} {
  const roles = experience.map((role) => ({ ...role, bullets: [...role.bullets] }));
  let trimmedCount = 0;
  const removedForcedKeys = new Set<string>();

  const countTotal = () => roles.reduce((total, role) => total + role.bullets.length, 0);

  while (countTotal() > maxTotal) {
    let candidate: { roleIndex: number; bulletIndex: number; score: number } | null = null;

    for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
      const role = roles[roleIndex];
      if (role.bullets.length <= MIN_BULLETS_PER_ROLE) {
        continue;
      }

      for (let bulletIndex = 0; bulletIndex < role.bullets.length; bulletIndex += 1) {
        const bullet = role.bullets[bulletIndex];
        if (bulletReferencesForcedKey(bullet, forcedKeys)) {
          continue;
        }

        const score = scoreGeneratedBullet(bullet, jdTerms);
        if (!candidate || score < candidate.score) {
          candidate = { roleIndex, bulletIndex, score };
        }
      }
    }

    if (!candidate) {
      break;
    }

    const removedBullet = roles[candidate.roleIndex].bullets[candidate.bulletIndex];
    for (const ref of removedBullet.sourceRefs) {
      const key = ref.bulletKey?.trim();
      if (key && forcedKeys.has(key)) {
        removedForcedKeys.add(key);
      }
    }

    roles[candidate.roleIndex].bullets.splice(candidate.bulletIndex, 1);
    trimmedCount += 1;
  }

  return { experience: roles, trimmedCount, removedForcedKeys: [...removedForcedKeys] };
}

function roleContainsForcedBullet(
  role: ResumeDraftExperienceSection,
  forcedKeys: ReadonlySet<string>,
): boolean {
  return role.bullets.some((bullet) => bulletReferencesForcedKey(bullet, forcedKeys));
}

export function repairGeneratedResumeContent(
  content: ResumeDraftContent,
  context: RepairGeneratedResumeContext = {},
): RepairGeneratedResumeResult {
  const jdTerms = extractJdMatchTerms(
    [context.jdText, context.targetRoleTitle].filter(Boolean).join(" "),
  );
  const forcedKeys = new Set(normalizeForcedBulletKeys(context.forcedBulletKeys));
  const keysBeforeRepair = collectForcedKeysPresentInOutput(content, [...forcedKeys]);

  const repairActions: ResumeRepairAction[] = [];
  const repairMessages: string[] = [];
  const warnings: string[] = [];
  const forcedBulletsRemovedDuringRepair = new Set<string>();
  const unableToPreserveForcedBullets = new Set<string>();
  let needsReview = false;

  let experience = content.experience.map((role) => ({
    ...role,
    bullets: [...role.bullets],
  }));
  const additionalExperience = [...content.additionalExperience];
  let professionalSummary = { ...content.professionalSummary };

  if (professionalSummary.text.trim()) {
    professionalSummary = { ...professionalSummary, text: "" };
    repairActions.push("stripped_professional_summary");
    repairMessages.push("Removed Professional Summary content (not used on one-page resumes).");
  }

  if (experience.length > MAX_WORK_EXPERIENCE_ROLES) {
    const ranked = experience
      .map((role, index) => ({
        role,
        index,
        score:
          scoreGeneratedRole(role, jdTerms) +
          (roleContainsForcedBullet(role, forcedKeys) ? 10_000 : 0),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.index - b.index;
      });

    const kept = ranked.slice(0, MAX_WORK_EXPERIENCE_ROLES).sort((a, b) => a.index - b.index);
    const dropped = ranked.slice(MAX_WORK_EXPERIENCE_ROLES);

    experience = kept.map((entry) => entry.role);
    for (const entry of dropped) {
      additionalExperience.push(roleToAdditionalExperienceItem(entry.role));
      for (const key of collectForcedKeysFromBullets(entry.role.bullets, [...forcedKeys])) {
        forcedBulletsRemovedDuringRepair.add(key);
        unableToPreserveForcedBullets.add(key);
      }
    }

    repairActions.push("dropped_excess_role", "moved_role_to_additional_experience");
    repairMessages.push(
      `Reduced Work Experience from ${ranked.length} roles to ${MAX_WORK_EXPERIENCE_ROLES}`,
    );
    for (const entry of dropped) {
      repairMessages.push(
        `Moved ${entry.role.company} (${entry.role.role}) to Additional Experience`,
      );
    }
  }

  experience = experience.map((role) => {
    const { role: trimmedRole, trimmedCount, removedForcedKeys, unableToPreserveForcedKeys } =
      trimRoleBulletsToMax(role, jdTerms, MAX_BULLETS_PER_ROLE, forcedKeys);
    if (trimmedCount > 0) {
      repairActions.push("trimmed_role_bullets");
      repairMessages.push(
        `Trimmed ${role.company} from ${role.bullets.length} bullets to ${trimmedRole.bullets.length}`,
      );
    }
    for (const key of removedForcedKeys) {
      forcedBulletsRemovedDuringRepair.add(key);
      repairActions.push("forced_bullet_removed_during_repair");
      repairMessages.push(`Forced bullet removed while trimming ${role.company}: ${key}`);
    }
    for (const key of unableToPreserveForcedKeys) {
      unableToPreserveForcedBullets.add(key);
      repairActions.push("forced_bullet_removed_during_repair");
      repairMessages.push(
        `Could not preserve forced bullet within ${MAX_BULLETS_PER_ROLE}-bullet role limit: ${key}`,
      );
    }
    if (roleContainsForcedBullet(trimmedRole, forcedKeys) && trimmedCount > 0) {
      repairActions.push("protected_forced_bullet");
    }
    return trimmedRole;
  });

  const totalBeforeTrim = experience.reduce((total, role) => total + role.bullets.length, 0);
  if (totalBeforeTrim > TARGET_TOTAL_WORK_BULLETS_MAX) {
    const { experience: trimmedExperience, trimmedCount, removedForcedKeys } =
      trimTotalBulletsToMax(experience, jdTerms, TARGET_TOTAL_WORK_BULLETS_MAX, forcedKeys);
    experience = trimmedExperience;
    if (trimmedCount > 0) {
      repairActions.push("trimmed_total_bullets");
      repairMessages.push(
        `Reduced total Work Experience bullets from ${totalBeforeTrim} to ${experience.reduce(
          (total, role) => total + role.bullets.length,
          0,
        )}`,
      );
    }
    for (const key of removedForcedKeys) {
      forcedBulletsRemovedDuringRepair.add(key);
      repairActions.push("forced_bullet_removed_during_repair");
      repairMessages.push(`Forced bullet removed while trimming total bullets: ${key}`);
    }
    if (forcedKeys.size > 0 && trimmedCount > 0) {
      repairActions.push("protected_forced_bullet");
    }
  }

  for (const key of keysBeforeRepair) {
    const keysAfterRepair = collectForcedKeysPresentInOutput(
      { ...content, experience },
      [...forcedKeys],
    );
    if (!keysAfterRepair.includes(key)) {
      forcedBulletsRemovedDuringRepair.add(key);
    }
  }

  const totalBullets = experience.reduce((total, role) => total + role.bullets.length, 0);
  if (totalBullets < TARGET_TOTAL_WORK_BULLETS_MIN) {
    repairActions.push("allowed_underfilled_work_experience");
    warnings.push(
      `Work Experience has ${totalBullets} bullets (target ${TARGET_TOTAL_WORK_BULLETS_MIN}–${TARGET_TOTAL_WORK_BULLETS_MAX}). Draft saved with warning.`,
    );
  }

  for (const role of experience) {
    if (
      role.bullets.length < MIN_BULLETS_PER_ROLE ||
      role.bullets.length > MAX_BULLETS_PER_ROLE
    ) {
      needsReview = true;
      repairActions.push("marked_needs_review");
      warnings.push(
        `Role "${role.company}" has ${role.bullets.length} bullets after repair (target ${MIN_BULLETS_PER_ROLE}–${MAX_BULLETS_PER_ROLE}).`,
      );
    }
  }

  if (totalBullets > TARGET_TOTAL_WORK_BULLETS_MAX) {
    needsReview = true;
    repairActions.push("marked_needs_review");
    warnings.push(
      `Total Work Experience bullets (${totalBullets}) still exceeds target max ${TARGET_TOTAL_WORK_BULLETS_MAX} after repair.`,
    );
  }

  if (forcedBulletsRemovedDuringRepair.size > 0) {
    needsReview = true;
  }

  return {
    content: {
      ...content,
      professionalSummary,
      experience,
      additionalExperience,
    },
    warnings,
    repairActions: [...new Set(repairActions)],
    repairMessages,
    needsReview,
    forcedBulletsRemovedDuringRepair: [...forcedBulletsRemovedDuringRepair],
    unableToPreserveForcedBullets: [...unableToPreserveForcedBullets],
  };
}
