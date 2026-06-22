"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import { CoverLetterQuickRevisionPanel } from "@/components/cover-letters/CoverLetterQuickRevisionPanel";
import { SecondaryCommunicationsPanel } from "@/components/cover-letters/SecondaryCommunicationsPanel";
import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import {
  formFieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { CompanyContextPreviewPanel } from "@/components/company-context/CompanyContextPreviewPanel";
import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  formatWordCountLabel,
  isOverWordLimit,
} from "@/lib/cover-letter/word-limits";
import {
  getGeneratedCoverLetterDraftFromCloud,
  updateGeneratedCoverLetterDraftInCloud,
} from "@/lib/supabase/generated-cover-letter-drafts";
import { getApplicationRecordFromCloud } from "@/lib/supabase/application-records";
import type { CompanyContext } from "@/types/company-context";
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
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);

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
            let resolvedContext =
              normalizeCompanyContext(record.companyContext) ??
              null;
            if (record.applicationId) {
              const application = await getApplicationRecordFromCloud(record.applicationId);
              if (application?.companyContext) {
                resolvedContext = application.companyContext;
              }
            }
            setCompanyContext(resolvedContext);
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
  const bannedPhrases = detectBannedPhrases(bodyDraft);
  const exportBlocked = isOverWordLimit(wordCount) || bannedPhrases.length > 0;

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
        milestone="v0.9.3 · Cover Letter"
        title="Formal cover letter"
        description="Preview and edit the formal cover letter. Company context is shown below when available."
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
        description={formatWordCountLabel(wordCount)}
      >
        {exportBlocked ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {isOverWordLimit(wordCount)
              ? `Export is disabled until the letter is ${FORMAL_COVER_LETTER_MAX_WORDS} words or fewer. Use Shorten to 420 words or edit manually.`
              : `Export is disabled until banned phrasing is removed: ${bannedPhrases.join(", ")}.`}
          </p>
        ) : null}
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
          <DownloadCoverLetterPdfButton draftId={draft.id} disabled={exportBlocked} />
          <DownloadCoverLetterDocxButton draftId={draft.id} disabled={exportBlocked} />
        </div>
        {saveMessage ? <p className="mt-3 text-sm text-emerald-800">{saveMessage}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </SetupCard>

      {companyContext ? (
        <CompanyContextPreviewPanel
          context={companyContext}
          applicationId={draft.applicationId}
          onSaved={setCompanyContext}
        />
      ) : null}

      <CoverLetterQuickRevisionPanel
        draftId={draft.id}
        currentBody={bodyDraft}
        disabled={isSaving}
        onRevised={(body, warnings) => {
          setBodyDraft(body);
          setDraft((current) =>
            current
              ? {
                  ...current,
                  body,
                  rationale: current.rationale
                    ? { ...current.rationale, wordCount: countWords(body) }
                    : current.rationale,
                }
              : current,
          );
          setSaveMessage("Cover letter revised.");
          if (warnings.length > 0) {
            setError(null);
          }
        }}
      />

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
