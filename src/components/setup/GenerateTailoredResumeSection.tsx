"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GenerationProgressPanel } from "@/components/setup/GenerationProgressPanel";
import {
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/setup/ui";
import {
  readLastBaseResumeId,
  resolveDefaultBaseResumeId,
  writeLastBaseResumeId,
} from "@/lib/generate/base-resume-preference";
import { delay, GENERATION_PROGRESS_STAGES } from "@/lib/generate/generation-progress";
import {
  ensureJobDescriptionForGeneration,
  type SaveJobForGenerationHandler,
} from "@/lib/generate/save-job-for-generation";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import { buildResumeDraftPayloadFromInventory } from "@/lib/resume-draft/payload";
import {
  fetchResumeDraftProviderStatus,
  requestResumeDraftGeneration,
  type ResumeDraftClientError,
} from "@/lib/resume-draft/client";
import {
  ensureApplicationRecordForJobDescription,
  markApplicationResumeGenerated,
} from "@/lib/supabase/application-records";
import {
  createGeneratedResumeDraftInCloud,
  listGeneratedResumeDraftsFromCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { ResumeDraftProviderStatusResponse } from "@/types/resume-draft";

type GenerateTailoredResumeSectionProps = {
  inventory: InventoryState;
  jobDescriptions: StoredJobDescription[];
  jobForm: JobDescriptionInput;
  editingJobId?: string | null;
  isSignedIn: boolean;
  disabled?: boolean;
  onSaveJob: SaveJobForGenerationHandler;
  onGenerationFinished?: () => void;
};

export function GenerateTailoredResumeSection({
  inventory,
  jobDescriptions,
  jobForm,
  editingJobId = null,
  isSignedIn,
  disabled = false,
  onSaveJob,
  onGenerationFinished,
}: GenerateTailoredResumeSectionProps) {
  const router = useRouter();
  const [selectedBaseResumeId, setSelectedBaseResumeId] = useState("");
  const [providerStatus, setProviderStatus] =
    useState<ResumeDraftProviderStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);

  const approvedKeywordCount = countApprovedKeywords(inventory.enrichment);

  useEffect(() => {
    fetchResumeDraftProviderStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveDefault() {
      if (inventory.resumes.length === 0) {
        if (!cancelled) {
          setSelectedBaseResumeId("");
        }
        return;
      }

      let recentDraftReferenceResumeId: string | null = null;
      if (isSignedIn) {
        try {
          const drafts = await listGeneratedResumeDraftsFromCloud();
          recentDraftReferenceResumeId = drafts[0]?.referenceResumeId ?? null;
        } catch {
          recentDraftReferenceResumeId = null;
        }
      }

      const defaultId = resolveDefaultBaseResumeId(inventory.resumes, {
        recentDraftReferenceResumeId,
      });

      if (!cancelled) {
        setSelectedBaseResumeId((current) => {
          if (current && inventory.resumes.some((resume) => resume.id === current)) {
            return current;
          }
          return defaultId;
        });
      }
    }

    void resolveDefault();
    return () => {
      cancelled = true;
    };
  }, [inventory.resumes, isSignedIn]);

  const effectiveBaseResumeId =
    selectedBaseResumeId || resolveDefaultBaseResumeId(inventory.resumes);

  const providerConfigured = providerStatus?.configured ?? false;
  const hasJobText = Boolean(jobForm.rawText.trim());
  const canGenerate =
    isSignedIn &&
    !disabled &&
    providerConfigured &&
    inventory.resumes.length > 0 &&
    hasJobText &&
    Boolean(effectiveBaseResumeId);

  async function advanceStage(index: number) {
    setProgressStageIndex(index);
    await delay(250);
  }

  async function handleGenerate() {
    if (isGenerating) {
      return;
    }

    setError(null);
    setDebugRaw(null);
    setIsGenerating(true);
    setProgressStageIndex(0);

    try {
      await advanceStage(0);

      const savedJob = await ensureJobDescriptionForGeneration(jobForm, {
        jobDescriptions,
        saveJob: onSaveJob,
        editingId: editingJobId,
      });

      const applicationRecord = await ensureApplicationRecordForJobDescription(savedJob);

      await advanceStage(1);

      writeLastBaseResumeId(effectiveBaseResumeId);

      await advanceStage(2);

      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription: savedJob,
        referenceResumeId: effectiveBaseResumeId,
      });

      await advanceStage(3);

      const response = await requestResumeDraftGeneration({
        ...generationInput,
        inputSnapshot,
      });

      await advanceStage(4);

      const record = await createGeneratedResumeDraftInCloud({
        jobDescriptionId: savedJob.id,
        referenceResumeId: effectiveBaseResumeId,
        applicationId: applicationRecord.id,
        content: response.content,
        rationale: response.rationale,
        inputSnapshot: response.inputSnapshot,
        provider: response.provider,
        modelName: response.modelName,
      });

      await markApplicationResumeGenerated(applicationRecord.id);

      await advanceStage(GENERATION_PROGRESS_STAGES.length - 1);
      await delay(200);

      onGenerationFinished?.();
      router.push(`/resume-preview/${record.id}`);
    } catch (generationError) {
      const clientError = generationError as ResumeDraftClientError;
      setError(
        clientError instanceof Error
          ? clientError.message
          : "Tailored resume generation failed.",
      );
      setDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsGenerating(false);
    }
  }

  const storedPreference = readLastBaseResumeId();

  return (
    <div className="border-t border-slate-200 pt-5">
      {providerStatus ? (
        <p className="text-sm text-slate-600">
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

      {isGenerating ? (
        <div className="mt-4">
          <GenerationProgressPanel stageIndex={progressStageIndex} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="base-resume-select" className={labelClassName}>
              Base resume (formatting template)
            </label>
            <select
              id="base-resume-select"
              value={effectiveBaseResumeId}
              onChange={(event) => setSelectedBaseResumeId(event.target.value)}
              disabled={disabled || inventory.resumes.length === 0 || isGenerating}
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
            <p className="mt-1 text-xs text-slate-500">
              Uses layout and bullet style only — tailored content comes from your career
              inventory, not this file&apos;s text.
              {storedPreference && storedPreference === effectiveBaseResumeId
                ? " Last used base resume selected."
                : null}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isGenerating}
            className={`${primaryButtonClassName} shrink-0`}
          >
            Generate Tailored Resume
          </button>
        </div>
      )}

      <p className="mt-3 text-sm text-slate-600">
        Approved keywords available: {approvedKeywordCount}
      </p>

      {error ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isGenerating}
            className={primaryButtonClassName}
          >
            Retry Generate Tailored Resume
          </button>
        </div>
      ) : null}

      {debugRaw ? (
        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Raw model response
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-xs text-slate-800">{debugRaw}</pre>
        </details>
      ) : null}

      {!hasJobText ? (
        <p className="mt-3 text-sm text-amber-800">
          Paste a job description to enable generation.
        </p>
      ) : null}

      {inventory.resumes.length === 0 ? (
        <p className="mt-3 text-sm text-amber-800">
          Upload at least one resume in Manage Uploads before generating.
        </p>
      ) : null}
    </div>
  );
}
