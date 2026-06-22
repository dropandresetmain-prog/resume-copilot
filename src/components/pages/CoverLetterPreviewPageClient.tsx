"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import { SecondaryCommunicationsPanel } from "@/components/cover-letters/SecondaryCommunicationsPanel";
import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import {
  formFieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  getGeneratedCoverLetterDraftFromCloud,
  updateGeneratedCoverLetterDraftInCloud,
} from "@/lib/supabase/generated-cover-letter-drafts";
import type { GeneratedCoverLetterDraftRecord } from "@/types/cover-letter-draft";

type CoverLetterPreviewPageClientProps = {
  draftId: string;
};

export function CoverLetterPreviewPageClient({ draftId }: CoverLetterPreviewPageClientProps) {
  const { jobDescriptions } = useWorkspace();
  const [draft, setDraft] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [bodyDraft, setBodyDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const record = await getGeneratedCoverLetterDraftFromCloud(draftId);
        if (!cancelled) {
          if (!record) {
            setError("Cover letter draft not found.");
            setDraft(null);
          } else {
            setDraft(record);
            setBodyDraft(record.body);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load cover letter draft.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const job = draft?.jobDescriptionId
    ? jobDescriptions.find((item) => item.id === draft.jobDescriptionId)
    : undefined;
  const wordCount = countWords(bodyDraft);

  async function handleSave() {
    if (!draft) {
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const updated = await updateGeneratedCoverLetterDraftInCloud(draft.id, {
        body: bodyDraft,
        rationale: draft.rationale
          ? { ...draft.rationale, wordCount: countWords(bodyDraft) }
          : undefined,
      });
      setDraft(updated);
      setBodyDraft(updated.body);
      setSaveMessage("Cover letter saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save cover letter.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading cover letter…</p>;
  }

  if (!draft) {
    return <p className="text-sm text-red-700">{error ?? "Cover letter not found."}</p>;
  }

  return (
    <>
      <PageHeader
        milestone="v0.9.0 · Cover Letter"
        title="Formal cover letter"
        description="Preview and edit the formal cover letter. Download PDF or DOCX when ready."
      />

      <div className="flex flex-wrap gap-3">
        {draft.resumeDraftId ? (
          <Link href={`/resume-preview/${draft.resumeDraftId}`} className={secondaryButtonClassName}>
            Open linked resume
          </Link>
        ) : null}
        <Link href="/records" className={secondaryButtonClassName}>
          Back to Records
        </Link>
      </div>

      <SetupCard
        title={job?.roleTitle && job.companyName ? `${job.roleTitle} @ ${job.companyName}` : "Cover letter"}
        description={`${wordCount} words · target 350–450 (ideal ~420)`}
      >
        <textarea
          value={bodyDraft}
          onChange={(event) => setBodyDraft(event.target.value)}
          rows={18}
          className={`${formFieldClassName} mt-4 font-serif leading-7`}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={primaryButtonClassName}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <DownloadCoverLetterPdfButton draftId={draft.id} />
          <DownloadCoverLetterDocxButton draftId={draft.id} />
        </div>
        {saveMessage ? <p className="mt-3 text-sm text-emerald-800">{saveMessage}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </SetupCard>

      {draft.rationale ? (
        <SetupCard title="Generation notes" description="Themes and risk flags from the model.">
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {draft.rationale.selectedThemes.length > 0 ? (
              <p>
                <span className="font-medium">Themes:</span>{" "}
                {draft.rationale.selectedThemes.join(", ")}
              </p>
            ) : null}
            {draft.rationale.whyTheseThemes ? (
              <p>{draft.rationale.whyTheseThemes}</p>
            ) : null}
            {draft.rationale.riskFlags.length > 0 ? (
              <p className="text-amber-900">
                <span className="font-medium">Risk flags:</span>{" "}
                {draft.rationale.riskFlags.join("; ")}
              </p>
            ) : null}
          </div>
        </SetupCard>
      ) : null}

      <SecondaryCommunicationsPanel rationale={draft.rationale} />
    </>
  );
}
