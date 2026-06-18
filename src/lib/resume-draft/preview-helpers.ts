import type { ResumeDraftBulletSourceRef, ResumeDraftConfidence } from "@/types/resume-draft";

import type { ReviewItemStatus } from "@/lib/resume-draft/review-state";

export function formatRiskFlagLabel(flag: string): string {
  const normalized = flag.trim().toLowerCase();

  if (normalized.includes("unsupported")) {
    return "Unsupported claim risk";
  }
  if (normalized.includes("missing source") || normalized.includes("no source")) {
    return "Missing source reference";
  }
  if (normalized.includes("low confidence") || normalized === "low") {
    return "Low confidence";
  }
  if (normalized.includes("needs review") || normalized.includes("review")) {
    return "Needs review";
  }

  return flag;
}

export function formatConfidenceLabel(confidence: ResumeDraftConfidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return confidence;
  }
}

export function reviewStatusLabel(status: ReviewItemStatus): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "accepted":
      return "Accepted";
    case "edited":
      return "Edited";
    case "rejected":
      return "Omitted";
    default:
      return status;
  }
}

export function reviewStatusClassName(status: ReviewItemStatus): string {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "edited":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "rejected":
      return "border-slate-200 bg-slate-100 text-slate-500 line-through";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

export function formatSourceRefLabel(ref: ResumeDraftBulletSourceRef): string {
  const parts = [ref.filename, ref.bulletKey, ref.collatedBulletId, ref.resumeId].filter(
    Boolean,
  );
  return parts.join(" · ") || "Source reference";
}

export function hasSourceRefs(refs: ResumeDraftBulletSourceRef[] | undefined): boolean {
  return Boolean(refs?.some((ref) => ref.filename || ref.bulletKey || ref.collatedBulletId || ref.resumeId));
}
