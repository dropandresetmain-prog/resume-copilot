import {
  evaluateCoverLetterExportReadiness,
} from "@/lib/application-review/cover-letter-export-readiness";
import { hasWebsiteBackedResearch } from "@/lib/company-context/normalize";
import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  formatWordCountLabel,
  isOverWordLimit,
  isUnderWordMinimum,
} from "@/lib/cover-letter/word-limits";
import {
  isApprovedDraftStatus,
} from "@/lib/resume-draft/draft-status";
import { areExportLayoutSettingsEqual } from "@/lib/resume-draft/export-layout-settings";
import {
  calculateFitScore,
  type PageFitEstimate,
  type ResumeFitAssessment,
} from "@/lib/resume-draft/layout";
import { formatRiskFlagLabel } from "@/lib/resume-draft/preview-helpers";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type {
  GeneratedResumeDraftRecord,
  ResumeDraftExportLayoutSettings,
} from "@/types/resume-draft";

export type ApplicationReviewOverallStatus =
  | "READY_TO_EXPORT"
  | "REVIEW_RECOMMENDED"
  | "NOT_READY_TO_EXPORT";

export type ReviewItemSeverity = "blocking" | "warning" | "info";

export type ReviewItem = {
  id: string;
  severity: ReviewItemSeverity;
  message: string;
};

export type ApplicationReviewSection = {
  id: string;
  label: string;
  items: ReviewItem[];
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  defaultExpanded: boolean;
};

export type ExportArtifactReadiness = {
  artifact: "resume_pdf" | "resume_docx" | "cover_letter";
  label: string;
  ready: boolean;
  reason: string;
};

export type ApplicationReviewEvidenceUsage = {
  resumeBulletsSelected: number;
  forcedBulletsIncluded: number;
  forcedBulletsUnavailable: number;
  omissionsIdentified: number;
};

export type ApplicationReviewGenerationDetails = {
  generatedAt?: string;
  resume?: {
    requestedTier?: string;
    actualModel?: string;
    fallbackApplied?: boolean;
  };
  coverLetter?: {
    requestedTier?: string;
    actualModel?: string;
    fallbackApplied?: boolean;
  };
};

export type ApplicationReviewStatus = {
  overallStatus: ApplicationReviewOverallStatus;
  blockingCount: number;
  warningCount: number;
  sections: ApplicationReviewSection[];
  exportReadiness: ExportArtifactReadiness[];
  evidenceUsage: ApplicationReviewEvidenceUsage;
  generationDetails: ApplicationReviewGenerationDetails;
  fitAssessment: ResumeFitAssessment;
};

export type BuildApplicationReviewStatusInput = {
  resumeDraft: GeneratedResumeDraftRecord;
  coverLetter: GeneratedCoverLetterDraftRecord | null;
  coverLetterLoading?: boolean;
  companyContext: CompanyContext | null;
  exportReady: boolean;
  layoutChangedAfterApproval: boolean;
  currentLayoutSettings: ResumeDraftExportLayoutSettings;
  validationFailure?: { pageCount: number; message: string } | null;
  pageFit?: PageFitEstimate | null;
  coverLetterPdfOverflow?: boolean;
};

function countSectionItems(items: ReviewItem[]) {
  return {
    blockingCount: items.filter((item) => item.severity === "blocking").length,
    warningCount: items.filter((item) => item.severity === "warning").length,
    infoCount: items.filter((item) => item.severity === "info").length,
  };
}

function buildSection(
  id: string,
  label: string,
  items: ReviewItem[],
  defaultExpanded: boolean,
): ApplicationReviewSection {
  const counts = countSectionItems(items);
  return { id, label, items, defaultExpanded, ...counts };
}

function resumeExportBlockingReason(input: BuildApplicationReviewStatusInput): string {
  const { resumeDraft, exportReady, layoutChangedAfterApproval, currentLayoutSettings } = input;

  if (layoutChangedAfterApproval) {
    return "Layout changed after approval — re-approve for export.";
  }
  if (!isApprovedDraftStatus(resumeDraft.status)) {
    return "Resume not approved for export — run Approve for Export.";
  }
  if (!areExportLayoutSettingsEqual(resumeDraft.content.exportLayoutSettings, currentLayoutSettings)) {
    return "Layout controls differ from last approved settings — re-approve for export.";
  }
  if (resumeDraft.content.serverPdfValidation?.pageCount !== 1) {
    return "Server PDF must be validated as one page before export.";
  }
  if (!exportReady) {
    return "Resume export requirements are not met.";
  }
  return "Ready";
}

function buildResumeSection(
  input: BuildApplicationReviewStatusInput,
  fitAssessment: ResumeFitAssessment,
): ApplicationReviewSection {
  const { resumeDraft, exportReady, layoutChangedAfterApproval, validationFailure, pageFit } =
    input;
  const items: ReviewItem[] = [];

  if (layoutChangedAfterApproval) {
    items.push({
      id: "resume-layout-changed",
      severity: "blocking",
      message: "Layout changed after approval — re-approve for export.",
    });
  } else if (!isApprovedDraftStatus(resumeDraft.status)) {
    items.push({
      id: "resume-not-approved",
      severity: "blocking",
      message: "Resume not approved for export.",
    });
  } else if (resumeDraft.content.serverPdfValidation?.pageCount === 1 && exportReady) {
    items.push({
      id: "resume-approved",
      severity: "info",
      message: "Approved for export with server one-page PDF validation.",
    });
  }

  if (validationFailure) {
    items.push({
      id: "resume-pdf-validation-failed",
      severity: "blocking",
      message: `Server PDF: ${validationFailure.pageCount} page(s) — ${validationFailure.message}`,
    });
  } else if (
    isApprovedDraftStatus(resumeDraft.status) &&
    resumeDraft.content.serverPdfValidation?.pageCount !== 1
  ) {
    items.push({
      id: "resume-pdf-not-validated",
      severity: "blocking",
      message: "Server PDF not validated as one page.",
    });
  }

  if (resumeDraft.status === "needs_review") {
    items.push({
      id: "resume-needs-review",
      severity: "warning",
      message: "Resume needs structure review after automatic repair.",
    });
  }

  const structureMessages = resumeDraft.rationale?.structureRepair?.messages ?? [];
  if (structureMessages.length > 0) {
    items.push({
      id: "resume-structure-repair",
      severity: "warning",
      message: `Automatic structure repair applied (${structureMessages.length} note(s)).`,
    });
  }

  if (pageFit?.exceedsOnePage && !exportReady) {
    items.push({
      id: "resume-heuristic-overflow",
      severity: "warning",
      message: `Heuristic layout estimate: ~${pageFit.overflowLines} line(s) over one page (non-authoritative).`,
    });
  }

  items.push({
    id: "resume-fit-score",
    severity: "info",
    message: `Resume–Job Fit: ${fitAssessment.fitScore}/100 (provisional heuristic).`,
  });

  if (fitAssessment.scoreRationale.trim()) {
    items.push({
      id: "resume-fit-rationale",
      severity: "info",
      message: fitAssessment.scoreRationale,
    });
  }

  if (fitAssessment.keyStrengths.length > 0) {
    items.push({
      id: "resume-key-strengths",
      severity: "info",
      message: `Key strengths: ${fitAssessment.keyStrengths.join("; ")}.`,
    });
  }

  for (const flag of fitAssessment.riskFlags) {
    items.push({
      id: `resume-risk-${flag}`,
      severity: "warning",
      message: formatRiskFlagLabel(flag),
    });
  }

  const globalFlags = resumeDraft.content.globalRiskFlags ?? [];
  for (const flag of globalFlags.slice(0, 6)) {
    if (fitAssessment.riskFlags.includes(flag)) {
      continue;
    }
    items.push({
      id: `resume-global-risk-${flag}`,
      severity: "warning",
      message: formatRiskFlagLabel(flag),
    });
  }

  const audit = resumeDraft.rationale?.forcedBulletAudit;
  const forcedRequested =
    audit?.requestedKeys?.length ??
    resumeDraft.inputSnapshot?.regenerationControls?.forcedBulletKeys?.length ??
    0;

  if (forcedRequested > 0 || audit) {
    const included = audit?.includedInOutput?.length ?? 0;
    const unavailable = audit?.unavailableKeys?.length ?? 0;
    if (included > 0 || forcedRequested > 0) {
      items.push({
        id: "forced-bullets-included",
        severity: unavailable > 0 ? "warning" : "info",
        message: `Forced bullets included successfully: ${included}.`,
      });
    }
    if (unavailable > 0) {
      items.push({
        id: "forced-bullets-unavailable",
        severity: "warning",
        message: `Forced bullets unavailable: ${unavailable}.`,
      });
    }
    const missing = audit?.missingFromOutput?.length ?? 0;
    if (missing > 0) {
      items.push({
        id: "forced-bullets-missing",
        severity: "warning",
        message: `${missing} forced bullet(s) missing from output.`,
      });
    }
  }

  const hasIssues = items.some((item) => item.severity !== "info");
  return buildSection("resume", "Resume", items, hasIssues);
}

function buildCoverLetterSection(input: BuildApplicationReviewStatusInput): ApplicationReviewSection {
  const { coverLetter, coverLetterLoading, coverLetterPdfOverflow } = input;
  const items: ReviewItem[] = [];

  if (coverLetterLoading) {
    items.push({
      id: "cover-letter-loading",
      severity: "info",
      message: "Checking cover letter status…",
    });
    return buildSection("cover-letter", "Cover letter", items, false);
  }

  if (!coverLetter) {
    items.push({
      id: "cover-letter-missing",
      severity: "warning",
      message: "No cover letter generated for this application.",
    });
    return buildSection("cover-letter", "Cover letter", items, true);
  }

  items.push({
    id: "cover-letter-present",
    severity: "info",
    message: "Cover letter generated.",
  });

  const wordCount = countWords(coverLetter.body);
  items.push({
    id: "cover-letter-word-count",
    severity: isOverWordLimit(wordCount) ? "blocking" : isUnderWordMinimum(wordCount) ? "warning" : "info",
    message: formatWordCountLabel(wordCount),
  });

  const banned = detectBannedPhrases(coverLetter.body);
  if (banned.length > 0) {
    items.push({
      id: "cover-letter-banned-phrases",
      severity: "blocking",
      message: `Banned phrasing: ${banned.join(", ")}.`,
    });
  }

  if (coverLetterPdfOverflow) {
    items.push({
      id: "cover-letter-pdf-overflow",
      severity: "warning",
      message: "PDF preview content extends beyond one page.",
    });
  }

  for (const flag of coverLetter.rationale?.riskFlags ?? []) {
    items.push({
      id: `cover-letter-risk-${flag}`,
      severity: "warning",
      message: flag,
    });
  }

  const hasIssues = items.some((item) => item.severity !== "info");
  return buildSection("cover-letter", "Cover letter", items, hasIssues);
}

function buildCompanyResearchSection(
  companyContext: CompanyContext | null,
): ApplicationReviewSection {
  const items: ReviewItem[] = [];

  if (!companyContext) {
    items.push({
      id: "research-none",
      severity: "info",
      message: "No company research saved.",
    });
    return buildSection("company-research", "Company research", items, false);
  }

  const websiteBacked = hasWebsiteBackedResearch(companyContext);
  items.push({
    id: "research-source-type",
    severity: "info",
    message: websiteBacked
      ? "Website-backed research saved."
      : "JD-based context saved.",
  });

  const failedFirecrawl = companyContext.sources?.some(
    (source) => source.type === "firecrawl" && !source.success,
  );
  const fallbackLimitation = companyContext.limitations.some((limitation) =>
    /failed|fallback|jd-based|no company website/i.test(limitation),
  );

  if (failedFirecrawl || (!websiteBacked && fallbackLimitation)) {
    items.push({
      id: "research-fallback",
      severity: "warning",
      message: "Website research failed or was unavailable — JD-based context was used.",
    });
  }

  for (const limitation of companyContext.limitations.slice(0, 4)) {
    items.push({
      id: `research-limitation-${limitation}`,
      severity: "info",
      message: limitation,
    });
  }

  const hasWarnings = items.some((item) => item.severity === "warning");
  return buildSection("company-research", "Company research", items, hasWarnings);
}

export function resolveCompanySpecificityCounts(
  rationale: GeneratedCoverLetterDraftRecord["rationale"] | null | undefined,
): {
  available: boolean;
  companyFacts: number;
  roleRequirements: number;
  bridges: number;
} {
  if (!rationale) {
    return { available: false, companyFacts: 0, roleRequirements: 0, bridges: 0 };
  }

  const hasExtendedFields =
    rationale.selectedCompanyFacts !== undefined ||
    rationale.selectedRoleRequirements !== undefined ||
    rationale.companyRoleStoryBridges !== undefined;

  const companyFacts =
    rationale.selectedCompanyFacts?.length ?? rationale.companyContextUsed.length;
  const roleRequirements = rationale.selectedRoleRequirements?.length ?? 0;
  const bridges = rationale.companyRoleStoryBridges?.length ?? 0;

  return {
    available: hasExtendedFields || rationale.companyContextUsed.length > 0,
    companyFacts,
    roleRequirements,
    bridges,
  };
}

function buildExportSection(
  input: BuildApplicationReviewStatusInput,
  coverLetterReadiness: ReturnType<typeof evaluateCoverLetterExportReadiness>,
): { section: ApplicationReviewSection; artifacts: ExportArtifactReadiness[] } {
  const resumeReason = resumeExportBlockingReason(input);
  const resumeReady = input.exportReady;

  const coverLetterBody = input.coverLetter?.body;
  const coverLetterReady = coverLetterBody
    ? coverLetterReadiness.clientExportReady
    : false;
  const coverLetterReason = coverLetterBody
    ? coverLetterReadiness.clientBlockingReasons[0] ?? "Ready"
    : "No cover letter generated.";

  const artifacts: ExportArtifactReadiness[] = [
    {
      artifact: "resume_pdf",
      label: "Resume PDF",
      ready: resumeReady,
      reason: resumeReady ? "Ready" : resumeReason,
    },
    {
      artifact: "resume_docx",
      label: "Resume DOCX",
      ready: resumeReady,
      reason: resumeReady ? "Ready" : resumeReason,
    },
    {
      artifact: "cover_letter",
      label: "Cover letter",
      ready: coverLetterReady,
      reason: coverLetterReason,
    },
  ];

  const items: ReviewItem[] = artifacts.map((artifact) => {
    const isCoverLetterMissing = artifact.artifact === "cover_letter" && !coverLetterBody;
    return {
      id: `export-${artifact.artifact}`,
      severity: artifact.ready
        ? "info"
        : isCoverLetterMissing
          ? "warning"
          : "blocking",
      message: `${artifact.label}: ${artifact.ready ? "Ready" : isCoverLetterMissing ? "Not generated" : "Blocked"} — ${artifact.reason}`,
    };
  });

  if (
    coverLetterBody &&
    coverLetterReadiness.clientExportReady &&
    !coverLetterReadiness.serverExportReady
  ) {
    items.push({
      id: "cover-letter-server-mismatch",
      severity: "warning",
      message: `Server export may differ: ${coverLetterReadiness.serverBlockingReasons.join(" ")}`,
    });
  }

  const hasBlocking = items.some((item) => item.severity === "blocking");
  return {
    section: buildSection("export", "Export readiness", items, hasBlocking),
    artifacts,
  };
}

function buildEvidenceSection(
  resumeDraft: GeneratedResumeDraftRecord,
): ApplicationReviewSection {
  const audit = resumeDraft.rationale?.forcedBulletAudit;
  const evidenceUsage: ApplicationReviewEvidenceUsage = {
    resumeBulletsSelected:
      resumeDraft.rationale?.selectionAudit?.selectedBulletKeys?.length ??
      resumeDraft.content.experience.reduce(
        (total, experience) => total + experience.bullets.length,
        0,
      ),
    forcedBulletsIncluded: audit?.includedInOutput?.length ?? 0,
    forcedBulletsUnavailable: audit?.unavailableKeys?.length ?? 0,
    omissionsIdentified: resumeDraft.rationale?.omissions?.length ?? 0,
  };

  const items: ReviewItem[] = [
    {
      id: "evidence-bullets-selected",
      severity: "info",
      message: `Resume bullets selected: ${evidenceUsage.resumeBulletsSelected}.`,
    },
    {
      id: "evidence-forced-included",
      severity: "info",
      message: `Forced bullets included: ${evidenceUsage.forcedBulletsIncluded}.`,
    },
    {
      id: "evidence-omissions",
      severity: evidenceUsage.omissionsIdentified > 0 ? "warning" : "info",
      message: `Omissions identified: ${evidenceUsage.omissionsIdentified}.`,
    },
  ];

  if (evidenceUsage.forcedBulletsUnavailable > 0) {
    items.push({
      id: "evidence-forced-unavailable",
      severity: "warning",
      message: `Forced bullets unavailable: ${evidenceUsage.forcedBulletsUnavailable}.`,
    });
  }

  return buildSection("evidence", "Evidence usage", items, false);
}

function buildGenerationDetailsSection(
  details: ApplicationReviewGenerationDetails,
): ApplicationReviewSection {
  const items: ReviewItem[] = [];

  if (details.generatedAt) {
    items.push({
      id: "generated-at",
      severity: "info",
      message: `Generated: ${details.generatedAt}`,
    });
  }

  if (details.resume?.requestedTier || details.resume?.actualModel) {
    const fallback = details.resume.fallbackApplied ? " · Fallback applied" : "";
    items.push({
      id: "resume-model",
      severity: details.resume.fallbackApplied ? "warning" : "info",
      message: `Resume — Requested tier: ${details.resume.requestedTier ?? "standard"} · Actual model: ${details.resume.actualModel ?? "—"}${fallback}`,
    });
  }

  if (details.coverLetter?.requestedTier || details.coverLetter?.actualModel) {
    const fallback = details.coverLetter.fallbackApplied ? " · Fallback applied" : "";
    items.push({
      id: "cover-letter-model",
      severity: details.coverLetter.fallbackApplied ? "warning" : "info",
      message: `Cover letter — Requested tier: ${details.coverLetter.requestedTier ?? "standard"} · Actual model: ${details.coverLetter.actualModel ?? "—"}${fallback}`,
    });
  }

  return buildSection("generation", "Generation details", items, false);
}

function deriveOverallStatus(
  allItems: ReviewItem[],
  resumeExportReady: boolean,
  coverLetterExists: boolean,
  coverLetterExportReady: boolean,
): ApplicationReviewOverallStatus {
  const blockingItems = allItems.filter((item) => item.severity === "blocking");

  const resumeExportBlocking = !resumeExportReady;
  const coverLetterExportBlocking =
    coverLetterExists && !coverLetterExportReady;

  if (resumeExportBlocking || coverLetterExportBlocking) {
    return "NOT_READY_TO_EXPORT";
  }

  const nonExportBlocking = blockingItems.filter(
    (item) =>
      !item.id.startsWith("export-") &&
      item.id !== "cover-letter-banned-phrases" &&
      item.id !== "cover-letter-word-count",
  );

  if (nonExportBlocking.length > 0) {
    return "NOT_READY_TO_EXPORT";
  }

  const warningCount = allItems.filter((item) => item.severity === "warning").length;
  if (warningCount > 0) {
    return "REVIEW_RECOMMENDED";
  }

  return "READY_TO_EXPORT";
}

export function buildApplicationReviewStatus(
  input: BuildApplicationReviewStatusInput,
): ApplicationReviewStatus {
  const fitAssessment = calculateFitScore(input.resumeDraft.content, input.resumeDraft.rationale);
  const coverLetterReadiness = evaluateCoverLetterExportReadiness(input.coverLetter?.body);

  const resumeSection = buildResumeSection(input, fitAssessment);
  const coverLetterSection = buildCoverLetterSection(input);
  const companySection = buildCompanyResearchSection(input.companyContext);

  const specificity = resolveCompanySpecificityCounts(input.coverLetter?.rationale);
  if (specificity.available) {
    companySection.items.push({
      id: "company-specificity-from-cl-rationale",
      severity: "info",
      message: `Cover letter specificity: ${specificity.companyFacts} company facts, ${specificity.roleRequirements} role requirements, ${specificity.bridges} story bridges.`,
    });
    companySection.infoCount += 1;
  }

  const { section: exportSection, artifacts: exportReadiness } = buildExportSection(
    input,
    coverLetterReadiness,
  );
  const evidenceSection = buildEvidenceSection(input.resumeDraft);

  const generationDetails: ApplicationReviewGenerationDetails = {
    generatedAt: input.resumeDraft.inputSnapshot?.generatedAtRequest ?? input.resumeDraft.createdAt,
    resume: {
      requestedTier: input.resumeDraft.inputSnapshot?.resumeModelTier,
      actualModel: input.resumeDraft.modelName,
      fallbackApplied: input.resumeDraft.inputSnapshot?.modelFallbackApplied,
    },
    coverLetter: input.coverLetter
      ? {
          requestedTier: input.coverLetter.rationale?.modelSelection?.requestedTier,
          actualModel: input.coverLetter.modelName,
          fallbackApplied: input.coverLetter.rationale?.modelSelection?.fallbackApplied,
        }
      : undefined,
  };
  const generationSection = buildGenerationDetailsSection(generationDetails);

  const sections = [
    resumeSection,
    coverLetterSection,
    companySection,
    exportSection,
    evidenceSection,
    generationSection,
  ];

  const allItems = sections.flatMap((section) => section.items);
  const blockingCount = allItems.filter((item) => item.severity === "blocking").length;
  const warningCount = allItems.filter((item) => item.severity === "warning").length;

  const overallStatus = deriveOverallStatus(
    allItems,
    input.exportReady,
    Boolean(input.coverLetter?.body?.trim()),
    coverLetterReadiness.clientExportReady,
  );

  const evidenceUsage: ApplicationReviewEvidenceUsage = {
    resumeBulletsSelected:
      input.resumeDraft.rationale?.selectionAudit?.selectedBulletKeys?.length ??
      input.resumeDraft.content.experience.reduce(
        (total, experience) => total + experience.bullets.length,
        0,
      ),
    forcedBulletsIncluded: input.resumeDraft.rationale?.forcedBulletAudit?.includedInOutput?.length ?? 0,
    forcedBulletsUnavailable:
      input.resumeDraft.rationale?.forcedBulletAudit?.unavailableKeys?.length ?? 0,
    omissionsIdentified: input.resumeDraft.rationale?.omissions?.length ?? 0,
  };

  return {
    overallStatus,
    blockingCount,
    warningCount,
    sections,
    exportReadiness,
    evidenceUsage,
    generationDetails,
    fitAssessment,
  };
}
