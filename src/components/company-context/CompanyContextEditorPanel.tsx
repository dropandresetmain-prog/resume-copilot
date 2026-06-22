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
import {
  clearApplicationCompanyResearchInCloud,
  ensureApplicationRecordForJobDescription,
  findApplicationRecordByJobDescriptionId,
  saveApplicationCompanyContextInCloud,
} from "@/lib/supabase/application-records";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
import {
  formatCompanyResearchStatusLabel,
  resolveCompanyResearchDisplayStatus,
} from "@/lib/company-context/status-labels";
import { validateCompanyContextForSave } from "@/lib/company-context/parse";
import { ensureJobDescriptionForGeneration, type SaveJobForGenerationHandler } from "@/lib/generate/save-job-for-generation";
import type { CompanyContextEnsureStatus } from "@/lib/company-context/ensure-for-generation";
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
  const [hasSavedResearch, setHasSavedResearch] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

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
        setHasSavedResearch(hasUsableCompanyContext(saved));
        setApplicationId(application?.id ?? null);
      } catch {
        if (!cancelled) {
          setDraft(null);
          setHasSavedResearch(false);
          setApplicationId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingJobId, lastEnsureStatus]);

  const displayStatus = resolveCompanyResearchDisplayStatus({
    savedContext: hasSavedResearch ? draft : null,
    lastEnsureStatus,
    combinedMode,
    companyWebsite,
  });
  const statusLabel = formatCompanyResearchStatusLabel(displayStatus);

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
    setApplicationId(application.id);
    return { job, applicationId: application.id };
  }

  async function handleResearchWebsite() {
    if (!jobForm.rawText.trim()) {
      setError("Paste a job description before researching the company website.");
      return;
    }
    if (!companyNameOverride.trim() && !jobForm.companyName?.trim()) {
      setError("Company name is required for company research.");
      return;
    }
    if (!companyWebsite.trim()) {
      setError("Enter a company website URL to research. Job posting URLs are not used.");
      return;
    }

    setIsResearching(true);
    setError(null);
    setMessage(null);

    try {
      const { job, applicationId: appId } = await ensureJobAndApplication();
      const response = await requestCompanyContextGeneration(
        buildCompanyContextGenerationRequest({
          jobDescriptionId: job.id,
          jobDescriptionText: job.rawText,
          companyName: companyNameOverride || jobForm.companyName || job.companyName || "",
          country,
          website: companyWebsite,
          roleTitle: jobForm.roleTitle || job.roleTitle,
          additionalInstructions,
        }),
      );
      const saved = await saveApplicationCompanyContextInCloud(appId, response);
      setDraft(saved.companyContext ?? response);
      setHasSavedResearch(true);
      setShowEditor(true);
      setMessage(
        response.researchWarning ??
          (response.firecrawlUsed
            ? "Website-backed company research saved."
            : "JD-based company research saved."),
      );
      onSaved?.();
    } catch (researchError) {
      setError(
        researchError instanceof Error
          ? researchError.message
          : "Company website research failed.",
      );
    } finally {
      setIsResearching(false);
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
      const saved = await saveApplicationCompanyContextInCloud(appId, {
        ...draft,
        sourceType: draft.sourceType ?? "manual",
      });
      setDraft(saved.companyContext ?? draft);
      setHasSavedResearch(hasUsableCompanyContext(saved.companyContext));
      setMessage("Company research saved.");
      onSaved?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save company research.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    if (!applicationId) {
      setError("Save the job to an application before clearing company research.");
      return;
    }

    setIsClearing(true);
    setError(null);
    setMessage(null);

    try {
      await clearApplicationCompanyResearchInCloud(applicationId);
      setDraft(null);
      setHasSavedResearch(false);
      setShowEditor(false);
      setMessage("Saved company research cleared.");
      onSaved?.();
    } catch (clearError) {
      setError(
        clearError instanceof Error ? clearError.message : "Failed to clear company research.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
      <p className="text-sm font-medium text-slate-900">{statusLabel}</p>
      <p className="mt-1 text-xs text-slate-600">
        Company website is researched via Firecrawl (server-side). Job posting URLs are not
        scraped. Without a company website, generation uses JD-based context only.
      </p>

      {generationWarning ? (
        <p className="mt-2 text-sm text-amber-900">{generationWarning}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleResearchWebsite()}
          disabled={isResearching || isSaving || isClearing}
          className={secondaryButtonClassName}
        >
          {isResearching ? "Researching website…" : "Research Company Website"}
        </button>
        <button
          type="button"
          onClick={() => setShowEditor((current) => !current)}
          className={secondaryButtonClassName}
        >
          {showEditor ? "Hide saved research" : "Edit Saved Company Research"}
        </button>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={!hasSavedResearch || isClearing || isResearching}
          className={secondaryButtonClassName}
        >
          {isClearing ? "Clearing…" : "Clear Saved Company Research"}
        </button>
      </div>

      {showEditor ? (
        <div className="mt-4 space-y-4">
          {draft ? (
            <>
              <div>
                <label htmlFor="company-research-summary" className={labelClassName}>
                  Company summary
                </label>
                <textarea
                  id="company-research-summary"
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
                disabled={!draft || isSaving || isResearching}
                className={secondaryButtonClassName}
              >
                {isSaving ? "Saving…" : "Save edits"}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">No company research saved for this application.</p>
          )}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
