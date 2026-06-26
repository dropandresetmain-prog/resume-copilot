import { buildCoverLetterEvidencePrompt } from "@/lib/cover-letter/evidence-prompt";
import { OMITTED_BUT_RELEVANT_MIN_SCORE } from "@/lib/evidence/constants";
import type { EvidenceSpineItemSnapshot, EvidenceSpineSnapshot } from "@/lib/evidence/types";
import { extractJdMatchTerms } from "@/lib/resume-draft/bullet-payload";
import {
  validateRationaleQuality,
  validateTailoringQuality,
} from "@/lib/resume-draft/tailoring-quality";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

export type TailoringDiagnosticSeverity = "strength" | "warning" | "info";

export type TailoringDiagnosticLine = {
  id: string;
  severity: TailoringDiagnosticSeverity;
  message: string;
};

export type TailoringDiagnosticActionId =
  | "fix-resume-evidence"
  | "edit-cover-letter-evidence"
  | "accept-risk";

export type TailoringDiagnosticAction = {
  id: TailoringDiagnosticActionId;
  label: string;
  hint: string;
};

export type CoverLetterProofStatus =
  | "full"
  | "saved-only"
  | "needs-inventory"
  | "no-cover-letter";

export type PackageTailoringDiagnostics = {
  available: boolean;
  /** Saved evidence spine snapshot present on the resume draft. */
  hasEvidenceSpine: boolean;
  coverLetterProofStatus: CoverLetterProofStatus;
  selectedEvidence: TailoringDiagnosticLine[];
  omittedEvidence: TailoringDiagnosticLine[];
  coverLetterProof: TailoringDiagnosticLine[];
  warnings: TailoringDiagnosticLine[];
  suggestedActions: TailoringDiagnosticAction[];
};

const MAX_LINES = 3;

function isDefinedSpineItem(
  item: EvidenceSpineItemSnapshot | undefined,
): item is EvidenceSpineItemSnapshot {
  return item !== undefined;
}

function isStrongOmittedSpineItem(
  item: EvidenceSpineItemSnapshot | undefined,
): item is EvidenceSpineItemSnapshot {
  if (!item) {
    return false;
  }
  return item.relevanceScore >= OMITTED_BUT_RELEVANT_MIN_SCORE;
}

function itemById(
  spine: EvidenceSpineSnapshot,
  id: string,
): EvidenceSpineItemSnapshot | undefined {
  return spine.items.find((item) => item.id === id);
}

function isCoverLetterUsefulOmission(item: EvidenceSpineItemSnapshot): boolean {
  return (
    item.eligibility === "cover_letter" ||
    item.eligibility === "both" ||
    item.sourceType === "additional_experience" ||
    item.sourceType === "education"
  );
}

function isResumeActionableOmission(item: EvidenceSpineItemSnapshot): boolean {
  return item.sourceType === "work_bullet" || item.sourceType === "additional_experience";
}

function omissionChannelLabel(item: EvidenceSpineItemSnapshot): string {
  if (item.sourceType === "work_bullet") {
    return "targeted add or full regeneration";
  }
  if (item.sourceType === "additional_experience") {
    return "full resume regeneration";
  }
  if (isCoverLetterUsefulOmission(item)) {
    return "cover letter";
  }
  return "not selected";
}

function buildSelectedLines(spine: EvidenceSpineSnapshot): TailoringDiagnosticLine[] {
  return spine.selectedIds
    .map((id) => itemById(spine, id))
    .filter(isDefinedSpineItem)
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, MAX_LINES)
    .map((item) => ({
      id: `selected-${item.id}`,
      severity: "strength" as const,
      message: `${item.displayLabel} (${item.relevanceScore} JD relevance)`,
    }));
}

function buildOmittedLines(spine: EvidenceSpineSnapshot): TailoringDiagnosticLine[] {
  return spine.omittedIds
    .map((id) => itemById(spine, id))
    .filter(isStrongOmittedSpineItem)
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, MAX_LINES)
    .map((item) => ({
      id: `omitted-${item.id}`,
      severity: "info" as const,
      message: `Optional: ${item.displayLabel} (${item.relevanceScore}) — via ${omissionChannelLabel(item)}`,
    }));
}

function buildTailoringWarnings(
  resumeDraft: GeneratedResumeDraftRecord,
  jdText?: string,
): TailoringDiagnosticLine[] {
  const jdTerms = jdText ? extractJdMatchTerms(jdText) : [];
  const issues = [
    ...validateTailoringQuality(resumeDraft.content, {
      jdTerms,
      rationale: resumeDraft.rationale,
    }),
    ...validateRationaleQuality(resumeDraft.rationale),
  ];

  const seen = new Set<string>();
  const lines: TailoringDiagnosticLine[] = [];
  for (const issue of issues) {
    if (seen.has(issue.code)) {
      continue;
    }
    seen.add(issue.code);
    lines.push({
      id: `warn-${issue.code}`,
      severity: issue.severity === "warning" ? "warning" : "info",
      message: issue.message,
    });
    if (lines.length >= MAX_LINES) {
      break;
    }
  }
  return lines;
}

function hasStrongResumeOmission(spine: EvidenceSpineSnapshot | undefined): boolean {
  if (!spine) {
    return false;
  }
  return spine.omittedIds.some((id) => {
    const item = itemById(spine, id);
    return isStrongOmittedSpineItem(item) && isResumeActionableOmission(item);
  });
}

function hasCoverLetterChannelOmission(spine: EvidenceSpineSnapshot | undefined): boolean {
  if (!spine) {
    return false;
  }
  return spine.omittedIds.some((id) => {
    const item = itemById(spine, id);
    return (
      isStrongOmittedSpineItem(item) &&
      isCoverLetterUsefulOmission(item) &&
      !isResumeActionableOmission(item)
    );
  });
}

function buildSuggestedActions(
  spine: EvidenceSpineSnapshot | undefined,
  coverLetterOffResumeCount: number,
  warningCount: number,
  omittedCount: number,
  coverLetterProofStatus: CoverLetterProofStatus,
): TailoringDiagnosticAction[] {
  const actions: TailoringDiagnosticAction[] = [];

  if (hasStrongResumeOmission(spine)) {
    actions.push({
      id: "fix-resume-evidence",
      label: "Fix resume evidence",
      hint: "Opens package fix mode — stage work bullets or Additional Experience.",
    });
  }

  if (
    coverLetterProofStatus !== "no-cover-letter" &&
    (coverLetterOffResumeCount > 0 ||
      hasCoverLetterChannelOmission(spine) ||
      coverLetterProofStatus === "saved-only")
  ) {
    actions.push({
      id: "edit-cover-letter-evidence",
      label: "Edit cover letter evidence",
      hint: "Opens cover letter editor — stage proof before regenerating.",
    });
  }

  if (warningCount > 0 || omittedCount > 0) {
    actions.push({
      id: "accept-risk",
      label: actions.length > 0 ? "Or accept risk" : "Accept risk",
      hint:
        actions.length > 0
          ? "Scroll to Approve for export if omissions are intentional."
          : "Advisory only — approve for export when the package represents you well.",
    });
  }

  return actions;
}

/**
 * Deterministic tailoring diagnostics from saved generation output and inventory spine —
 * no page-load AI call.
 */
export function buildPackageTailoringDiagnostics(options: {
  resumeDraft: GeneratedResumeDraftRecord;
  coverLetter?: GeneratedCoverLetterDraftRecord | null;
  jobDescription?: StoredJobDescription | null;
  inventory?: InventoryState;
  companyContext?: CompanyContext | null;
}): PackageTailoringDiagnostics {
  const spine = options.resumeDraft.inputSnapshot?.evidenceSpine;
  const empty: PackageTailoringDiagnostics = {
    available: false,
    hasEvidenceSpine: false,
    coverLetterProofStatus: "no-cover-letter",
    selectedEvidence: [],
    omittedEvidence: [],
    coverLetterProof: [],
    warnings: [],
    suggestedActions: [],
  };

  if (!spine && !options.resumeDraft.rationale) {
    return empty;
  }

  const selectedEvidence = spine ? buildSelectedLines(spine) : [];
  if (
    selectedEvidence.length === 0 &&
    (options.resumeDraft.rationale?.selectionAudit?.strongestMatches?.length ?? 0) > 0
  ) {
    for (const match of options.resumeDraft.rationale!.selectionAudit!.strongestMatches!.slice(
      0,
      MAX_LINES,
    )) {
      selectedEvidence.push({
        id: `rationale-match-${selectedEvidence.length}`,
        severity: "strength",
        message: match,
      });
    }
  }

  const omittedEvidence = spine ? buildOmittedLines(spine) : [];
  if (omittedEvidence.length === 0 && (options.resumeDraft.rationale?.omissions?.length ?? 0) > 0) {
    for (const omission of options.resumeDraft.rationale!.omissions!.slice(0, MAX_LINES)) {
      omittedEvidence.push({
        id: `rationale-omission-${omittedEvidence.length}`,
        severity: "info",
        message: `Gap noted: ${omission}`,
      });
    }
  }

  const coverLetterProof: TailoringDiagnosticLine[] = [];
  let coverLetterOffResumeCount = 0;
  let coverLetterProofStatus: CoverLetterProofStatus = options.coverLetter
    ? "needs-inventory"
    : "no-cover-letter";

  if (
    options.coverLetter &&
    options.jobDescription &&
    options.inventory &&
    options.companyContext
  ) {
    coverLetterProofStatus = "full";
    const prompt = buildCoverLetterEvidencePrompt({
      inventory: options.inventory,
      resumeDraft: options.resumeDraft,
      job: options.jobDescription,
      companyContext: options.companyContext,
      companyDisplayName: options.coverLetter.companyName,
    });

    const offResume = prompt.storySpine?.proofStories.filter((story) => !story.onResumeDraft) ?? [];
    coverLetterOffResumeCount = offResume.length;

    for (const story of offResume.slice(0, MAX_LINES)) {
      coverLetterProof.push({
        id: `cl-proof-${story.evidenceId}`,
        severity: "info",
        message: `${story.label} — strong proof not on resume draft`,
      });
    }

    const onResume = prompt.storySpine?.proofStories.filter((story) => story.onResumeDraft) ?? [];
    if (onResume.length > 0 && coverLetterProof.length < MAX_LINES) {
      coverLetterProof.push({
        id: "cl-proof-on-resume",
        severity: "info",
        message: `${onResume.length} proof stor${onResume.length === 1 ? "y" : "ies"} align with resume draft`,
      });
    }
  } else if (options.coverLetter?.rationale?.storySpinePrompt?.includes("NOT on resume draft")) {
    coverLetterProofStatus = "saved-only";
    coverLetterProof.push({
      id: "cl-saved-spine-hint",
      severity: "info",
      message:
        "Saved generation used off-resume inventory proof — open Edit cover letter for details.",
    });
    coverLetterOffResumeCount = 1;
  }

  const warnings = buildTailoringWarnings(
    options.resumeDraft,
    options.jobDescription?.rawText,
  );

  for (const flag of options.coverLetter?.rationale?.riskFlags ?? []) {
    if (warnings.length >= MAX_LINES) {
      break;
    }
    warnings.push({
      id: `cl-risk-${warnings.length}`,
      severity: "warning",
      message: flag,
    });
  }

  const suggestedActions = buildSuggestedActions(
    spine,
    coverLetterOffResumeCount,
    warnings.filter((line) => line.severity === "warning").length,
    omittedEvidence.length,
    coverLetterProofStatus,
  );

  const available =
    selectedEvidence.length > 0 ||
    omittedEvidence.length > 0 ||
    coverLetterProof.length > 0 ||
    warnings.length > 0 ||
    !spine;

  return {
    available,
    hasEvidenceSpine: Boolean(spine),
    coverLetterProofStatus,
    selectedEvidence,
    omittedEvidence,
    coverLetterProof,
    warnings,
    suggestedActions,
  };
}
