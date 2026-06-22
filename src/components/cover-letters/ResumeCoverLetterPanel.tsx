"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SetupCard, primaryButtonClassName, secondaryButtonClassName } from "@/components/setup/ui";
import { buildCoverLetterGenerationOptions } from "@/lib/generate/build-cover-letter-options";
import { generateAndSaveCoverLetterDraft } from "@/lib/generate/cover-letter-generation";
import { findCoverLetterDraftByResumeDraftId } from "@/lib/supabase/generated-cover-letter-drafts";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";

type ResumeCoverLetterPanelProps = {
  draft: GeneratedResumeDraftRecord;
  job?: StoredJobDescription;
};

export function ResumeCoverLetterPanel({ draft, job }: ResumeCoverLetterPanelProps) {
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void findCoverLetterDraftByResumeDraftId(draft.id)
      .then((record) => {
        if (!cancelled) {
          setCoverLetter(record);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoverLetter(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
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
      description="Open the formal cover letter for this application. Resume is the primary artifact above."
    >
      {isLoading ? (
        <p className="mt-3 text-sm text-slate-600">Checking cover letter…</p>
      ) : coverLetter ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href={`/cover-letter-preview/${coverLetter.id}`}
            className={primaryButtonClassName}
          >
            Open formal cover letter
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !job}
            className={error ? primaryButtonClassName : secondaryButtonClassName}
          >
            {isGenerating
              ? "Generating cover letter…"
              : error || hasAttemptedGeneration
                ? "Retry Cover Letter"
                : "Generate Cover Letter"}
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
