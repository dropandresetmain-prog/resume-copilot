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
import { ResumeCoverLetterPanel } from "@/components/cover-letters/ResumeCoverLetterPanel";
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
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumePreviewPageClientProps = {
  draftId: string;
};

export function ResumePreviewPageClient({ draftId }: ResumePreviewPageClientProps) {
  const { inventory, jobDescriptions } = useWorkspace();
  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
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
        milestone="v0.9.7 · Application Package"
        title="Application package"
        description="Review your tailored resume first, then the cover letter and company research used for this application."
      />

      <p className="text-xs text-slate-500">
        Canonical section order: {FINAL_RESUME_SECTION_ORDER.join(" → ")} · Font:{" "}
        {fontFamily.split(",")[0]}
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-800">PDF Preview</h2>
            <p className="text-xs text-slate-500">
              Same print HTML/CSS as export — local browser rendering only. Server PDF validation on
              Approve is export truth.
            </p>
          </div>

          {layoutChangedAfterApproval ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Layout changed after approval. PDF Preview shows your current settings — click
              &quot;Re-approve for Export&quot; to run server validation again.
            </p>
          ) : null}

          {documentModel ? <ResumePdfPreview documentModel={documentModel} /> : null}

          <div className="sticky top-2 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
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
        </section>

        <ResumeAssessmentPanel
          assessment={assessment}
          pageFit={pageFit}
          optimizationNote={optimizationNote}
          serverPdfValidation={serverPdfValidation}
          validationFailure={validationFailure}
          isValidating={isApproving}
        />

        <ResumeCoverLetterPanel
          draft={draft}
          job={jobDescriptions.find((job) => job.id === draft.jobDescriptionId)}
        />

        {companyContext ? (
          <CompanyContextPreviewPanel
            context={companyContext}
            applicationId={draft.applicationId}
            defaultOpen
            onSaved={setCompanyContext}
          />
        ) : null}

        <ResumeEvidenceRegenerationPanel
          draft={draft}
          inventory={inventory}
          jobDescription={
            jobDescriptions.find((job) => job.id === draft.jobDescriptionId) ?? null
          }
          onDraftUpdated={setDraft}
        />
      </div>

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Advanced — approximate layout estimate (browser only)
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          Uses separate browser spacing — not used for export. Trust PDF Preview above for final
          layout.
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

      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={handleApproveForExport}
          disabled={isApproving || !canApprove}
          className={primaryButtonClassName}
        >
          {approveButtonLabel}
        </button>
        <div className="inline-flex flex-col gap-1">
          <DownloadResumeDocxButton
            draftId={draftId}
            layoutSettings={currentLayoutSettings}
            disabled={!exportReady}
            disabledReason={exportDisabledReason}
            onHint={setExportWarning}
          />
          <p className="max-w-xs text-xs text-slate-500">
            DOCX is editable and may reflow or exceed one page in Word. PDF is the final layout.
          </p>
        </div>
        <DownloadResumePdfButton
          draftId={draftId}
          layoutSettings={currentLayoutSettings}
          disabled={!exportReady}
          disabledReason={exportDisabledReason}
          onWarning={setExportWarning}
        />
        <Link
          href={`/resume-preview/${draftId}/edit`}
          className={`inline-flex ${secondaryButtonClassName}`}
        >
          Edit Resume Details
        </Link>
        <Link href="/generate" className={`inline-flex ${secondaryButtonClassName}`}>
          Back to Generate
        </Link>
      </div>

      {exportWarning ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {exportWarning}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          PDF layout HTML source (debug)
        </summary>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-800">
          {documentModel ? renderResumePdfHtml(documentModel) : ""}
        </pre>
      </details>

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Debug JSON</summary>
        <pre className="mt-2 max-h-80 overflow-auto text-xs text-slate-800">
          {JSON.stringify({ content: draft.content, rationale: draft.rationale }, null, 2)}
        </pre>
      </details>
    </>
  );
}
