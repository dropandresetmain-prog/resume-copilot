"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { pageMilestone } from "@/lib/app-version";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { FinalResumeLayoutPreview } from "@/components/resume-drafts/FinalResumeLayoutPreview";
import { ResumePdfPreview } from "@/components/resume-drafts/ResumePdfPreview";
import { ResumeAssessmentPanel } from "@/components/resume-drafts/ResumeAssessmentPanel";
import {
  actionBarClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { ApplicationPackageCoverLetterPanel } from "@/components/application-package/ApplicationPackageCoverLetterPanel";
import { ApplicationReviewCenter } from "@/components/application-package/ApplicationReviewCenter";
import { CompanyContextPreviewPanel } from "@/components/company-context/CompanyContextPreviewPanel";
import { buildApplicationReviewStatus } from "@/lib/application-review/build-application-review-status";
import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
import { ResumeEvidenceRegenerationPanel } from "@/components/resume-drafts/ResumeEvidenceRegenerationPanel";
import { DownloadResumeDocxButton } from "@/components/resume-drafts/DownloadResumeDocxButton";
import { DownloadResumePdfButton } from "@/components/resume-drafts/DownloadResumePdfButton";
import {
  approveResumeDraftForExport,
  formatOnePageBlockedMessage,
  ResumePdfOnePageBlockedError,
} from "@/lib/resume-draft/approve-resume-draft-client";
import { buildExportResumeDocumentModel } from "@/lib/resume-draft/build-export-document-model";
import {
  RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
} from "@/lib/resume-draft/draft-status";
import {
  areExportLayoutSettingsEqual,
} from "@/lib/resume-draft/export-layout-settings";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";
import { calculateFitScore, FINAL_RESUME_SECTION_ORDER } from "@/lib/resume-draft/layout";
import {
  clampPreviewBodyFontPx,
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_BODY_FONT_MAX_PX,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_MAX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_DEFAULT_MM,
  PREVIEW_MARGIN_MAX_MM,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_MARGIN_TOP_MAX_MM,
  PREVIEW_SECTION_SPACING_DEFAULT,
  PREVIEW_SECTION_SPACING_MAX,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import { buildReferenceResumeFormatProfile } from "@/lib/resume-draft/reference-format";
import { optimizeResumePreviewSettings } from "@/lib/resume-draft/preview-optimizer";
import {
  getGeneratedResumeDraftFromCloud,
  updateGeneratedResumeDraftInCloud,
} from "@/lib/supabase/generated-resume-drafts";
import { getApplicationRecordFromCloud } from "@/lib/supabase/application-records";
import type { CompanyContext } from "@/types/company-context";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumePreviewPageClientProps = {
  draftId: string;
};

export function ResumePreviewPageClient({ draftId }: ResumePreviewPageClientProps) {
  const { inventory, jobDescriptions } = useWorkspace();
  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(true);
  const [coverLetterPdfOverflow, setCoverLetterPdfOverflow] = useState(false);
  const [showEditResumeContent, setShowEditResumeContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportWarning, setExportWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [validationFailure, setValidationFailure] = useState<{
    pageCount: number;
    message: string;
    suggestedActions: string[];
  } | null>(null);
  const layoutChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash === "#package-edit") {
      setShowEditResumeContent(true);
    }
  }, [draftId]);
  const [manualSettings, setManualSettings] = useState<{
    draftId: string;
    bodyFontPx: number;
    marginMm: number;
    marginTopMm: number;
    lineSpacing: number;
    itemLineSpacing: number;
    sectionSpacing: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoading(true);
      setError(null);
      try {
        const record = await getGeneratedResumeDraftFromCloud(draftId);
        if (!cancelled) {
          if (!record) {
            setError("Resume draft not found.");
            setDraft(null);
          } else {
            setDraft(record);
            const stored = record.content.exportLayoutSettings;
            if (stored) {
              setManualSettings({
                draftId: record.id,
                bodyFontPx: stored.bodyFontPx,
                marginMm: stored.marginMm,
                marginTopMm: stored.marginTopMm,
                lineSpacing: stored.lineSpacing,
                itemLineSpacing: stored.itemLineSpacing ?? PREVIEW_ITEM_LINE_SPACING_DEFAULT,
                sectionSpacing: stored.sectionSpacing,
              });
            }
            if (record.applicationId) {
              const application = await getApplicationRecordFromCloud(record.applicationId);
              if (!cancelled) {
                setCompanyContext(application?.companyContext ?? null);
              }
            } else if (!cancelled) {
              setCompanyContext(null);
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load resume draft.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const referenceResume = useMemo(() => {
    if (!draft?.referenceResumeId) {
      return null;
    }
    return (
      inventory.resumes.find((resume) => resume.id === draft.referenceResumeId) ?? null
    );
  }, [draft, inventory.resumes]);

  const referenceFormat = useMemo(() => {
    return referenceResume ? buildReferenceResumeFormatProfile(referenceResume) : null;
  }, [referenceResume]);

  const fontFamily = referenceFormat?.fontFamily ?? DEFAULT_RESUME_FONT_FAMILY;
  const headerAlignment = referenceFormat?.headerAlignment ?? "center";

  const autoSettings = useMemo(
    () => (draft ? optimizeResumePreviewSettings(draft.content) : null),
    [draft],
  );

  const settingsOverride =
    manualSettings?.draftId === draftId ? manualSettings : null;
  const activeSettings = settingsOverride ?? autoSettings;
  const bodyFontPx = activeSettings?.bodyFontPx ?? PREVIEW_BODY_FONT_DEFAULT_PX;
  const marginMm = activeSettings?.marginMm ?? PREVIEW_MARGIN_DEFAULT_MM;
  const lineSpacing = activeSettings?.lineSpacing ?? PREVIEW_LINE_SPACING_DEFAULT;
  const itemLineSpacing =
    activeSettings?.itemLineSpacing ?? PREVIEW_ITEM_LINE_SPACING_DEFAULT;
  const sectionSpacing = activeSettings?.sectionSpacing ?? PREVIEW_SECTION_SPACING_DEFAULT;
  const marginTopMm = activeSettings?.marginTopMm ?? PREVIEW_MARGIN_TOP_DEFAULT_MM;
  const optimizationNote =
    settingsOverride === null
      ? autoSettings?.optimizationNote ?? autoSettings?.warning
      : undefined;

  const linkedJob = useMemo(() => {
    if (!draft?.jobDescriptionId) {
      return null;
    }
    return jobDescriptions.find((job) => job.id === draft.jobDescriptionId) ?? null;
  }, [draft, jobDescriptions]);

  const documentModel = useMemo(() => {
    if (!draft) {
      return null;
    }
    return buildExportResumeDocumentModel({
      draft,
      jobDescription: linkedJob,
      companyContext,
      referenceResume,
      layoutSettings: {
        bodyFontPx,
        marginMm,
        marginTopMm,
        lineSpacing,
        itemLineSpacing,
        sectionSpacing,
      },
    });
  }, [
    draft,
    bodyFontPx,
    marginMm,
    marginTopMm,
    lineSpacing,
    itemLineSpacing,
    sectionSpacing,
    linkedJob,
    referenceResume,
    companyContext,
  ]);

  const layout = documentModel?.layout ?? null;
  const pageFit = documentModel?.pageFit ?? null;

  const assessment = useMemo(
    () => (draft ? calculateFitScore(draft.content, draft.rationale) : null),
    [draft],
  );

  const currentLayoutSettings = useMemo(
    () => ({
      bodyFontPx,
      marginMm,
      marginTopMm,
      lineSpacing,
      itemLineSpacing,
      sectionSpacing,
    }),
    [bodyFontPx, marginMm, marginTopMm, lineSpacing, itemLineSpacing, sectionSpacing],
  );

  const exportReady = Boolean(
    draft &&
      isApprovedDraftStatus(draft.status) &&
      areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, currentLayoutSettings) &&
      draft.content.serverPdfValidation?.pageCount === 1,
  );

  const serverPdfValidation =
    exportReady &&
    draft?.content.serverPdfValidation &&
    areExportLayoutSettingsEqual(
      draft.content.exportLayoutSettings,
      currentLayoutSettings,
    )
      ? draft.content.serverPdfValidation
      : null;

  const layoutChangedAfterApproval = Boolean(
    draft && isLayoutChangedAfterApprovalStatus(draft.status),
  );

  const reviewStatus = useMemo(() => {
    if (!draft) {
      return null;
    }
    return buildApplicationReviewStatus({
      resumeDraft: draft,
      coverLetter,
      coverLetterLoading,
      companyContext,
      exportReady,
      layoutChangedAfterApproval,
      currentLayoutSettings,
      validationFailure,
      pageFit,
      coverLetterPdfOverflow,
    });
  }, [
    draft,
    coverLetter,
    coverLetterLoading,
    companyContext,
    exportReady,
    layoutChangedAfterApproval,
    currentLayoutSettings,
    validationFailure,
    pageFit,
    coverLetterPdfOverflow,
  ]);

  const displayCompany = formatCompanyNameForDisplay({
    rawName: linkedJob?.companyName,
    website: companyContext?.website,
    savedDisplayName: companyContext?.displayName,
  });

  useEffect(() => {
    return () => {
      if (layoutChangeTimerRef.current) {
        clearTimeout(layoutChangeTimerRef.current);
      }
    };
  }, []);

  async function markLayoutChangedAfterApproval(next: {
    bodyFontPx: number;
    marginMm: number;
    marginTopMm: number;
    lineSpacing: number;
    itemLineSpacing: number;
    sectionSpacing: number;
  }) {
    if (!draft || !isApprovedDraftStatus(draft.status)) {
      return;
    }
    if (areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, next)) {
      return;
    }

    try {
      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: {
          ...draft.content,
          serverPdfValidation: undefined,
        },
        status: RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
      });
      setDraft(updated);
      setValidationFailure(null);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Failed to mark layout change after approval.",
      );
    }
  }

  function updateManualSettings(next: {
    bodyFontPx: number;
    marginMm: number;
    marginTopMm: number;
    lineSpacing: number;
    itemLineSpacing: number;
    sectionSpacing: number;
  }) {
    if (!draftId) return;
    setManualSettings({ draftId, ...next });
    setValidationFailure(null);

    if (layoutChangeTimerRef.current) {
      clearTimeout(layoutChangeTimerRef.current);
    }
    layoutChangeTimerRef.current = setTimeout(() => {
      void markLayoutChangedAfterApproval(next);
    }, 300);
  }

  async function handleApproveForExport() {
    if (!draft) return;
    setIsApproving(true);
    setError(null);
    setValidationFailure(null);
    try {
      const result = await approveResumeDraftForExport({
        draftId: draft.id,
        layoutSettings: currentLayoutSettings,
      });
      setDraft(result.draft);
      setExportWarning(null);
    } catch (approveError) {
      if (approveError instanceof ResumePdfOnePageBlockedError) {
        setValidationFailure({
          pageCount: approveError.pageCount,
          message: approveError.message,
          suggestedActions: approveError.suggestedActions,
        });
        setError(formatOnePageBlockedMessage(approveError));
      } else {
        setError(
          approveError instanceof Error
            ? approveError.message
            : "Failed to approve draft for export.",
        );
      }
    } finally {
      setIsApproving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading resume preview…</p>;
  }

  if (error && !draft) {
    return (
      <SetupCard title="Resume preview unavailable">
        <p className="mt-3 text-sm text-red-700">{error}</p>
        <Link href="/generate" className={`mt-4 inline-flex ${secondaryButtonClassName}`}>
          Back to Generate
        </Link>
      </SetupCard>
    );
  }

  if (!draft || !layout || !pageFit || !assessment) {
    return null;
  }

  const canApprove = !isApproving && !exportReady;
  const approveButtonLabel = isApproving
    ? "Validating server PDF…"
    : exportReady
      ? "Approved for export"
      : layoutChangedAfterApproval || isApprovedDraftStatus(draft.status)
        ? "Re-approve for Export"
        : "Approve for Export";
  const exportDisabledReason = layoutChangedAfterApproval
    ? "Layout changed after approval — re-approve for Export before downloading."
    : !isApprovedDraftStatus(draft.status) || draft.content.serverPdfValidation?.pageCount !== 1
      ? "Approve for Export (server one-page validation) before downloading PDF."
      : "Approve for Export before downloading.";
  const bodyFontSliderSteps = Math.round(
    (PREVIEW_BODY_FONT_MAX_PX - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX,
  );

  return (
    <>
      <PageHeader
        compact
        eyebrow="Package"
        milestone={pageMilestone("Application Package")}
        title="Application package"
        description="Review and approve your tailored resume and cover letter, then export."
      />

      <div className="space-y-6">
        {/* Two-column layout on lg+: compact action rail left, resume preview right */}
        <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6">

          {/* Left: sticky review / approve / export rail */}
          <div className="space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {reviewStatus ? (
              <ApplicationReviewCenter
                companyName={displayCompany}
                roleTitle={linkedJob?.roleTitle ?? draft.content.targetRoleTitle}
                reviewStatus={reviewStatus}
                resumeDraftId={draftId}
                coverLetterId={coverLetter?.id}
                onApproveForExport={() => void handleApproveForExport()}
                isApproving={isApproving}
                canApprove={canApprove}
                approveButtonLabel={approveButtonLabel}
                exportReady={exportReady}
                exportControls={
                  <>
                    <DownloadResumePdfButton
                      draftId={draftId}
                      layoutSettings={currentLayoutSettings}
                      disabled={!exportReady}
                      disabledReason={exportDisabledReason}
                      onWarning={setExportWarning}
                    />
                    <div className="inline-flex flex-col gap-1">
                      <DownloadResumeDocxButton
                        draftId={draftId}
                        layoutSettings={currentLayoutSettings}
                        disabled={!exportReady}
                        disabledReason={exportDisabledReason}
                        onHint={setExportWarning}
                      />
                      <p className="max-w-xs text-xs text-slate-500">
                        PDF is the final layout. DOCX is editable and may reflow in Word.
                      </p>
                    </div>
                  </>
                }
              />
            ) : null}

            {validationFailure ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p className="font-medium">
                  Server PDF: {validationFailure.pageCount} page(s) — export blocked
                </p>
                <p className="mt-1">{validationFailure.message}</p>
              </div>
            ) : isApproving ? (
              <p className="text-sm text-slate-600">Validating server PDF layout…</p>
            ) : null}

            {exportWarning ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {exportWarning}
              </p>
            ) : null}
          </div>

          {/* Right: resume PDF preview — dominant artifact in first viewport */}
          <SetupCard
            className="scroll-mt-24 mt-4 lg:mt-0"
            title="Resume"
            description="Preview the final PDF and tune layout if needed."
            variant="primary"
          >
          <div id="package-resume" className="mt-4 space-y-4">
            {documentModel ? <ResumePdfPreview documentModel={documentModel} /> : null}

            <details
              id="package-layout-controls"
              className="scroll-mt-32 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
                Layout controls
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <label className="text-sm text-slate-700">
                  Body font ({bodyFontPx}px)
                  <input
                    type="range"
                    min={0}
                    max={bodyFontSliderSteps}
                    step={1}
                    value={Math.round(
                      (bodyFontPx - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX,
                    )}
                    onChange={(event) =>
                      updateManualSettings({
                        bodyFontPx: clampPreviewBodyFontPx(
                          PREVIEW_BODY_FONT_MIN_PX +
                            Number(event.target.value) * PREVIEW_BODY_FONT_STEP_PX,
                        ),
                        marginMm,
                        marginTopMm,
                        lineSpacing,
                        itemLineSpacing,
                        sectionSpacing,
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Side margins ({marginMm}mm)
                  <input
                    type="range"
                    min={PREVIEW_MARGIN_MIN_MM}
                    max={PREVIEW_MARGIN_MAX_MM}
                    value={marginMm}
                    onChange={(event) =>
                      updateManualSettings({
                        bodyFontPx,
                        marginMm: Number(event.target.value),
                        marginTopMm,
                        lineSpacing,
                        itemLineSpacing,
                        sectionSpacing,
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Top margin ({marginTopMm}mm)
                  <input
                    type="range"
                    min={PREVIEW_MARGIN_TOP_MIN_MM}
                    max={PREVIEW_MARGIN_TOP_MAX_MM}
                    value={marginTopMm}
                    onChange={(event) =>
                      updateManualSettings({
                        bodyFontPx,
                        marginMm,
                        marginTopMm: Number(event.target.value),
                        lineSpacing,
                        itemLineSpacing,
                        sectionSpacing,
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Line spacing ({lineSpacing.toFixed(2)})
                  <input
                    type="range"
                    min={Math.round(PREVIEW_LINE_SPACING_MIN * 100)}
                    max={Math.round(PREVIEW_LINE_SPACING_MAX * 100)}
                    value={Math.round(lineSpacing * 100)}
                    onChange={(event) =>
                      updateManualSettings({
                        bodyFontPx,
                        marginMm,
                        marginTopMm,
                        lineSpacing: Number(event.target.value) / 100,
                        itemLineSpacing,
                        sectionSpacing,
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Section spacing ({sectionSpacing.toFixed(2)}rem)
                  <input
                    type="range"
                    min={Math.round(PREVIEW_SECTION_SPACING_MIN * 100)}
                    max={Math.round(PREVIEW_SECTION_SPACING_MAX * 100)}
                    value={Math.round(sectionSpacing * 100)}
                    onChange={(event) =>
                      updateManualSettings({
                        bodyFontPx,
                        marginMm,
                        marginTopMm,
                        lineSpacing,
                        itemLineSpacing,
                        sectionSpacing: Number(event.target.value) / 100,
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </label>
              </div>
            </details>

          </div>
          </SetupCard>
        </div>{/* end two-column grid */}

        <div
          id="package-cover-letter"
          className="scroll-mt-32"
          data-section="application-package-cover-letter"
        >
          <ApplicationPackageCoverLetterPanel
            draft={draft}
            job={linkedJob ?? undefined}
            onCoverLetterChange={setCoverLetter}
            onLoadingChange={setCoverLetterLoading}
            onPdfOverflowChange={setCoverLetterPdfOverflow}
          />
        </div>

        {companyContext ? (
          <div
            id="package-research"
            className="scroll-mt-32"
            data-section="application-package-company-research"
          >
            <CompanyContextPreviewPanel
              context={companyContext}
              applicationId={draft.applicationId}
              defaultOpen={false}
              onSaved={setCompanyContext}
            />
          </div>
        ) : null}

        <div id="package-edit" className="scroll-mt-32">
          {showEditResumeContent ? (
            <div className={`${actionBarClassName} space-y-3`}>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Fix evidence
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Include or exclude inventory evidence, then rewrite affected roles or
                  regenerate the full resume.
                </p>
              </div>
              <ResumeEvidenceRegenerationPanel
                draft={draft}
                inventory={inventory}
                jobDescription={linkedJob}
                onDraftUpdated={setDraft}
              />
              <div className={secondaryActionGroupClassName}>
                <Link
                  href={`/resume-preview/${draftId}/edit`}
                  className={secondaryButtonClassName}
                >
                  Open resume text editor
                </Link>
                <button
                  type="button"
                  onClick={() => setShowEditResumeContent(false)}
                  className={secondaryButtonClassName}
                >
                  Hide edit resume content
                </button>
              </div>
            </div>
          ) : (
            <div className={actionBarClassName}>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Secondary editing
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Open only when the generated content needs targeted changes.
              </p>
              <button
                type="button"
                onClick={() => setShowEditResumeContent(true)}
                className={`${secondaryButtonClassName} mt-3 w-full sm:w-auto`}
                data-action="edit-resume-content-toggle"
              >
                Fix evidence
              </button>
            </div>
          )}
        </div>

        <details
          id="package-details"
          className="scroll-mt-32 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-900">
            Developer details
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Canonical section order: {FINAL_RESUME_SECTION_ORDER.join(" → ")} · Font:{" "}
              {fontFamily.split(",")[0]}
            </p>

            <ResumeAssessmentPanel
              assessment={assessment}
              pageFit={pageFit}
              optimizationNote={optimizationNote}
              serverPdfValidation={serverPdfValidation}
              validationFailure={validationFailure}
              isValidating={isApproving}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-medium text-slate-700">
                Advanced browser layout estimate
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                Approximate browser-only spacing — not used for export. Trust PDF Preview above.
              </p>
              <div className="mt-4">
                <FinalResumeLayoutPreview
                  layout={layout}
                  pageFit={pageFit}
                  fontFamily={fontFamily}
                  bodyFontPx={bodyFontPx}
                  headerAlignment={headerAlignment}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-medium text-slate-700">
                PDF layout HTML source
              </h3>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-800">
                {documentModel ? renderResumePdfHtml(documentModel) : ""}
              </pre>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-medium text-slate-700">
                Debug JSON
              </h3>
              <pre className="mt-2 max-h-80 overflow-auto text-xs text-slate-800">
                {JSON.stringify({ content: draft.content, rationale: draft.rationale }, null, 2)}
              </pre>
            </section>
          </div>
        </details>

        <Link href="/generate" className={`inline-flex ${secondaryButtonClassName}`}>
          Back to Generate
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </>
  );
}
