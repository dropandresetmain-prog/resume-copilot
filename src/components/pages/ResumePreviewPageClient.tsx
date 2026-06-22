"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { FinalResumeLayoutPreview } from "@/components/resume-drafts/FinalResumeLayoutPreview";
import { ResumePdfPreview } from "@/components/resume-drafts/ResumePdfPreview";
import { ResumeAssessmentPanel } from "@/components/resume-drafts/ResumeAssessmentPanel";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { ApplicationPackageCoverLetterPanel } from "@/components/application-package/ApplicationPackageCoverLetterPanel";
import { ApplicationPackageSummary } from "@/components/application-package/ApplicationPackageSummary";
import { CompanyContextPreviewPanel } from "@/components/company-context/CompanyContextPreviewPanel";
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
        milestone="v0.9.8 · Application Package"
        title="Application package"
        description="Review your resume, cover letter, and company research in one place."
      />

      <div className="space-y-6">
        <ApplicationPackageSummary
          companyName={linkedJob?.companyName}
          roleTitle={linkedJob?.roleTitle}
          resumeDraft={draft}
          coverLetter={coverLetter}
          coverLetterLoading={coverLetterLoading}
          companyContext={companyContext}
        />

        <SetupCard
          title="Resume"
          description="Primary artifact — tune layout, approve for export, then download PDF or DOCX."
        >
          {layoutChangedAfterApproval ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Layout changed after approval. Re-approve for Export to run server validation again.
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {documentModel ? <ResumePdfPreview documentModel={documentModel} /> : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Layout controls
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            </div>

            {validationFailure ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p className="font-medium">
                  Server PDF: {validationFailure.pageCount} page(s) — export blocked
                </p>
                <p className="mt-1">{validationFailure.message}</p>
              </div>
            ) : serverPdfValidation ? (
              <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                Server PDF validated — 1 page. Approved for export.
              </p>
            ) : isApproving ? (
              <p className="text-sm text-slate-600">Validating server PDF layout…</p>
            ) : null}

            <div className="flex flex-wrap items-end gap-3" data-section="resume-approve-export">
              <button
                type="button"
                onClick={handleApproveForExport}
                disabled={isApproving || !canApprove}
                className={primaryButtonClassName}
              >
                {approveButtonLabel}
              </button>
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
            </div>

            {exportWarning ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {exportWarning}
              </p>
            ) : null}
          </div>
        </SetupCard>

        <div data-section="application-package-cover-letter">
          <ApplicationPackageCoverLetterPanel
            draft={draft}
            job={linkedJob ?? undefined}
            onCoverLetterChange={setCoverLetter}
            onLoadingChange={setCoverLetterLoading}
          />
        </div>

        {companyContext ? (
          <div data-section="application-package-company-research">
            <CompanyContextPreviewPanel
            context={companyContext}
            applicationId={draft.applicationId}
            defaultOpen={false}
            onSaved={setCompanyContext}
          />
          </div>
        ) : null}

        {showEditResumeContent ? (
          <div className="space-y-3">
            <ResumeEvidenceRegenerationPanel
              draft={draft}
              inventory={inventory}
              jobDescription={linkedJob}
              onDraftUpdated={setDraft}
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/resume-preview/${draftId}/edit`}
                className={`inline-flex ${secondaryButtonClassName}`}
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
          <button
            type="button"
            onClick={() => setShowEditResumeContent(true)}
            className={secondaryButtonClassName}
            data-action="edit-resume-content-toggle"
          >
            Edit resume content
          </button>
        )}

        <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-900">
            Advanced options
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

            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Advanced browser layout estimate
              </summary>
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
            </details>

            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                PDF layout HTML source
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-800">
                {documentModel ? renderResumePdfHtml(documentModel) : ""}
              </pre>
            </details>

            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Debug JSON
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto text-xs text-slate-800">
                {JSON.stringify({ content: draft.content, rationale: draft.rationale }, null, 2)}
              </pre>
            </details>
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
