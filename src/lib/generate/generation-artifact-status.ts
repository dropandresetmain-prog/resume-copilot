export type ArtifactGenerationStatus = "pending" | "generating" | "success" | "failed";

export type ArtifactGenerationSnapshot = {
  resume: ArtifactGenerationStatus;
  coverLetter: ArtifactGenerationStatus;
};

export type CombinedGenerationFailureKind =
  | "resume_failed"
  | "cover_letter_failed_after_resume_success";

export function buildArtifactSnapshot(input: {
  resumeStatus: ArtifactGenerationStatus;
  coverLetterStatus: ArtifactGenerationStatus;
}): ArtifactGenerationSnapshot {
  return {
    resume: input.resumeStatus,
    coverLetter: input.coverLetterStatus,
  };
}

export function classifyCombinedGenerationFailure(
  snapshot: ArtifactGenerationSnapshot,
): CombinedGenerationFailureKind | null {
  if (snapshot.resume === "failed") {
    return "resume_failed";
  }
  if (snapshot.resume === "success" && snapshot.coverLetter === "failed") {
    return "cover_letter_failed_after_resume_success";
  }
  return null;
}

export function getPrimaryRetryAction(
  failureKind: CombinedGenerationFailureKind | null,
): "retry_cover_letter" | "regenerate_resume" | null {
  if (failureKind === "cover_letter_failed_after_resume_success") {
    return "retry_cover_letter";
  }
  if (failureKind === "resume_failed") {
    return "regenerate_resume";
  }
  return null;
}

export function resumePersistedBeforeCoverLetterFailure(resumeDraftId?: string | null): boolean {
  return Boolean(resumeDraftId?.trim());
}

export function shouldSkipResumeGenerationOnCoverLetterRetry(
  resumeDraftId?: string | null,
): boolean {
  return resumePersistedBeforeCoverLetterFailure(resumeDraftId);
}

export function formatApplicationArtifactSummary(input: {
  hasResume: boolean;
  hasCoverLetter: boolean;
}): { resumeLabel: string; coverLetterLabel: string } {
  return {
    resumeLabel: input.hasResume ? "✓" : "—",
    coverLetterLabel: input.hasCoverLetter ? "✓" : input.hasResume ? "✗" : "—",
  };
}
