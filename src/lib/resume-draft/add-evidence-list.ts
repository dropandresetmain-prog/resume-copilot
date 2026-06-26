import type { EvidenceItem, EvidenceSourceType } from "@/lib/evidence/types";
import type { EvidenceSpineResult } from "@/lib/evidence/types";
import { filterAdditionalEvidenceIds } from "@/lib/evidence/collect";
import { inventoryKeysAlreadyInDraft } from "@/lib/resume-draft/evidence-pending-queue";
import type {
  ResumeDraftContent,
  ResumeDraftRegenerationControls,
} from "@/types/resume-draft";

export type AddEvidenceCategoryLabel =
  | "Work"
  | "Additional"
  | "Education"
  | "Skill"
  | "Keyword";

export type AddEvidenceActionState =
  | "already_in_draft"
  | "addable"
  | "full_regenerate_only"
  | "cover_letter_useful"
  | "advisory_only"
  | "excluded"
  | "hidden"
  | "unsupported";

export type AddEvidenceRow = {
  id: string;
  categoryLabel: AddEvidenceCategoryLabel;
  displayLabel: string;
  evidenceText: string;
  rationale: string;
  sourceType: EvidenceSourceType;
  actionState: AddEvidenceActionState;
  relevanceScore: number;
  bulletKey?: string;
  acceptedWording?: string;
};

const ADD_EVIDENCE_SOURCE_TYPES: ReadonlySet<EvidenceSourceType> = new Set([
  "work_bullet",
  "additional_experience",
  "education",
  "skill",
  "keyword_tied",
]);

function categoryLabelForSourceType(sourceType: EvidenceSourceType): AddEvidenceCategoryLabel {
  switch (sourceType) {
    case "work_bullet":
      return "Work";
    case "additional_experience":
      return "Additional";
    case "education":
      return "Education";
    case "skill":
      return "Skill";
    case "keyword_tied":
      return "Keyword";
    default:
      return "Work";
  }
}

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isAdditionalExperienceInDraft(content: ResumeDraftContent, text: string): boolean {
  const normalized = normalizeComparableText(text);
  return content.additionalExperience.some(
    (item) => normalizeComparableText(item.text) === normalized,
  );
}

function isEducationInDraft(content: ResumeDraftContent, institution: string, text: string): boolean {
  const institutionNormalized = normalizeComparableText(institution);
  const textNormalized = normalizeComparableText(text);
  return content.education.some((item) => {
    const institutionMatch = normalizeComparableText(item.institution) === institutionNormalized;
    const programmeMatch = item.programmes.some(
      (programme) => normalizeComparableText(programme) === textNormalized,
    );
    const bulletMatch = item.bullets.some(
      (bullet) => normalizeComparableText(bullet) === textNormalized,
    );
    return institutionMatch && (programmeMatch || bulletMatch || textNormalized.includes(institutionNormalized));
  });
}

function isSkillInDraft(content: ResumeDraftContent, skillText: string): boolean {
  const normalized = normalizeComparableText(skillText);
  return content.skills.groups.some((group) =>
    group.items.some((item) => normalizeComparableText(item) === normalized),
  );
}

function resolveActionState(
  item: EvidenceItem,
  content: ResumeDraftContent,
  draftSourceKeys: ReadonlySet<string>,
  controls: ResumeDraftRegenerationControls | undefined,
  hiddenBulletKeys: ReadonlySet<string>,
): AddEvidenceActionState | null {
  if (item.state === "hidden" || (item.bulletKey && hiddenBulletKeys.has(item.bulletKey))) {
    return null;
  }

  const excludedSet = new Set(controls?.excludedBulletKeys ?? []);
  const excludedEvidenceSet = new Set(filterAdditionalEvidenceIds(controls?.excludedEvidenceIds));
  if (item.state === "excluded" || (item.bulletKey && excludedSet.has(item.bulletKey))) {
    return null;
  }
  if (excludedEvidenceSet.has(item.id)) {
    return null;
  }

  switch (item.sourceType) {
    case "work_bullet": {
      if (!item.bulletKey) {
        return "unsupported";
      }
      if (draftSourceKeys.has(item.bulletKey)) {
        return "already_in_draft";
      }
      return "addable";
    }
    case "additional_experience": {
      if (isAdditionalExperienceInDraft(content, item.originalText)) {
        return "already_in_draft";
      }
      return "full_regenerate_only";
    }
    case "education": {
      if (isEducationInDraft(content, item.displayLabel, item.originalText)) {
        return "already_in_draft";
      }
      return "cover_letter_useful";
    }
    case "skill": {
      if (isSkillInDraft(content, item.originalText)) {
        return "already_in_draft";
      }
      return item.eligibility === "cover_letter" ? "cover_letter_useful" : "cover_letter_useful";
    }
    case "keyword_tied":
      return "advisory_only";
    default:
      return "unsupported";
  }
}

function evidenceTextForItem(item: EvidenceItem): string {
  return (item.acceptedWording ?? item.editedText ?? item.originalText).trim();
}

export function buildAddEvidenceList(
  spine: EvidenceSpineResult,
  content: ResumeDraftContent,
  controls?: ResumeDraftRegenerationControls,
  options?: {
    hiddenBulletKeys?: readonly string[];
  },
): AddEvidenceRow[] {
  const draftSourceKeys = inventoryKeysAlreadyInDraft(content);
  const hiddenBulletKeys = new Set(options?.hiddenBulletKeys ?? []);
  const rows: AddEvidenceRow[] = [];

  for (const item of spine.ranked) {
    if (!ADD_EVIDENCE_SOURCE_TYPES.has(item.sourceType)) {
      continue;
    }

    const actionState = resolveActionState(
      item,
      content,
      draftSourceKeys,
      controls,
      hiddenBulletKeys,
    );
    if (!actionState || actionState === "already_in_draft") {
      continue;
    }

    rows.push({
      id: item.id,
      categoryLabel: categoryLabelForSourceType(item.sourceType),
      displayLabel: item.displayLabel,
      evidenceText: evidenceTextForItem(item),
      rationale: item.rationale,
      sourceType: item.sourceType,
      actionState,
      relevanceScore: item.relevanceScore,
      bulletKey: item.bulletKey,
      acceptedWording: item.acceptedWording,
    });
  }

  return rows.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.id.localeCompare(b.id);
  });
}

export function actionStateHint(actionState: AddEvidenceActionState): string | null {
  switch (actionState) {
    case "full_regenerate_only":
      return "Additional Experience — requires full resume regeneration (1 AI step). Staged inclusion does not run targeted rewrite or call AI on apply.";
    case "cover_letter_useful":
      return "Supporting evidence for cover letter proof stories — stage on Edit cover letter, not here.";
    case "advisory_only":
      return "Evidence-tied keyword highlight — advisory only, not standalone proof.";
    case "unsupported":
      return "This evidence type cannot be added from here.";
    default:
      return null;
  }
}
