"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
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
};

export function ApplicationPackageCoverLetterPanel({
  draft,
  job,
  onCoverLetterChange,
  onLoadingChange,
}: ApplicationPackageCoverLetterPanelProps) {
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

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

  return (
    <SetupCard
      title="Cover letter"
      description="Formal cover letter for this application. Use Edit Cover Letter for revisions and quick actions."
    >
      {isLoading ? (
        <p className="mt-3 text-sm text-slate-600">Loading cover letter…</p>
      ) : coverLetter ? (
        <div className="mt-4 space-y-4">
          <div
            className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800"
            data-testid="application-package-cover-letter-body"
          >
            {coverLetter.body}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/cover-letter-preview/${coverLetter.id}`}
              className={primaryButtonClassName}
            >
              Edit cover letter
            </Link>
            <DownloadCoverLetterPdfButton draftId={coverLetter.id} />
            <DownloadCoverLetterDocxButton draftId={coverLetter.id} />
          </div>
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
