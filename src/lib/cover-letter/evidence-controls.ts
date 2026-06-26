import type { CoverLetterEvidenceControls } from "@/types/cover-letter-draft";

/** Work, Additional Experience, and Education spine IDs only. */
export function filterCoverLetterProofEvidenceIds(ids: readonly string[] | undefined): string[] {
  return [
    ...new Set(
      (ids ?? [])
        .map((id) => id.trim())
        .filter(
          (id) =>
            id.startsWith("work_bullet:") ||
            id.startsWith("additional:") ||
            id.startsWith("education:"),
        ),
    ),
  ];
}

export function normalizeCoverLetterEvidenceControls(
  controls: CoverLetterEvidenceControls,
): CoverLetterEvidenceControls {
  const excludedEvidenceIds = filterCoverLetterProofEvidenceIds(controls.excludedEvidenceIds);
  const excludedSet = new Set(excludedEvidenceIds);
  const forcedEvidenceIds = filterCoverLetterProofEvidenceIds(controls.forcedEvidenceIds).filter(
    (id) => !excludedSet.has(id),
  );

  return {
    forcedEvidenceIds,
    excludedEvidenceIds,
  };
}

export function hasCoverLetterEvidenceControls(controls: CoverLetterEvidenceControls): boolean {
  return controls.forcedEvidenceIds.length > 0 || controls.excludedEvidenceIds.length > 0;
}
