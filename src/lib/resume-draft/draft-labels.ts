import { formatSavedJobLabel } from "@/lib/jd/labels";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export function formatDraftStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "reviewed") return "Reviewed";
  if (normalized === "generated") return "Generated";
  if (normalized === "needs_review") return "Needs review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatDraftPrimaryLabel(
  draft: GeneratedResumeDraftRecord,
  job?: StoredJobDescription,
): string {
  if (job) {
    return formatSavedJobLabel(job);
  }
  if (draft.content.targetRoleTitle?.trim()) {
    return draft.content.targetRoleTitle.trim();
  }
  return "Untitled Draft";
}

export type DraftListDisplay = {
  primaryLabel: string;
  secondaryLabel: string;
  timestampLabel: string;
};

export function buildDraftListDisplays(
  drafts: GeneratedResumeDraftRecord[],
  jobById: Map<string, StoredJobDescription>,
): DraftListDisplay[] {
  const primaryCounts = new Map<string, number>();

  for (const draft of drafts) {
    const job = draft.jobDescriptionId ? jobById.get(draft.jobDescriptionId) : undefined;
    const primary = formatDraftPrimaryLabel(draft, job);
    primaryCounts.set(primary, (primaryCounts.get(primary) ?? 0) + 1);
  }

  return drafts.map((draft) => {
    const job = draft.jobDescriptionId ? jobById.get(draft.jobDescriptionId) : undefined;
    const primaryLabel = formatDraftPrimaryLabel(draft, job);
    const timestamp = new Date(draft.createdAt);
    const timestampLabel = timestamp.toLocaleString();
    const duplicateSuffix =
      (primaryCounts.get(primaryLabel) ?? 0) > 1
        ? ` · ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "";

    const providerBits = [
      formatDraftStatusLabel(draft.status),
      draft.provider ?? undefined,
      draft.modelName ?? undefined,
    ].filter(Boolean);

    return {
      primaryLabel: `${primaryLabel}${duplicateSuffix}`,
      secondaryLabel: providerBits.join(" · "),
      timestampLabel,
    };
  });
}
