"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CoverLetterBodyViewSwitch,
  type CoverLetterBodyView,
} from "@/components/cover-letters/CoverLetterBodyViewSwitch";
import { CoverLetterPdfPreview } from "@/components/cover-letters/CoverLetterPdfPreview";
import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import {
  actionBarClassName,
  primaryButtonClassName,
  primaryActionGroupClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { splitCoverLetterParagraphs } from "@/lib/cover-letter/format-body";
import { evaluateCoverLetterClientExportReadiness } from "@/lib/application-review/cover-letter-export-readiness";
import { buildCoverLetterGenerationOptions } from "@/lib/generate/build-cover-letter-options";
import { generateAndSaveCoverLetterDraft } from "@/lib/generate/cover-letter-generation";
import { findCoverLetterDraftByResumeDraftId } from "@/lib/supabase/generated-cover-letter-drafts";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ApplicationPackageCoverLetterPanelProps = {
  draft: GeneratedResumeDraftRecord;
  job?: StoredJobDescription;
  onCoverLetterChange?: (coverLetter: GeneratedCoverLetterDraftRecord | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  onPdfOverflowChange?: (exceedsOnePage: boolean) => void;
};

export function ApplicationPackageCoverLetterPanel({
  draft,
  job,
  onCoverLetterChange,
  onLoadingChange,
  onPdfOverflowChange,
}: ApplicationPackageCoverLetterPanelProps) {
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [bodyView, setBodyView] = useState<CoverLetterBodyView>("pdf");

  useEffect(() => {
    let cancelled = false;
    onLoadingChange?.(true);
    void findCoverLetterDraftByResumeDraftId(draft.id)
      .then((record) => {
        if (!cancelled) {
          setCoverLetter(record);
          onCoverLetterChange?.(record);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoverLetter(null);
          onCoverLetterChange?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          onLoadingChange?.(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // Parent callbacks are stable enough for draft reload only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  async function handleGenerate() {
    if (!job) {
      setError("Saved job description is required to generate a cover letter.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setHasAttemptedGeneration(true);
    try {
      const record = await generateAndSaveCoverLetterDraft(
        buildCoverLetterGenerationOptions({
          job,
          resumeDraft: draft,
          applicationId: draft.applicationId,
          fields: {
            jobFormCompanyName: job.companyName,
          },
        }),
      );
      setCoverLetter(record);
      onCoverLetterChange?.(record);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Cover letter generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const coverLetterExport = coverLetter
    ? evaluateCoverLetterClientExportReadiness(coverLetter.body)
    : null;
  const exportBlocked = coverLetterExport ? !coverLetterExport.exportReady : false;
  const exportBlockedReason = coverLetterExport?.blockingReasons.join(" ") ?? undefined;

  return (
    <SetupCard
      title="Cover letter"
      description="Formal cover letter for this application. Use Edit Cover Letter for revisions and quick actions."
      variant="secondary"
    >
      {isLoading ? (
        <p className="mt-3 text-sm text-slate-600">Loading cover letter…</p>
      ) : coverLetter ? (
        <div className="mt-4 space-y-4">
          <div className={actionBarClassName}>
            <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
              <CoverLetterBodyViewSwitch view={bodyView} onChange={setBodyView} />
              <div className={primaryActionGroupClassName}>
              <Link
                href={`/cover-letter-preview/${coverLetter.id}`}
                className={`${primaryButtonClassName} w-full sm:w-auto`}
              >
                Edit cover letter
              </Link>
              </div>
            </div>
            <div className={`mt-3 ${secondaryActionGroupClassName}`}>
              <p className="text-xs font-semibold uppercase text-slate-500 sm:w-full">
                Export cover letter
              </p>
              <DownloadCoverLetterPdfButton draftId={coverLetter.id} disabled={exportBlocked} />
              <DownloadCoverLetterDocxButton draftId={coverLetter.id} disabled={exportBlocked} />
            </div>
          </div>

          {bodyView === "pdf" ? (
            <CoverLetterPdfPreview
              body={coverLetter.body}
              draftId={coverLetter.id}
              onOverflowChange={onPdfOverflowChange}
            />
          ) : (
            <div
              className="max-h-[32rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-5 md:p-6 shadow-inner"
              data-testid="application-package-cover-letter-body"
            >
              <div className="space-y-4 font-serif text-base leading-7 text-slate-800">
                {splitCoverLetterParagraphs(coverLetter.body).map((paragraph, index) => (
                  <p key={index} className="m-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
          {exportBlocked && exportBlockedReason ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {exportBlockedReason}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">No cover letter saved for this application yet.</p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !job}
            className={error || hasAttemptedGeneration ? primaryButtonClassName : secondaryButtonClassName}
          >
            {isGenerating
              ? "Generating cover letter…"
              : error || hasAttemptedGeneration
                ? "Retry cover letter"
                : "Generate cover letter"}
          </button>
          {!job ? (
            <p className="text-sm text-amber-800">
              This draft is not linked to a saved job description.
            </p>
          ) : null}
        </div>
      )}
      {error ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-red-700">Cover letter generation failed: {error}</p>
          <p className="text-sm text-slate-600">
            Your resume draft is saved. Retry cover letter generation without regenerating the
            resume.
          </p>
        </div>
      ) : null}
    </SetupCard>
  );
}
