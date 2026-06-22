import { experienceKey } from "@/lib/inventory/normalize";
import type { CollatedBulletListing } from "@/lib/inventory/edits";
import {
  MAX_BULLETS_PER_ROLE,
  MIN_BULLETS_PER_ROLE,
} from "@/lib/resume-draft/generation-validation";
import {
  collectForcedKeysFromBullets,
  normalizeForcedBulletKeys,
} from "@/lib/resume-draft/forced-bullets";
import type { ResumeDraftBulletInput } from "@/types/resume-draft";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftExperienceSection,
} from "@/types/resume-draft";
import {
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
  RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
} from "@/lib/resume-draft/draft-status";

export const TARGETED_REWRITE_BLOCKED_MESSAGE =
  "This bullet belongs to a role not currently in Work Experience. Use full regeneration to restructure the resume.";

export type TargetedRoleRewriteInventoryBullet = {
  bulletKey: string;
  collatedBulletId?: string;
  description: string;
  keyword?: string;
  acceptedWording?: string;
  company: string;
  role: string;
};

export type TargetedRoleRewritePlanItem = {
  roleIndex: number;
  company: string;
  role: string;
  forcedBulletKeys: string[];
  currentRole: ResumeDraftExperienceSection;
  inventoryBullets: TargetedRoleRewriteInventoryBullet[];
  allowedSourceBulletKeys: string[];
};

export type TargetedForcedBulletRewritePlan =
  | { mode: "none" }
  | {
      mode: "blocked";
      message: string;
      absentRoleBulletKeys: string[];
      ambiguousRoleBulletKeys: string[];
    }
  | {
      mode: "targeted";
      roles: TargetedRoleRewritePlanItem[];
    };

export type TargetedRewriteOutcomeSummary = {
  lines: string[];
  affectedRoleLabels: string[];
  forcedIncludedCount: number;
  unchangedRoleCount: number;
};

export class TargetedRoleRewriteValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.name = "TargetedRoleRewriteValidationError";
    this.issues = issues;
  }
}

function findWorkExperienceIndexForRole(
  experiences: readonly ResumeDraftExperienceSection[],
  company: string,
  role: string,
): { index: number | null; ambiguous: boolean } {
  const targetKey = experienceKey(company, role);
  const matches = experiences
    .map((experience, index) => ({
      index,
      key: experienceKey(experience.company, experience.role),
    }))
    .filter((entry) => entry.key === targetKey);

  if (matches.length === 1) {
    return { index: matches[0]!.index, ambiguous: false };
  }
  if (matches.length > 1) {
    return { index: null, ambiguous: true };
  }
  return { index: null, ambiguous: false };
}

function collectRoleSourceKeys(role: ResumeDraftExperienceSection): string[] {
  const keys = new Set<string>();
  for (const bullet of role.bullets) {
    for (const ref of bullet.sourceRefs) {
      const key = ref.bulletKey?.trim();
      if (key) {
        keys.add(key);
      }
    }
  }
  return [...keys];
}

export function planTargetedForcedBulletRewrite(options: {
  content: ResumeDraftContent;
  forcedBulletKeys: readonly string[];
  inventoryListings: readonly CollatedBulletListing[];
}): TargetedForcedBulletRewritePlan {
  const forcedKeys = normalizeForcedBulletKeys(options.forcedBulletKeys);
  if (forcedKeys.length === 0) {
    return { mode: "none" };
  }

  const listingByKey = new Map(
    options.inventoryListings.map((listing) => [listing.bulletKey, listing]),
  );
  const absentRoleBulletKeys: string[] = [];
  const ambiguousRoleBulletKeys: string[] = [];
  const grouped = new Map<number, TargetedRoleRewritePlanItem>();

  for (const forcedKey of forcedKeys) {
    const listing = listingByKey.get(forcedKey);
    if (!listing || listing.isHidden) {
      absentRoleBulletKeys.push(forcedKey);
      continue;
    }

    const match = findWorkExperienceIndexForRole(
      options.content.experience,
      listing.experience.company,
      listing.experience.role,
    );

    if (match.ambiguous) {
      ambiguousRoleBulletKeys.push(forcedKey);
      continue;
    }
    if (match.index === null) {
      absentRoleBulletKeys.push(forcedKey);
      continue;
    }

    const roleIndex = match.index;
    const currentRole = options.content.experience[roleIndex]!;
    const existing = grouped.get(roleIndex);

    const inventoryBullet: TargetedRoleRewriteInventoryBullet = {
      bulletKey: listing.bulletKey,
      collatedBulletId: listing.bullet.id,
      description: listing.effectiveDescription,
      keyword: listing.bullet.keyword,
      acceptedWording: listing.editedText,
      company: listing.experience.company,
      role: listing.experience.role,
    };

    if (existing) {
      if (!existing.forcedBulletKeys.includes(forcedKey)) {
        existing.forcedBulletKeys.push(forcedKey);
      }
      if (!existing.inventoryBullets.some((bullet) => bullet.bulletKey === forcedKey)) {
        existing.inventoryBullets.push(inventoryBullet);
      }
      existing.allowedSourceBulletKeys = [
        ...new Set([...existing.allowedSourceBulletKeys, forcedKey]),
      ];
      continue;
    }

    const allowedSourceBulletKeys = [
      ...new Set([
        ...collectRoleSourceKeys(currentRole),
        ...options.inventoryListings
          .filter(
            (listing) =>
              experienceKey(listing.experience.company, listing.experience.role) ===
              experienceKey(currentRole.company, currentRole.role),
          )
          .map((listing) => listing.bulletKey),
        forcedKey,
      ]),
    ];

    grouped.set(roleIndex, {
      roleIndex,
      company: currentRole.company,
      role: currentRole.role,
      forcedBulletKeys: [forcedKey],
      currentRole,
      inventoryBullets: [inventoryBullet],
      allowedSourceBulletKeys,
    });
  }

  if (absentRoleBulletKeys.length > 0 || ambiguousRoleBulletKeys.length > 0) {
    return {
      mode: "blocked",
      message: TARGETED_REWRITE_BLOCKED_MESSAGE,
      absentRoleBulletKeys,
      ambiguousRoleBulletKeys,
    };
  }

  return {
    mode: "targeted",
    roles: [...grouped.values()].sort((a, b) => a.roleIndex - b.roleIndex),
  };
}

export function validateRewrittenRoleBullets(options: {
  bullets: readonly ResumeDraftExperienceBullet[];
  forcedBulletKeys: readonly string[];
  allowedSourceBulletKeys: readonly string[];
}): string[] {
  const issues: string[] = [];
  const forcedSet = new Set(normalizeForcedBulletKeys(options.forcedBulletKeys));
  const allowedSet = new Set(options.allowedSourceBulletKeys);

  if (options.bullets.length < MIN_BULLETS_PER_ROLE) {
    issues.push(
      `Role must have at least ${MIN_BULLETS_PER_ROLE} bullets (found ${options.bullets.length}).`,
    );
  }
  if (options.bullets.length > MAX_BULLETS_PER_ROLE) {
    issues.push(
      `Role must have at most ${MAX_BULLETS_PER_ROLE} bullets (found ${options.bullets.length}).`,
    );
  }

  for (const [index, bullet] of options.bullets.entries()) {
    if (!bullet.text.trim()) {
      issues.push(`Bullet ${index + 1} is empty.`);
    }
    if (bullet.sourceRefs.length === 0) {
      issues.push(`Bullet ${index + 1} is missing sourceRefs.`);
    }
    for (const ref of bullet.sourceRefs) {
      const key = ref.bulletKey?.trim();
      if (key && !allowedSet.has(key)) {
        issues.push(`Bullet ${index + 1} references unsupported bulletKey "${key}".`);
      }
    }
  }

  for (const forcedKey of forcedSet) {
    const present = collectForcedKeysFromBullets(options.bullets, [forcedKey]);
    if (present.length === 0) {
      issues.push(`Forced bullet "${forcedKey.slice(0, 48)}" missing from rewritten role.`);
    }
  }

  return issues;
}

export function applyTargetedRoleRewrites(
  content: ResumeDraftContent,
  rewrites: ReadonlyArray<{ roleIndex: number; bullets: ResumeDraftExperienceBullet[] }>,
): ResumeDraftContent {
  const rewriteByIndex = new Map(rewrites.map((entry) => [entry.roleIndex, entry.bullets]));

  return {
    ...content,
    experience: content.experience.map((role, index) => {
      const bullets = rewriteByIndex.get(index);
      if (!bullets) {
        return role;
      }
      return {
        ...role,
        bullets,
      };
    }),
    serverPdfValidation: undefined,
  };
}

export function resolveDraftStatusAfterTargetedRewrite(currentStatus: string): string {
  if (
    isApprovedDraftStatus(currentStatus) ||
    isLayoutChangedAfterApprovalStatus(currentStatus)
  ) {
    return RESUME_DRAFT_STATUS_LAYOUT_CHANGED;
  }
  return currentStatus;
}

export function buildTargetedRewriteOutcomeSummary(options: {
  priorContent: ResumeDraftContent;
  newContent: ResumeDraftContent;
  plan: Extract<TargetedForcedBulletRewritePlan, { mode: "targeted" }>;
}): TargetedRewriteOutcomeSummary {
  const affectedRoleLabels = options.plan.roles.map(
    (role) => `${role.company} · ${role.role}`,
  );
  const forcedIncludedCount = collectForcedKeysFromBullets(
    options.newContent.experience.flatMap((role) => role.bullets),
    options.plan.roles.flatMap((role) => role.forcedBulletKeys),
  ).length;
  const unchangedRoleCount =
    options.priorContent.experience.length - options.plan.roles.length;

  const lines = [
    `Targeted update applied to ${options.plan.roles.length} role(s): ${affectedRoleLabels.join(", ")}.`,
    `${forcedIncludedCount} forced bullet(s) included in updated role(s).`,
    `${unchangedRoleCount} other Work Experience role(s) preserved unchanged.`,
  ];

  if (
    options.plan.roles.some((role) => role.forcedBulletKeys.length > MAX_BULLETS_PER_ROLE)
  ) {
    lines.push(
      "More than four forced bullets were requested for a role — review bullet density before export.",
    );
  }

  return {
    lines,
    affectedRoleLabels,
    forcedIncludedCount,
    unchangedRoleCount,
  };
}

export function toRoleRewriteBulletInputs(
  bullets: readonly TargetedRoleRewriteInventoryBullet[],
): ResumeDraftBulletInput[] {
  return bullets.map((bullet) => ({
    bulletKey: bullet.bulletKey,
    collatedBulletId: bullet.collatedBulletId ?? bullet.bulletKey,
    company: bullet.company,
    role: bullet.role,
    dateRange: undefined,
    keyword: bullet.keyword,
    description: bullet.description,
    rawTexts: [bullet.description],
    acceptedWording: bullet.acceptedWording,
    sourceCitations: [],
  }));
}
