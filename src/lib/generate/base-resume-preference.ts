import type { ParsedResume } from "@/types/resume";

/** Browser-only preference — no Supabase schema change. */
export const LAST_BASE_RESUME_STORAGE_KEY = "resumeCopilot.lastBaseResumeId.v1";

export function readLastBaseResumeId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(LAST_BASE_RESUME_STORAGE_KEY)?.trim();
  return value || null;
}

export function writeLastBaseResumeId(resumeId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LAST_BASE_RESUME_STORAGE_KEY, resumeId);
}

function sortResumesByRecency(resumes: ParsedResume[]): ParsedResume[] {
  return [...resumes].sort((left, right) =>
    right.uploadedAt.localeCompare(left.uploadedAt),
  );
}

/**
 * Default base (reference/format) resume:
 * 1. Explicit recent draft reference when valid
 * 2. Last-used base resume from local preference
 * 3. Most recently uploaded resume
 */
export function resolveDefaultBaseResumeId(
  resumes: ParsedResume[],
  options?: { recentDraftReferenceResumeId?: string | null },
): string {
  if (resumes.length === 0) {
    return "";
  }

  const validIds = new Set(resumes.map((resume) => resume.id));
  const recentDraftId = options?.recentDraftReferenceResumeId?.trim();
  if (recentDraftId && validIds.has(recentDraftId)) {
    return recentDraftId;
  }

  const stored = readLastBaseResumeId();
  if (stored && validIds.has(stored)) {
    return stored;
  }

  return sortResumesByRecency(resumes)[0]?.id ?? "";
}
