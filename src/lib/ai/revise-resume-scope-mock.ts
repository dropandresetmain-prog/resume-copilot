import { rewriteMockResumeRole } from "@/lib/ai/resume-role-rewrite-mock";
import {
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  type ResumeRoleCustomRevisionPromptInput,
  type ResumeSummaryCustomRevisionPromptInput,
} from "@/lib/resume-draft/custom-revision-prompt";
import { buildResumeBatchRevisionPrompt } from "@/lib/resume-draft/custom-revision-batch-prompt";
import { parseResumeSummaryCustomRevisionJson } from "@/lib/resume-draft/custom-revision-parse";
import { parseResumeRoleRewriteJson } from "@/lib/resume-draft/role-rewrite-parse";
import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeRevisionQueueItem,
} from "@/types/resume-draft";
import type { ResumeBatchRevisionCandidates } from "@/lib/resume-draft/custom-revision-batch";

export type ResumeCustomRevisionModelResult =
  | {
      scope: "professional_summary";
      professionalSummaryText: string;
      warnings: string[];
    }
  | {
      scope: "selected_role";
      roleBullets: ResumeDraftExperienceBullet[];
      warnings: string[];
    };

export function reviseMockResumeSummary(
  input: ResumeSummaryCustomRevisionPromptInput,
): Extract<ResumeCustomRevisionModelResult, { scope: "professional_summary" }> {
  const base = input.currentSummary.trim() || "Experienced professional with relevant background.";
  const instruction = input.customInstruction.trim();
  const revised = instruction
    ? `${base} ${instruction.endsWith(".") ? instruction : `${instruction}.`}`
    : base;

  return {
    scope: "professional_summary",
    professionalSummaryText: revised.slice(0, 600),
    warnings: [],
  };
}

export function reviseMockResumeRoleCustom(
  input: ResumeRoleCustomRevisionPromptInput,
): Extract<ResumeCustomRevisionModelResult, { scope: "selected_role" }> {
  const rewritten = rewriteMockResumeRole({
    currentRole: input.currentRole,
    forcedBulletKeys: [],
    inventoryBullets: input.currentRole.bullets.flatMap((bullet) => {
      const key = bullet.sourceRefs[0]?.bulletKey;
      if (!key) {
        return [];
      }
      const [keyword, ...rest] = bullet.text.split(":");
      return [
        {
          bulletKey: key,
          description: rest.join(":").trim() || bullet.text,
          keyword: keyword?.trim() || "Operations",
          company: input.currentRole.company,
          role: input.currentRole.role,
        },
      ];
    }),
    jobDescriptionText: input.jobDescriptionText,
    targetRoleTitle: input.targetRoleTitle,
    bulletStyle: input.bulletStyle,
  });

  const bullets = rewritten.bullets.map((bullet) => ({
    ...bullet,
    text: input.customInstruction.trim()
      ? `${bullet.text} (${input.customInstruction.trim().slice(0, 48)})`
      : bullet.text,
  }));

  return {
    scope: "selected_role",
    roleBullets: bullets,
    warnings: [],
  };
}

export type ResumeBatchRevisionModelInput = {
  content: ResumeDraftContent;
  queue: readonly ResumeRevisionQueueItem[];
  jobDescriptionText: string;
  targetRoleTitle?: string;
  bulletStyle?: "keyword_colon" | "plain";
};

export function reviseMockResumeBatch(
  input: ResumeBatchRevisionModelInput,
): ResumeBatchRevisionCandidates & { warnings: string[] } {
  const warnings: string[] = [];
  let summaryText: string | undefined;
  const roleUpdates: Array<{ roleIndex: number; bullets: ResumeDraftExperienceBullet[] }> = [];

  for (const item of input.queue) {
    if (item.scope === "professional_summary") {
      const revised = reviseMockResumeSummary({
        currentSummary: input.content.professionalSummary.text,
        customInstruction: item.customInstruction,
        jobDescriptionText: input.jobDescriptionText,
        targetRoleTitle: input.targetRoleTitle,
      });
      summaryText = revised.professionalSummaryText;
      warnings.push(...revised.warnings);
      continue;
    }

    const currentRole = input.content.experience[item.roleIndex];
    if (!currentRole) {
      warnings.push(`Skipped queued role ${item.roleIndex}: role not found in draft.`);
      continue;
    }

    const revised = reviseMockResumeRoleCustom({
      currentRole,
      customInstruction: item.customInstruction,
      jobDescriptionText: input.jobDescriptionText,
      targetRoleTitle: input.targetRoleTitle,
      bulletStyle: input.bulletStyle,
    });
    roleUpdates.push({
      roleIndex: item.roleIndex,
      bullets: revised.roleBullets,
    });
    warnings.push(...revised.warnings);
  }

  return {
    summaryText,
    roleUpdates,
    warnings,
  };
}

export {
  buildResumeBatchRevisionPrompt,
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  parseResumeRoleRewriteJson,
  parseResumeSummaryCustomRevisionJson,
};
