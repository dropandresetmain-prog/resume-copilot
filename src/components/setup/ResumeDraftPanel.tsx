"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  SetupCard,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/setup/ui";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import {
  buildResumeDraftPayloadFromInventory,
  summarizeResumeDraftContent,
} from "@/lib/resume-draft/payload";
import {
  fetchResumeDraftProviderStatus,
  requestResumeDraftGeneration,
  type ResumeDraftClientError,
} from "@/lib/resume-draft/client";
import { createGeneratedResumeDraftInCloud } from "@/lib/supabase/generated-resume-drafts";
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
};

export function ResumeDraftPanel({
  inventory,
  jobDescriptions,
  isSignedIn,
  disabled = false,
  disabledReason,
}: ResumeDraftPanelProps) {
  const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState("");
  const [selectedReferenceResumeId, setSelectedReferenceResumeId] = useState("");
  const [providerStatus, setProviderStatus] =
    useState<ResumeDraftProviderStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<GeneratedResumeDraftRecord | null>(
    null,
  );
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  const approvedKeywordCount = useMemo(
    () => countApprovedKeywords(inventory.enrichment),
    [inventory.enrichment],
  );

  const draftSummary = useMemo(
    () => (savedDraft ? summarizeResumeDraftContent(savedDraft.content) : null),
    [savedDraft],
  );

  useEffect(() => {
    fetchResumeDraftProviderStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  const effectiveJobDescriptionId =
    selectedJobDescriptionId || jobDescriptions[0]?.id || "";
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

  async function handleGenerate() {
    setError(null);
    setDebugRaw(null);
    setSavedDraft(null);
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
    <SetupCard
      title="Generate resume draft"
      description="Create a tailored structured resume draft from your inventory, approved keywords, selected job description, and reference resume. Source inventory is not modified."
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
            onChange={(event) => setSelectedJobDescriptionId(event.target.value)}
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
          {isGenerating ? "Generating…" : "Generate Resume Draft"}
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
          <pre className="mt-2 max-h-64 overflow-auto text-xs text-slate-800">
            {debugRaw}
          </pre>
        </details>
      ) : null}

      {savedDraft && draftSummary ? (
        <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">Draft saved to Supabase</p>
          <p>Draft ID: {savedDraft.id}</p>
          <ul className="space-y-1">
            <li>Summary: {draftSummary.hasSummary ? "yes" : "no"}</li>
            <li>Skill groups: {draftSummary.skillGroupCount}</li>
            <li>Experiences: {draftSummary.experienceCount}</li>
            <li>Bullets: {draftSummary.bulletCount}</li>
            <li>Risk flags: {draftSummary.riskFlagCount}</li>
          </ul>
          <button
            type="button"
            onClick={() => setShowJsonPreview((current) => !current)}
            className="text-sm font-medium text-emerald-900 underline"
          >
            {showJsonPreview ? "Hide JSON preview" : "Show JSON preview"}
          </button>
          {showJsonPreview ? (
            <pre className="max-h-80 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-800">
              {JSON.stringify(
                {
                  content: savedDraft.content,
                  rationale: savedDraft.rationale,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
        </div>
      ) : null}

      {jobDescriptions.length === 0 || inventory.resumes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Resume draft prerequisites"
            description="Upload at least one resume and save a job description before generating a draft."
          />
        </div>
      ) : null}
    </SetupCard>
  );
}
