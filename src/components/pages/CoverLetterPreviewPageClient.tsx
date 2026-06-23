"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import {
  CoverLetterBodyViewSwitch,
  type CoverLetterBodyView,
} from "@/components/cover-letters/CoverLetterBodyViewSwitch";
import { CoverLetterPdfPreview } from "@/components/cover-letters/CoverLetterPdfPreview";
import { CoverLetterQuickRevisionPanel } from "@/components/cover-letters/CoverLetterQuickRevisionPanel";
import { ModelSelectionDebug } from "@/components/ai/ModelSelectionDebug";
import { SecondaryCommunicationsPanel } from "@/components/cover-letters/SecondaryCommunicationsPanel";
import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { pageMilestone } from "@/lib/app-version";
import {
  actionBarClassName,
  formFieldClassName,
  primaryButtonClassName,
  primaryActionGroupClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { CompanyContextPreviewPanel } from "@/components/company-context/CompanyContextPreviewPanel";
import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
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
  const [bodyView, setBodyView] = useState<CoverLetterBodyView>("pdf");

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
  const displayCompany = formatCompanyNameForDisplay({
    rawName: draft?.companyName ?? job?.companyName,
    website: draft?.companyWebsite ?? companyContext?.website ?? job?.jobUrl,
    savedDisplayName: companyContext?.displayName ?? draft?.companyContext?.displayName,
    fallback: "",
  });
  const wordCount = countWords(bodyDraft);
  const bannedPhrases = detectBannedPhrases(bodyDraft);
  const exportBlocked = isOverWordLimit(wordCount) || bannedPhrases.length > 0;
  const hasUnsavedBodyChanges = draft ? bodyDraft !== draft.body : false;

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
        eyebrow="Editor"
        milestone={pageMilestone("Cover Letter")}
        title="Cover letter editor"
        description="Edit the formal letter, preview the exported PDF, run quick revisions, and export from one mobile-safe workspace."
      />

      <div className="flex flex-wrap gap-3">
        {draft.resumeDraftId ? (
          <Link href={`/resume-preview/${draft.resumeDraftId}`} className={secondaryButtonClassName}>
            Back to application package
          </Link>
        ) : null}
        <Link href="/records" className={secondaryButtonClassName}>
          Back to Applications
        </Link>
      </div>

      <SetupCard
        variant="primary"
        title={
          job?.roleTitle && displayCompany
            ? `${job.roleTitle} @ ${displayCompany}`
            : "Cover letter"
        }
        description={formatWordCountLabel(wordCount)}
      >
        <ModelSelectionDebug
          requestedTier={draft.rationale?.modelSelection?.requestedTier}
          actualModel={draft.modelName}
          fallbackApplied={draft.rationale?.modelSelection?.fallbackApplied}
        />

        {exportBlocked ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {isOverWordLimit(wordCount)
              ? `Export is disabled until the letter is ${FORMAL_COVER_LETTER_MAX_WORDS} words or fewer. Use Shorten to 420 words or edit manually.`
              : `Export is disabled until banned phrasing is removed: ${bannedPhrases.join(", ")}.`}
          </p>
        ) : null}

        {hasUnsavedBodyChanges ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            You have unsaved changes. Save before leaving this page.
          </p>
        ) : null}

        <div className={`mt-4 ${actionBarClassName}`}>
          <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Edit view
              </p>
              <CoverLetterBodyViewSwitch view={bodyView} onChange={setBodyView} disabled={isSaving} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-800">
                Save changes
              </p>
              <div className={`${primaryActionGroupClassName} mt-2`}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !hasUnsavedBodyChanges}
              className={`${bodyView === "raw" || hasUnsavedBodyChanges ? primaryButtonClassName : secondaryButtonClassName} w-full sm:w-auto`}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
              </div>
            </div>
          </div>
          <div className={`mt-3 ${secondaryActionGroupClassName}`}>
            <p className="text-xs font-semibold uppercase text-slate-500 sm:w-full">
              Export letter
            </p>
            <DownloadCoverLetterPdfButton draftId={draft.id} disabled={exportBlocked} />
            <DownloadCoverLetterDocxButton draftId={draft.id} disabled={exportBlocked} />
          </div>
        </div>

        {bodyView === "pdf" ? (
          <CoverLetterPdfPreview body={bodyDraft} draftId={draft.id} className="mt-4" />
        ) : (
          <textarea
            value={bodyDraft}
            onChange={(event) => setBodyDraft(event.target.value)}
            rows={18}
            className={`${formFieldClassName} mt-4 font-serif leading-7`}
            data-testid="cover-letter-raw-text-editor"
          />
        )}

        {bodyView === "pdf" ? (
          <p className="mt-3 text-sm text-slate-600">
            Switch to Raw Text to edit manually and save. Quick revisions (below) are saved
            automatically — manual edits require the Save changes button.
          </p>
        ) : null}
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
        draftModelTier={draft.rationale?.modelSelection?.requestedTier}
        actualModel={draft.modelName}
        fallbackApplied={draft.rationale?.modelSelection?.fallbackApplied}
        onRevised={(body, warnings, modelSelection) => {
          setBodyDraft(body);
          setDraft((current) =>
            current
              ? {
                  ...current,
                  body,
                  modelName: modelSelection?.actualModel ?? current.modelName,
                  rationale: current.rationale
                    ? {
                        ...current.rationale,
                        wordCount: countWords(body),
                        modelSelection: modelSelection
                          ? {
                              requestedTier: modelSelection.requestedTier,
                              fallbackApplied: modelSelection.fallbackApplied,
                            }
                          : current.rationale.modelSelection,
                      }
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
