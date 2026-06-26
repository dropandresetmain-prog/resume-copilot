import type { EvidenceItem, EvidenceSpineResult } from "@/lib/evidence/types";
import type { CoverLetterEvidenceControls } from "@/types/cover-letter-draft";

export type CoverLetterProofEvidenceCategory = "Work" | "Additional" | "Education";

export type CoverLetterProofEvidenceRow = {
  id: string;
  categoryLabel: CoverLetterProofEvidenceCategory;
  displayLabel: string;
  evidenceText: string;
  rationale: string;
  relevanceScore: number;
  stagedAs: "force" | "exclude" | null;
};

const PROOF_SOURCE_TYPES: ReadonlySet<EvidenceItem["sourceType"]> = new Set([
  "work_bullet",
  "additional_experience",
  "education",
]);

function categoryLabelForItem(item: EvidenceItem): CoverLetterProofEvidenceCategory {
  switch (item.sourceType) {
    case "work_bullet":
      return "Work";
    case "additional_experience":
      return "Additional";
    case "education":
      return "Education";
    default:
      return "Work";
  }
}

function evidenceTextForItem(item: EvidenceItem): string {
  return (item.acceptedWording ?? item.editedText ?? item.originalText).trim();
}

function isSelectableProofItem(item: EvidenceItem): boolean {
  return (
    PROOF_SOURCE_TYPES.has(item.sourceType) &&
    item.state !== "excluded" &&
    item.state !== "hidden" &&
    item.eligibility !== "positioning_only"
  );
}

export function buildCoverLetterProofEvidenceList(
  spine: EvidenceSpineResult,
  pendingControls?: CoverLetterEvidenceControls,
): CoverLetterProofEvidenceRow[] {
  const forcedSet = new Set(pendingControls?.forcedEvidenceIds ?? []);
  const excludedSet = new Set(pendingControls?.excludedEvidenceIds ?? []);

  const rows: CoverLetterProofEvidenceRow[] = [];
  for (const item of spine.ranked) {
    if (!isSelectableProofItem(item)) {
      continue;
    }

    let stagedAs: CoverLetterProofEvidenceRow["stagedAs"] = null;
    if (forcedSet.has(item.id)) {
      stagedAs = "force";
    } else if (excludedSet.has(item.id)) {
      stagedAs = "exclude";
    }

    rows.push({
      id: item.id,
      categoryLabel: categoryLabelForItem(item),
      displayLabel: item.displayLabel,
      evidenceText: evidenceTextForItem(item),
      rationale: item.rationale,
      relevanceScore: item.relevanceScore,
      stagedAs,
    });
  }

  return rows.sort((left, right) => {
    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }
    return left.id.localeCompare(right.id);
  });
}
