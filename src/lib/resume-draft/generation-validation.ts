import {
  parseAdditionalExperienceItemText,
} from "@/lib/resume-draft/layout";
import type { ResumeDraftContent } from "@/types/resume-draft";

export const MAX_WORK_EXPERIENCE_ROLES = 4;
export const MIN_BULLETS_PER_ROLE = 2;
export const MAX_BULLETS_PER_ROLE = 4;
export const TARGET_TOTAL_WORK_BULLETS_MIN = 12;
export const TARGET_TOTAL_WORK_BULLETS_MAX = 13;

export const REQUIRED_SKILL_GROUP_LABELS = ["Tech", "Skills", "Languages", "Interests"] as const;

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

export function validateGeneratedResumeContent(
  content: ResumeDraftContent,
): GenerationValidationResult {
  const errors: GenerationValidationIssue[] = [];
  const warnings: GenerationValidationIssue[] = [];

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
        "warning",
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
          `Additional Experience item must use "Title: Detail" format (found "${text.slice(0, 60)}").`,
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

export function assertGeneratedResumeContentValid(content: ResumeDraftContent): void {
  const result = validateGeneratedResumeContent(content);
  if (!result.ok) {
    throw new ResumeDraftValidationError(
      result.errors.map((entry) => entry.message).join(" "),
      result.errors,
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
