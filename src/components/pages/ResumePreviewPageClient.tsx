"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
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
  getGeneratedResumeDraftFromCloud,
  updateGeneratedResumeDraftInCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumePreviewPageClientProps = {
  draftId: string;
};

export function ResumePreviewPageClient({ draftId }: ResumePreviewPageClientProps) {
  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [marginMm, setMarginMm] = useState(18);
  const [lineSpacing, setLineSpacing] = useState(1.15);
  const [sectionSpacing, setSectionSpacing] = useState(1.1);

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

  const layout = useMemo(
    () => (draft ? buildFinalResumeLayout(draft.content) : null),
    [draft],
  );

  const pageFit = useMemo(
    () =>
      layout
        ? estimatePageFit(layout, { marginMm, lineSpacing, sectionSpacing })
        : null,
    [layout, marginMm, lineSpacing, sectionSpacing],
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

  return (
    <>
      <PageHeader
        milestone="v0.5.2 · Resume Layout Fidelity Fixes"
        title="Final resume layout preview"
        description="Validate A4 formatting, density, and one-page fit before export. Section order: Header → Work Experience → Education → Additional Experience → Skills & Interests."
      />

      <p className="text-xs text-slate-500">
        Canonical section order: {FINAL_RESUME_SECTION_ORDER.join(" → ")}
      </p>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-3">
        <label className="text-sm text-slate-700">
          Margins (mm)
          <input
            type="range"
            min={12}
            max={24}
            value={marginMm}
            onChange={(event) => setMarginMm(Number(event.target.value))}
            className="mt-1 block w-full"
          />
        </label>
        <label className="text-sm text-slate-700">
          Line spacing
          <input
            type="range"
            min={100}
            max={140}
            value={Math.round(lineSpacing * 100)}
            onChange={(event) => setLineSpacing(Number(event.target.value) / 100)}
            className="mt-1 block w-full"
          />
        </label>
        <label className="text-sm text-slate-700">
          Section spacing
          <input
            type="range"
            min={80}
            max={160}
            value={Math.round(sectionSpacing * 100)}
            onChange={(event) => setSectionSpacing(Number(event.target.value) / 100)}
            className="mt-1 block w-full"
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FinalResumeLayoutPreview layout={layout} pageFit={pageFit} />
        <ResumeAssessmentPanel assessment={assessment} />
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
