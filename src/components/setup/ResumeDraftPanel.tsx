"use client";

import { useEffect, useState } from "react";

import { ResumeDraftReviewWorkspace } from "@/components/resume-drafts/ResumeDraftReviewWorkspace";
import {
  EmptyState,
  SetupCard,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/setup/ui";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import { buildResumeDraftPayloadFromInventory } from "@/lib/resume-draft/payload";
import {
  fetchResumeDraftProviderStatus,
  requestResumeDraftGeneration,
  type ResumeDraftClientError,
} from "@/lib/resume-draft/client";
import {
  createGeneratedResumeDraftInCloud,
  listGeneratedResumeDraftsFromCloud,
} from "@/lib/supabase/generated-resume-drafts";
import { formatSavedJobLabel } from "@/lib/jd/labels";
import type { InventoryState } from "@/types/resume";
import type { StoredJobDescription } from "@/types/jd";
import type {
  GeneratedResumeDraftRecord,
  ResumeDraftProviderStatusResponse,
} from "@/types/resume-draft";

type ResumeDraftPanelProps = {
  inventory: InventoryState;
  jobDescriptions: StoredJobDescription[];
  isSignedIn: boolean;
  disabled?: boolean;
  disabledReason?: string;
  selectedJobDescriptionId?: string;
  onJobDescriptionChange?: (id: string) => void;
};

export function ResumeDraftPanel({
  inventory,
  jobDescriptions,
  isSignedIn,
  disabled = false,
  disabledReason,
  selectedJobDescriptionId,
  onJobDescriptionChange,
}: ResumeDraftPanelProps) {
  const [internalJobId, setInternalJobId] = useState("");
  const [selectedReferenceResumeId, setSelectedReferenceResumeId] = useState("");
  const [providerStatus, setProviderStatus] =
    useState<ResumeDraftProviderStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [draftLoadToken, setDraftLoadToken] = useState(0);

  const approvedKeywordCount = countApprovedKeywords(inventory.enrichment);

  useEffect(() => {
    fetchResumeDraftProviderStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  const effectiveJobDescriptionId =
    selectedJobDescriptionId ?? (internalJobId || jobDescriptions[0]?.id || "");

  function handleJobSelectionChange(id: string) {
    if (onJobDescriptionChange) {
      onJobDescriptionChange(id);
      return;
    }
    setInternalJobId(id);
  }

  const effectiveReferenceResumeId =
    selectedReferenceResumeId || inventory.resumes[0]?.id || "";

  const providerConfigured = providerStatus?.configured ?? false;
  const canGenerate =
    isSignedIn &&
    !disabled &&
    providerConfigured &&
    inventory.resumes.length > 0 &&
    Boolean(effectiveJobDescriptionId) &&
    Boolean(effectiveReferenceResumeId);

  useEffect(() => {
    if (!isSignedIn || !effectiveJobDescriptionId) {
      return;
    }

    let cancelled = false;

    async function loadLatestDraft() {
      try {
        const drafts = await listGeneratedResumeDraftsFromCloud({
          jobDescriptionId: effectiveJobDescriptionId,
        });
        if (!cancelled) {
          setSavedDraft(drafts[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setSavedDraft(null);
        }
      }
    }

    void loadLatestDraft();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, effectiveJobDescriptionId, draftLoadToken]);

  async function handleGenerate() {
    setError(null);
    setDebugRaw(null);
    setIsGenerating(true);

    try {
      const jobDescription = jobDescriptions.find(
        (item) => item.id === effectiveJobDescriptionId,
      );
      if (!jobDescription) {
        throw new Error("Select a saved job description.");
      }

      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: effectiveReferenceResumeId,
      });

      const response = await requestResumeDraftGeneration({
        ...generationInput,
        inputSnapshot,
      });

      const record = await createGeneratedResumeDraftInCloud({
        jobDescriptionId: jobDescription.id,
        referenceResumeId: effectiveReferenceResumeId,
        content: response.content,
        rationale: response.rationale,
        inputSnapshot: response.inputSnapshot,
        provider: response.provider,
        modelName: response.modelName,
      });

      setSavedDraft(record);
      setDraftLoadToken((token) => token + 1);
    } catch (generationError) {
      const clientError = generationError as ResumeDraftClientError;
      setError(
        clientError instanceof Error
          ? clientError.message
          : "Resume draft generation failed.",
      );
      setDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <SetupCard
        title="Tailor resume from saved job"
        description="Choose a saved job and reference resume to generate a tailored resume. Your source inventory is not modified."
      >
        {disabled && disabledReason ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {disabledReason}
          </p>
        ) : null}

        {providerStatus ? (
          <p className="mt-3 text-sm text-slate-600">
            Provider: {providerStatus.providerLabel}
            {providerStatus.modelName ? ` · ${providerStatus.modelName}` : ""}
            {providerStatus.isMock ? " (test mode)" : ""}
          </p>
        ) : null}

        {!providerConfigured ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {providerStatus?.configurationError ??
              "Resume draft provider is not configured."}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="resume-draft-jd" className={labelClassName}>
              Saved job
            </label>
            <select
              id="resume-draft-jd"
              value={effectiveJobDescriptionId}
              onChange={(event) => handleJobSelectionChange(event.target.value)}
              disabled={disabled || jobDescriptions.length === 0}
              className={formFieldClassName}
            >
              {jobDescriptions.length === 0 ? (
                <option value="">No saved jobs</option>
              ) : (
                jobDescriptions.map((jd) => (
                  <option key={jd.id} value={jd.id}>
                    {formatSavedJobLabel(jd)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="resume-draft-reference" className={labelClassName}>
              Reference resume
            </label>
            <select
              id="resume-draft-reference"
              value={effectiveReferenceResumeId}
              onChange={(event) => setSelectedReferenceResumeId(event.target.value)}
              disabled={disabled || inventory.resumes.length === 0}
              className={formFieldClassName}
            >
              {inventory.resumes.length === 0 ? (
                <option value="">No uploaded resumes</option>
              ) : (
                inventory.resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.filename}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Approved keywords available: {approvedKeywordCount}
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={primaryButtonClassName}
          >
            {isGenerating ? "Generating…" : "Generate resume"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {debugRaw ? (
          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Raw model response
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto text-xs text-slate-800">{debugRaw}</pre>
          </details>
        ) : null}

        {jobDescriptions.length === 0 || inventory.resumes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Resume prerequisites"
              description="Upload at least one resume and save a job on this page before generating."
            />
          </div>
        ) : null}
      </SetupCard>

      {savedDraft ? (
        <ResumeDraftReviewWorkspace
          key={savedDraft.id}
          draft={savedDraft}
          onDraftUpdated={setSavedDraft}
        />
      ) : null}
    </>
  );
}
