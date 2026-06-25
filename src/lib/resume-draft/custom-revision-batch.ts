import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeRevisionQueueItem,
} from "@/types/resume-draft";
import {
  applyResumeCustomRevision,
  validateCustomRevisedRoleBullets,
} from "@/lib/resume-draft/custom-revision";
import type { ResumeBatchRevisionRawResult } from "@/lib/resume-draft/custom-revision-batch-parse";

export type ResumeBatchRevisionCandidates = {
  summaryText?: string;
  roleUpdates: Array<{ roleIndex: number; bullets: ResumeDraftExperienceBullet[] }>;
  warnings: string[];
};

export function validateResumeBatchRevisionRequest(
  request: Partial<{
    draftId: string;
    content: ResumeDraftContent;
    jobDescription: { rawText: string };
    queue: ResumeRevisionQueueItem[];
  }>,
): string | null {
  if (!request.draftId?.trim()) {
    return "draftId is required.";
  }
  if (!request.content) {
    return "content is required.";
  }
  if (!request.jobDescription?.rawText?.trim()) {
    return "jobDescription.rawText is required.";
  }
  if (!Array.isArray(request.queue) || request.queue.length === 0) {
    return "queue must include at least one revision item.";
  }

  const summaryItems = request.queue.filter((item) => item.scope === "professional_summary");
  if (summaryItems.length > 1) {
    return "queue may include at most one professional summary revision.";
  }

  const seenRoleIndices = new Set<number>();
  for (const item of request.queue) {
    if (!item.id?.trim()) {
      return "each queue item requires an id.";
    }
    if (!item.customInstruction?.trim()) {
      return "each queue item requires customInstruction.";
    }
    if (item.scope === "professional_summary") {
      continue;
    }
    if (item.scope !== "selected_role") {
      return "unsupported queue scope.";
    }
    if (typeof item.roleIndex !== "number" || item.roleIndex < 0) {
      return "selected_role queue items require roleIndex.";
    }
    if (!request.content.experience[item.roleIndex]) {
      return `roleIndex ${item.roleIndex} does not match a work experience role.`;
    }
    if (seenRoleIndices.has(item.roleIndex)) {
      return `duplicate roleIndex ${item.roleIndex} in queue.`;
    }
    seenRoleIndices.add(item.roleIndex);
  }

  return null;
}

export function sanitizeBatchRevisionOutput(options: {
  content: ResumeDraftContent;
  queue: readonly ResumeRevisionQueueItem[];
  parsed: ResumeBatchRevisionRawResult;
}): ResumeBatchRevisionCandidates {
  const parsed = options.parsed;
  const warnings = [...parsed.warnings];
  const roleUpdates: Array<{ roleIndex: number; bullets: ResumeDraftExperienceBullet[] }> = [];
  const queuedRoleIndices = new Set(
    options.queue
      .filter((item): item is Extract<ResumeRevisionQueueItem, { scope: "selected_role" }> =>
        item.scope === "selected_role",
      )
      .map((item) => item.roleIndex),
  );
  const summaryQueued = options.queue.some((item) => item.scope === "professional_summary");

  let summaryText: string | undefined;
  if (summaryQueued) {
    const candidateText = parsed.summaryCandidate?.text?.trim();
    if (!candidateText) {
      warnings.push("Summary revision was queued but the model returned no summary candidate.");
    } else {
      summaryText = candidateText;
    }
  } else if (parsed.summaryCandidate?.text?.trim()) {
    warnings.push("Ignored summary candidate because summary was not queued.");
  }

  for (const candidate of parsed.roleCandidates ?? []) {
    if (!queuedRoleIndices.has(candidate.roleIndex)) {
      warnings.push(
        `Ignored role candidate for unqueued role index ${candidate.roleIndex} (${candidate.company} · ${candidate.role}).`,
      );
      continue;
    }

    const priorRole = options.content.experience[candidate.roleIndex]!;
    if (
      candidate.company.trim() !== priorRole.company.trim() ||
      candidate.role.trim() !== priorRole.role.trim()
    ) {
      warnings.push(
        `Skipped role ${candidate.roleIndex}: candidate identity (${candidate.company} · ${candidate.role}) does not match the draft.`,
      );
      continue;
    }

    const issues = validateCustomRevisedRoleBullets({
      bullets: candidate.bullets,
      priorRole,
    });
    if (issues.length > 0) {
      warnings.push(
        `Skipped role ${candidate.roleIndex} (${priorRole.company} · ${priorRole.role}): ${issues.join(" ")}`,
      );
      continue;
    }

    roleUpdates.push({
      roleIndex: candidate.roleIndex,
      bullets: candidate.bullets,
    });
    queuedRoleIndices.delete(candidate.roleIndex);
  }

  for (const roleIndex of queuedRoleIndices) {
    const role = options.content.experience[roleIndex]!;
    warnings.push(
      `No valid candidate returned for queued role ${roleIndex} (${role.company} · ${role.role}); left unchanged.`,
    );
  }

  return {
    summaryText,
    roleUpdates,
    warnings,
  };
}

export function applyResumeBatchRevision(
  content: ResumeDraftContent,
  candidates: ResumeBatchRevisionCandidates,
): ResumeDraftContent {
  let next = content;
  if (candidates.summaryText !== undefined) {
    next = applyResumeCustomRevision(next, {
      scope: "professional_summary",
      professionalSummaryText: candidates.summaryText,
    });
  }
  for (const update of candidates.roleUpdates) {
    next = applyResumeCustomRevision(next, {
      scope: "selected_role",
      roleIndex: update.roleIndex,
      roleBullets: update.bullets,
    });
  }
  return next;
}

export function batchRevisionHasCandidates(candidates: ResumeBatchRevisionCandidates): boolean {
  return candidates.summaryText !== undefined || candidates.roleUpdates.length > 0;
}
