"use client";

import { useEffect, useState } from "react";

import {
  formFieldClassName,
  labelClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import {
  buildCompanyContextGenerationRequest,
  requestCompanyContextGeneration,
} from "@/lib/company-context/client";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import {
  formatCompanyContextStatusLabel,
  resolveCompanyContextDisplayStatus,
} from "@/lib/company-context/status-labels";
import { validateCompanyContextForSave } from "@/lib/company-context/parse";
import { ensureJobDescriptionForGeneration, type SaveJobForGenerationHandler } from "@/lib/generate/save-job-for-generation";
import {
  ensureApplicationRecordForJobDescription,
  findApplicationRecordByJobDescriptionId,
  saveApplicationCompanyContextInCloud,
} from "@/lib/supabase/application-records";
import type { CompanyContext } from "@/types/company-context";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

type CompanyContextEditorPanelProps = {
  jobForm: JobDescriptionInput;
  jobDescriptions: StoredJobDescription[];
  editingJobId?: string | null;
  companyNameOverride: string;
  country: string;
  companyWebsite: string;
  additionalInstructions: string;
  onSaveJob: SaveJobForGenerationHandler;
  combinedMode: boolean;
  lastEnsureStatus?: CompanyContextEnsureStatus;
  generationWarning?: string | null;
  onSaved?: () => void;
};

export function CompanyContextEditorPanel({
  jobForm,
  jobDescriptions,
  editingJobId = null,
  companyNameOverride,
  country,
  companyWebsite,
  additionalInstructions,
  onSaveJob,
  combinedMode,
  lastEnsureStatus,
  generationWarning,
  onSaved,
}: CompanyContextEditorPanelProps) {
  const [draft, setDraft] = useState<CompanyContext | null>(null);
  const [hasSavedContext, setHasSavedContext] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingJobId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const application = await findApplicationRecordByJobDescriptionId(editingJobId);
        if (cancelled) {
          return;
        }
        const saved = application?.companyContext ?? null;
        setDraft(saved);
        setHasSavedContext(hasUsableCompanyContext(saved));
      } catch {
        if (!cancelled) {
          setDraft(null);
          setHasSavedContext(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingJobId, lastEnsureStatus]);

  const displayStatus = resolveCompanyContextDisplayStatus({
    savedContext: hasSavedContext ? draft : null,
    lastEnsureStatus,
    combinedMode,
  });
  const statusLabel = formatCompanyContextStatusLabel(displayStatus);

  async function ensureJobAndApplication(): Promise<{
    job: StoredJobDescription;
    applicationId: string;
  }> {
    const job = await ensureJobDescriptionForGeneration(jobForm, {
      jobDescriptions,
      saveJob: onSaveJob,
      editingId: editingJobId,
    });
    const application = await ensureApplicationRecordForJobDescription(job);
    return { job, applicationId: application.id };
  }

  async function handleRegenerate() {
    if (!jobForm.rawText.trim()) {
      setError("Paste a job description before regenerating company context.");
      return;
    }
    if (!companyNameOverride.trim() && !jobForm.companyName?.trim()) {
      setError("Company name is required to generate company context.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const { job, applicationId } = await ensureJobAndApplication();
      const response = await requestCompanyContextGeneration(
        buildCompanyContextGenerationRequest({
          jobDescriptionId: job.id,
          jobDescriptionText: job.rawText,
          companyName: companyNameOverride || jobForm.companyName || job.companyName || "",
          country,
          website: companyWebsite || jobForm.jobUrl || job.jobUrl,
          roleTitle: jobForm.roleTitle || job.roleTitle,
          additionalInstructions,
        }),
      );
      const saved = await saveApplicationCompanyContextInCloud(applicationId, response);
      setDraft(saved.companyContext ?? response);
      setHasSavedContext(true);
      setShowEditor(true);
      setMessage("Company context regenerated and saved.");
      onSaved?.();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Company context generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    const validationError = validateCompanyContextForSave(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { applicationId: appId } = await ensureJobAndApplication();
      const saved = await saveApplicationCompanyContextInCloud(appId, draft);
      setDraft(saved.companyContext ?? draft);
      setHasSavedContext(hasUsableCompanyContext(saved.companyContext));
      setMessage("Company context saved to this application.");
      onSaved?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save company context.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
      <p className="text-sm font-medium text-slate-900">{statusLabel}</p>
      <p className="mt-1 text-xs text-slate-600">
        {combinedMode
          ? "Combined generation auto-creates company context when missing. Gemini uses JD and company fields only — no web search."
          : "Company context is used for cover letter generation in combined mode."}
      </p>

      {generationWarning ? (
        <p className="mt-2 text-sm text-amber-900">{generationWarning}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowEditor((current) => !current)}
          className={secondaryButtonClassName}
        >
          {showEditor ? "Hide preview / edit" : "Preview / Edit Company Context"}
        </button>
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={isGenerating || isSaving}
          className={secondaryButtonClassName}
        >
          {isGenerating ? "Regenerating…" : "Regenerate Company Context"}
        </button>
      </div>

      {showEditor ? (
        <div className="mt-4 space-y-4">
          {draft ? (
            <>
              <div>
                <label htmlFor="company-context-summary" className={labelClassName}>
                  Company summary
                </label>
                <textarea
                  id="company-context-summary"
                  value={draft.companySummary}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, companySummary: event.target.value } : current,
                    )
                  }
                  rows={5}
                  className={formFieldClassName}
                />
              </div>

              {draft.suggestedNarrativeAngles.length > 0 ? (
                <div>
                  <p className={labelClassName}>Suggested narrative angles</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {draft.suggestedNarrativeAngles.map((angle) => (
                      <li
                        key={angle.angle}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <p className="font-medium">{angle.angle}</p>
                        <p className="mt-1">{angle.relevance}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!draft || isSaving || isGenerating}
                className={secondaryButtonClassName}
              >
                {isSaving ? "Saving…" : "Save edits"}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              No company context saved yet for this application.
            </p>
          )}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
