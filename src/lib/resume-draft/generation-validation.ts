import {
  additionalExperienceNeedsNormalization,
  normalizeAdditionalExperienceItems,
  parseAdditionalExperienceItemText,
} from "@/lib/resume-draft/additional-experience";
import {
  auditForcedBullets,
  normalizeForcedBulletKeys,
  validateForcedBulletsInOutput,
  type ForcedBulletAudit,
} from "@/lib/resume-draft/forced-bullets";
import {
  repairGeneratedResumeContent,
  RESUME_STRUCTURE_NEEDS_REVIEW_FLAG,
  type RepairGeneratedResumeContext,
  type ResumeRepairAction,
} from "@/lib/resume-draft/repair-generated-content";
import { extractJdMatchTerms } from "@/lib/resume-draft/bullet-payload";
import { validateTailoringQuality } from "@/lib/resume-draft/tailoring-quality";
import { RESUME_DRAFT_STATUS_NEEDS_REVIEW } from "@/lib/resume-draft/draft-status";
import type { ResumeDraftContent, ResumeDraftRationale } from "@/types/resume-draft";

export const MAX_WORK_EXPERIENCE_ROLES = 4;
export const MIN_BULLETS_PER_ROLE = 2;
export const MAX_BULLETS_PER_ROLE = 4;
export const TARGET_TOTAL_WORK_BULLETS_MIN = 12;
export const TARGET_TOTAL_WORK_BULLETS_MAX = 13;

export const REQUIRED_SKILL_GROUP_LABELS = ["Skills", "Languages", "Interests"] as const;

export type GenerationValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type GenerationValidationResult = {
  ok: boolean;
  errors: GenerationValidationIssue[];
  warnings: GenerationValidationIssue[];
};

export const HARD_BLOCK_VALIDATION_CODES = new Set([
  "no_work_experience",
  "skills_group_missing",
  "additional_experience_format",
]);

/** Repairable structure issues — downgraded to warnings when auto-repair ran. */
export const SOFT_STRUCTURE_VALIDATION_CODES = new Set([
  "too_many_roles",
  "role_bullet_count",
  "professional_summary_present",
  "total_bullet_count",
]);

export class ResumeDraftValidationError extends Error {
  readonly issues: GenerationValidationIssue[];

  constructor(message: string, issues: GenerationValidationIssue[]) {
    super(message);
    this.name = "ResumeDraftValidationError";
    this.issues = issues;
  }
}

function issue(
  code: string,
  message: string,
  severity: GenerationValidationIssue["severity"],
): GenerationValidationIssue {
  return { code, message, severity };
}

function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeGeneratedResumeContent(
  content: ResumeDraftContent,
): ResumeDraftContent {
  return {
    ...content,
    additionalExperience: normalizeAdditionalExperienceItems(content.additionalExperience),
  };
}

export function validateGeneratedResumeContent(
  content: ResumeDraftContent,
): GenerationValidationResult {
  const errors: GenerationValidationIssue[] = [];
  const warnings: GenerationValidationIssue[] = [];

  if (content.experience.length === 0) {
    errors.push(
      issue(
        "no_work_experience",
        "Resume draft must include at least one Work Experience role.",
        "error",
      ),
    );
  }

  if (content.professionalSummary.text.trim()) {
    errors.push(
      issue(
        "professional_summary_present",
        "Resume drafts must not include Professional Summary content.",
        "error",
      ),
    );
  }

  if (content.experience.length > MAX_WORK_EXPERIENCE_ROLES) {
    errors.push(
      issue(
        "too_many_roles",
        `Work Experience must include at most ${MAX_WORK_EXPERIENCE_ROLES} roles (found ${content.experience.length}).`,
        "error",
      ),
    );
  }

  let totalBullets = 0;
  for (const role of content.experience) {
    const bulletCount = role.bullets.length;
    totalBullets += bulletCount;

    if (bulletCount < MIN_BULLETS_PER_ROLE || bulletCount > MAX_BULLETS_PER_ROLE) {
      errors.push(
        issue(
          "role_bullet_count",
          `Role "${role.company}" must have ${MIN_BULLETS_PER_ROLE}–${MAX_BULLETS_PER_ROLE} bullets (found ${bulletCount}).`,
          "error",
        ),
      );
    }

    for (const bullet of role.bullets) {
      if (bullet.sourceRefs.length === 0) {
        warnings.push(
          issue(
            "missing_source_refs",
            `Bullet "${bullet.text.slice(0, 48)}..." has no sourceRefs.`,
            "warning",
          ),
        );
      }
    }
  }

  if (
    totalBullets < TARGET_TOTAL_WORK_BULLETS_MIN ||
    totalBullets > TARGET_TOTAL_WORK_BULLETS_MAX
  ) {
    warnings.push(
      issue(
        "total_bullet_count",
        `Target ${TARGET_TOTAL_WORK_BULLETS_MIN}–${TARGET_TOTAL_WORK_BULLETS_MAX} total Work Experience bullets (found ${totalBullets}).`,
        totalBullets > TARGET_TOTAL_WORK_BULLETS_MAX ? "error" : "warning",
      ),
    );
  }

  for (const item of content.additionalExperience) {
    const text = item.text.trim();
    if (!text) {
      continue;
    }

    if (!parseAdditionalExperienceItemText(text)) {
      errors.push(
        issue(
          "additional_experience_format",
          `Additional Experience could not be normalized to "Title: Detail" format (found "${text.slice(0, 60)}").`,
          "error",
        ),
      );
    }
  }

  const groupLabels = content.skills.groups.map((group) => group.label.trim());
  for (const requiredLabel of REQUIRED_SKILL_GROUP_LABELS) {
    if (!groupLabels.some((label) => label.toLowerCase() === requiredLabel.toLowerCase())) {
      errors.push(
        issue(
          "skills_group_missing",
          `Skills section must include a "${requiredLabel}" group.`,
          "error",
        ),
      );
    }
  }

  const workCompanies = content.experience.map((role) => normalizeCompanyName(role.company));
  const additionalText = content.additionalExperience.map((item) => item.text.toLowerCase()).join(" ");
  if (
    workCompanies.some((company) => company.includes("baycurrent")) &&
    additionalText.includes("baycurrent")
  ) {
    warnings.push(
      issue(
        "baycurrent_duplicate",
        "BayCurrent appears in both Work Experience and Additional Experience — only include in both when JD-relevant.",
        "warning",
      ),
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export type PreparedGeneratedResumeContent = {
  content: ResumeDraftContent;
  validation: GenerationValidationResult;
  repairActions: ResumeRepairAction[];
  repairMessages: string[];
  needsReview: boolean;
  draftStatus: string;
  forcedBulletAudit?: ForcedBulletAudit;
};

export type PrepareGeneratedResumeOptions = RepairGeneratedResumeContext & {
  rationale?: ResumeDraftRationale | null;
  sourceBulletTextsByKey?: ReadonlyMap<string, string>;
};

function downgradeSoftStructureErrors(
  validation: GenerationValidationResult,
): GenerationValidationResult {
  const errors: GenerationValidationIssue[] = [];
  const warnings = [...validation.warnings];

  for (const entry of validation.errors) {
    if (SOFT_STRUCTURE_VALIDATION_CODES.has(entry.code)) {
      warnings.push({ ...entry, severity: "warning" });
      continue;
    }
    errors.push(entry);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function buildStructureRepairSummary(messages: string[]): string {
  return `Resume generated with automatic structure repair:\n${messages.map((line) => `- ${line}`).join("\n")}`;
}

export function prepareGeneratedResumeContent(
  content: ResumeDraftContent,
  context: PrepareGeneratedResumeOptions = {},
): PreparedGeneratedResumeContent {
  const hadPlainAdditionalExperience = additionalExperienceNeedsNormalization(
    content.additionalExperience,
  );
  const normalized = normalizeGeneratedResumeContent(content);
  const repaired = repairGeneratedResumeContent(normalized, context);
  let validation = validateGeneratedResumeContent(repaired.content);
  const repairRan = repaired.repairActions.length > 0;
  const needsReview = repaired.needsReview || repairRan;
  const forcedKeys = normalizeForcedBulletKeys(context?.forcedBulletKeys);
  let forcedBulletAudit: ForcedBulletAudit | undefined;

  if (forcedKeys.length > 0) {
    forcedBulletAudit = auditForcedBullets({
      forcedKeys,
      unavailableKeys: context?.unavailableForcedKeys,
      excludedBulletKeys: context?.excludedBulletKeys,
      hiddenBulletKeys: context?.hiddenBulletKeys,
      alreadyInPayloadKeys: context?.alreadyInPayloadKeys,
      contentBeforeRepair: normalized,
      contentAfterRepair: repaired.content,
      removedDuringRepair: repaired.forcedBulletsRemovedDuringRepair,
      unableToPreserveDuringRepair: repaired.unableToPreserveForcedBullets,
    });

    for (const forcedIssue of validateForcedBulletsInOutput(forcedBulletAudit)) {
      validation.warnings.push(
        issue(forcedIssue.code, forcedIssue.message, forcedIssue.severity),
      );
    }
  }

  if (repairRan || repaired.needsReview) {
    validation = downgradeSoftStructureErrors(validation);
  }

  if (hadPlainAdditionalExperience) {
    validation.warnings.push(
      issue(
        "additional_experience_normalized",
        "Plain Additional Experience items were repaired into Title: Detail format.",
        "warning",
      ),
    );
  }

  for (const warning of repaired.warnings) {
    validation.warnings.push(issue("structure_repair_warning", warning, "warning"));
  }

  const jdTerms = extractJdMatchTerms(
    [context.jdText, context.targetRoleTitle].filter(Boolean).join(" "),
  );
  for (const tailoringIssue of validateTailoringQuality(repaired.content, {
    jdTerms,
    sourceBulletTextsByKey: context.sourceBulletTextsByKey,
    rationale: context.rationale,
  })) {
    validation.warnings.push(tailoringIssue);
  }

  if (repairRan) {
    validation.warnings.push(
      issue(
        "structure_repair_applied",
        buildStructureRepairSummary(repaired.repairMessages),
        "warning",
      ),
    );
  }

  if (needsReview) {
    validation.warnings.push(
      issue(
        "resume_structure_needs_review",
        "Resume structure was auto-repaired — review Work Experience density before export.",
        "warning",
      ),
    );
  }

  const riskFlags = new Set(repaired.content.globalRiskFlags);
  if (needsReview) {
    riskFlags.add(RESUME_STRUCTURE_NEEDS_REVIEW_FLAG);
  }
  if (repairRan) {
    riskFlags.add(buildStructureRepairSummary(repaired.repairMessages));
  }

  const mergedContent = mergeGenerationWarningsIntoContent(
    { ...repaired.content, globalRiskFlags: [...riskFlags] },
    validation.warnings,
  );

  return {
    content: mergedContent,
    validation,
    repairActions: repaired.repairActions,
    repairMessages: repaired.repairMessages,
    needsReview,
    draftStatus: needsReview ? RESUME_DRAFT_STATUS_NEEDS_REVIEW : "generated",
    forcedBulletAudit,
  };
}

export function getHardBlockValidationErrors(
  validation: GenerationValidationResult,
): GenerationValidationIssue[] {
  return validation.errors.filter((entry) => HARD_BLOCK_VALIDATION_CODES.has(entry.code));
}

export function assertGeneratedResumeContentValid(content: ResumeDraftContent): void {
  const { validation } = prepareGeneratedResumeContent(content);
  if (!validation.ok) {
    throw new ResumeDraftValidationError(
      validation.errors.map((entry) => entry.message).join(" "),
      validation.errors,
    );
  }
}

export function mergeGenerationWarningsIntoContent(
  content: ResumeDraftContent,
  warnings: GenerationValidationIssue[],
): ResumeDraftContent {
  if (warnings.length === 0) {
    return content;
  }

  const warningMessages = warnings.map((entry) => entry.message);
  return {
    ...content,
    globalRiskFlags: [...new Set([...content.globalRiskFlags, ...warningMessages])],
  };
}
