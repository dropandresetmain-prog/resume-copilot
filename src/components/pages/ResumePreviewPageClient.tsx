"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { FinalResumeLayoutPreview } from "@/components/resume-drafts/FinalResumeLayoutPreview";
import { ResumeAssessmentPanel } from "@/components/resume-drafts/ResumeAssessmentPanel";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import {
  buildFinalResumeLayout,
  calculateFitScore,
  estimatePageFit,
  FINAL_RESUME_SECTION_ORDER,
} from "@/lib/resume-draft/layout";
import {
  clampPreviewBodyFontPx,
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_BODY_FONT_MAX_PX,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_MAX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_DEFAULT_MM,
  PREVIEW_MARGIN_MAX_MM,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_DEFAULT_MM,
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
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumePreviewPageClientProps = {
  draftId: string;
};

export function ResumePreviewPageClient({ draftId }: ResumePreviewPageClientProps) {
  const { inventory } = useWorkspace();
  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [manualSettings, setManualSettings] = useState<{
    draftId: string;
    bodyFontPx: number;
    marginMm: number;
    marginTopMm: number;
    lineSpacing: number;
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

  const referenceFormat = useMemo(() => {
    if (!draft?.referenceResumeId) {
      return null;
    }
    const referenceResume = inventory.resumes.find(
      (resume) => resume.id === draft.referenceResumeId,
    );
    return referenceResume ? buildReferenceResumeFormatProfile(referenceResume) : null;
  }, [draft, inventory.resumes]);

  const fontFamily = referenceFormat?.fontFamily ?? DEFAULT_RESUME_FONT_FAMILY;
  const headerAlignment = referenceFormat?.headerAlignment ?? "center";

  const layout = useMemo(
    () => (draft ? buildFinalResumeLayout(draft.content) : null),
    [draft],
  );

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
  const sectionSpacing = activeSettings?.sectionSpacing ?? PREVIEW_SECTION_SPACING_DEFAULT;
  const marginTopMm = activeSettings?.marginTopMm ?? PREVIEW_MARGIN_TOP_DEFAULT_MM;
  const optimizationNote =
    settingsOverride === null
      ? autoSettings?.optimizationNote ?? autoSettings?.warning
      : undefined;

  function updateManualSettings(next: {
    bodyFontPx: number;
    marginMm: number;
    marginTopMm: number;
    lineSpacing: number;
    sectionSpacing: number;
  }) {
    if (!draftId) return;
    setManualSettings({ draftId, ...next });
  }

  const pageFit = useMemo(
    () =>
      layout
        ? estimatePageFit(layout, {
            marginMm,
            marginTopMm,
            lineSpacing,
            sectionSpacing,
            bodyFontPx,
          })
        : null,
    [layout, marginMm, marginTopMm, lineSpacing, sectionSpacing, bodyFontPx],
  );

  const assessment = useMemo(
    () => (draft ? calculateFitScore(draft.content, draft.rationale) : null),
    [draft],
  );

  async function handleApproveForExport() {
    if (!draft) return;
    setIsApproving(true);
    setError(null);
    try {
      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: draft.content,
        status: "approved",
      });
      setDraft(updated);
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Failed to approve draft for export.",
      );
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

  const isApproved = draft.status === "approved";
  const bodyFontSliderSteps = Math.round(
    (PREVIEW_BODY_FONT_MAX_PX - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX,
  );

  return (
    <>
      <PageHeader
        milestone="v0.5.4 · Draft Records + One-Page Optimization"
        title="Resume Preview"
        description="Format-optimized one-page preview. Adjust layout only if needed, then approve for export."
      />

      <p className="text-xs text-slate-500">
        Canonical section order: {FINAL_RESUME_SECTION_ORDER.join(" → ")} · Font: {fontFamily.split(",")[0]}
      </p>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-700">
          Body font ({bodyFontPx}px)
          <input
            type="range"
            min={0}
            max={bodyFontSliderSteps}
            step={1}
            value={Math.round((bodyFontPx - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX)}
            onChange={(event) =>
              updateManualSettings({
                bodyFontPx: clampPreviewBodyFontPx(
                  PREVIEW_BODY_FONT_MIN_PX +
                    Number(event.target.value) * PREVIEW_BODY_FONT_STEP_PX,
                ),
                marginMm,
                marginTopMm,
                lineSpacing,
                sectionSpacing,
              })
            }
            className="mt-1 block w-full"
          />
        </label>
        <label className="text-sm text-slate-700">
          Margins ({marginMm}mm)
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
                sectionSpacing: Number(event.target.value) / 100,
              })
            }
            className="mt-1 block w-full"
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FinalResumeLayoutPreview
          layout={layout}
          pageFit={pageFit}
          fontFamily={fontFamily}
          bodyFontPx={bodyFontPx}
          headerAlignment={headerAlignment}
        />
        <ResumeAssessmentPanel
          assessment={assessment}
          pageFit={pageFit}
          optimizationNote={optimizationNote}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleApproveForExport}
          disabled={isApproving || isApproved}
          className={primaryButtonClassName}
        >
          {isApproved ? "Approved for export" : isApproving ? "Saving…" : "Approve for Export"}
        </button>
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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Debug JSON</summary>
        <pre className="mt-2 max-h-80 overflow-auto text-xs text-slate-800">
          {JSON.stringify({ content: draft.content, rationale: draft.rationale }, null, 2)}
        </pre>
      </details>
    </>
  );
}
