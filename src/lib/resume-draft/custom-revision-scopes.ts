import type { ResumeDraftContent } from "@/types/resume-draft";

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
