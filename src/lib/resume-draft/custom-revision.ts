import {
  MAX_BULLETS_PER_ROLE,
  MIN_BULLETS_PER_ROLE,
} from "@/lib/resume-draft/generation-validation";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftExperienceSection,
  ResumeCustomRevisionScope,
} from "@/types/resume-draft";

export function collectRoleSourceKeys(role: ResumeDraftExperienceSection): string[] {
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

export function validateCustomRevisedRoleBullets(options: {
  bullets: readonly ResumeDraftExperienceBullet[];
  priorRole: ResumeDraftExperienceSection;
}): string[] {
  const issues: string[] = [];
  const allowedSet = new Set(collectRoleSourceKeys(options.priorRole));

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
      if (key && allowedSet.size > 0 && !allowedSet.has(key)) {
        issues.push(`Bullet ${index + 1} references unsupported bulletKey "${key}".`);
      }
    }
  }

  return issues;
}

export function applyResumeCustomRevision(
  content: ResumeDraftContent,
  revision: {
    scope: ResumeCustomRevisionScope;
    roleIndex?: number;
    professionalSummaryText?: string;
    roleBullets?: ResumeDraftExperienceBullet[];
  },
): ResumeDraftContent {
  if (revision.scope === "professional_summary" && revision.professionalSummaryText !== undefined) {
    return {
      ...content,
      professionalSummary: {
        ...content.professionalSummary,
        text: revision.professionalSummaryText,
      },
      serverPdfValidation: undefined,
    };
  }

  if (
    revision.scope === "selected_role" &&
    revision.roleIndex !== undefined &&
    revision.roleBullets
  ) {
    return {
      ...content,
      experience: content.experience.map((role, index) =>
        index === revision.roleIndex
          ? {
              ...role,
              bullets: revision.roleBullets!,
            }
          : role,
      ),
      serverPdfValidation: undefined,
    };
  }

  return content;
}

/**
 * Applies single-bullet (Replace) revisions: swaps only the `text` of each targeted
 * bullet, preserving its sourceRefs/confidence/riskFlags so the evidence spine stays intact.
 * Candidates targeting a missing role/bullet are ignored. Clears serverPdfValidation when
 * any bullet text actually changed.
 */
export function applyResumeSingleBulletRevisions(
  content: ResumeDraftContent,
  candidates: readonly { roleIndex: number; bulletIndex: number; text: string }[],
): ResumeDraftContent {
  let changed = false;
  const experience = content.experience.map((role, roleIdx) => {
    const roleCandidates = candidates.filter((c) => c.roleIndex === roleIdx);
    if (roleCandidates.length === 0) {
      return role;
    }
    const bullets = role.bullets.map((bullet, bulletIdx) => {
      const candidate = roleCandidates.find((c) => c.bulletIndex === bulletIdx);
      const nextText = candidate?.text.trim();
      if (!nextText || nextText === bullet.text) {
        return bullet;
      }
      changed = true;
      return { ...bullet, text: nextText };
    });
    return { ...role, bullets };
  });

  if (!changed) {
    return content;
  }

  return {
    ...content,
    experience,
    serverPdfValidation: undefined,
  };
}

export function validateResumeSingleBulletRevisionCandidates(
  targets: readonly { roleIndex: number; bulletIndex: number }[],
  candidates: readonly { roleIndex: number; bulletIndex: number; text: string }[],
): string | null {
  const requestedKeys = new Set(targets.map((target) => `${target.roleIndex}:${target.bulletIndex}`));
  const returnedKeys = new Set<string>();

  for (const candidate of candidates) {
    const key = `${candidate.roleIndex}:${candidate.bulletIndex}`;
    if (!requestedKeys.has(key)) {
      return `AI returned an unexpected bullet target ${key}.`;
    }
    if (returnedKeys.has(key)) {
      return `AI returned duplicate bullet target ${key}.`;
    }
    returnedKeys.add(key);
  }

  const missingKeys = [...requestedKeys].filter((key) => !returnedKeys.has(key));
  if (missingKeys.length > 0) {
    return `AI omitted requested bullet target${missingKeys.length === 1 ? "" : "s"} ${missingKeys.join(", ")}.`;
  }
  if (candidates.length !== targets.length) {
    return `AI returned ${candidates.length} bullet candidates for ${targets.length} requested targets.`;
  }

  return null;
}

export function validateResumeSingleBulletRevisionRequest(
  request: Partial<{
    draftId: string;
    scope: ResumeCustomRevisionScope;
    content: ResumeDraftContent;
    jobDescription: { rawText: string };
    bullets: { roleIndex: number; bulletIndex: number; currentText: string }[];
  }>,
): string | null {
  if (!request.draftId?.trim()) {
    return "draftId is required.";
  }
  if (request.scope !== "single_bullet") {
    return "scope must be single_bullet.";
  }
  if (!request.content) {
    return "content is required.";
  }
  if (!request.jobDescription?.rawText?.trim()) {
    return "jobDescription.rawText is required.";
  }
  if (!Array.isArray(request.bullets) || request.bullets.length === 0) {
    return "bullets must include at least one target.";
  }
  const seen = new Set<string>();
  for (const target of request.bullets) {
    if (typeof target.roleIndex !== "number" || target.roleIndex < 0) {
      return "each bullet target requires a roleIndex.";
    }
    if (typeof target.bulletIndex !== "number" || target.bulletIndex < 0) {
      return "each bullet target requires a bulletIndex.";
    }
    const role = request.content.experience[target.roleIndex];
    if (!role) {
      return `roleIndex ${target.roleIndex} does not match a work experience role.`;
    }
    if (!role.bullets[target.bulletIndex]) {
      return `bulletIndex ${target.bulletIndex} does not match a bullet in role ${target.roleIndex}.`;
    }
    const key = `${target.roleIndex}:${target.bulletIndex}`;
    if (seen.has(key)) {
      return `duplicate bullet target ${key}.`;
    }
    seen.add(key);
  }
  return null;
}

export function resumeCustomRevisionShouldPersist(
  request: Pick<{ persist?: boolean }, "persist">,
): boolean {
  return request.persist === true;
}

export function validateResumeCustomRevisionRequest(
  request: Partial<{
    draftId: string;
    scope: ResumeCustomRevisionScope;
    roleIndex: number;
    customInstruction: string;
    content: ResumeDraftContent;
    jobDescription: { rawText: string };
  }>,
): string | null {
  if (!request.draftId?.trim()) {
    return "draftId is required.";
  }
  if (request.scope !== "professional_summary" && request.scope !== "selected_role") {
    return "scope must be professional_summary or selected_role.";
  }
  if (!request.customInstruction?.trim()) {
    return "customInstruction is required.";
  }
  if (!request.content) {
    return "content is required.";
  }
  if (!request.jobDescription?.rawText?.trim()) {
    return "jobDescription.rawText is required.";
  }
  if (request.scope === "selected_role") {
    if (typeof request.roleIndex !== "number" || request.roleIndex < 0) {
      return "roleIndex is required for selected_role scope.";
    }
    if (!request.content.experience[request.roleIndex]) {
      return "roleIndex does not match a work experience role.";
    }
  }
  return null;
}

/** One-page resume preview/export never includes Professional Summary. */
const ONE_PAGE_RESUME_EXPORTS_PROFESSIONAL_SUMMARY = false;

/**
 * Whether scoped custom revision should offer the professional summary target.
 */
export function isProfessionalSummaryRevisionScopeAvailable(
  content: ResumeDraftContent,
): boolean {
  if (!ONE_PAGE_RESUME_EXPORTS_PROFESSIONAL_SUMMARY) {
    return false;
  }
  return Boolean(content.professionalSummary?.text?.trim());
}

export const PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY =
  "Summary is not exported in the current one-page resume format.";
