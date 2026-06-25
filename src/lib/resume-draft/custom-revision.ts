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
