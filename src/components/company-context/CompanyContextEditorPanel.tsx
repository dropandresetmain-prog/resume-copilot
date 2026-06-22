"use client";

import { useEffect, useState } from "react";

import {
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import {
  buildCompanyContextGenerationRequest,
  requestCompanyContextGeneration,
} from "@/lib/company-context/client";
import { hasUsableCompanyContext } from "@/lib/company-context/normalize";
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
  onSaved,
}: CompanyContextEditorPanelProps) {
  const [draft, setDraft] = useState<CompanyContext | null>(null);
  const [hasSavedContext, setHasSavedContext] = useState(false);
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
  }, [editingJobId]);

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

  async function handleGenerate() {
    if (!jobForm.rawText.trim()) {
      setError("Paste a job description before generating company context.");
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
      const { job } = await ensureJobAndApplication();
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
      setDraft(response);
      setHasSavedContext(false);
      setMessage("Company context generated. Review and save before generating resume/cover letter.");
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
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-900">Company context</p>
      <p className="mt-1 text-xs text-slate-600">
        Gemini-generated context based on JD and company fields. Review before using. No web
        search or website scraping.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || isSaving}
          className={primaryButtonClassName}
        >
          {isGenerating ? "Generating company context…" : "Generate Company Context"}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!draft || isSaving || isGenerating}
          className={secondaryButtonClassName}
        >
          {isSaving ? "Saving…" : "Save Company Context"}
        </button>
      </div>

      {!hasSavedContext ? (
        <p className="mt-3 text-sm text-amber-900">
          No saved company context. Generation will use JD and company fields only.
        </p>
      ) : (
        <p className="mt-3 text-sm text-emerald-900">Company context ready for this application.</p>
      )}

      {draft ? (
        <div className="mt-4 space-y-4">
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
                  <li key={angle.angle} className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="font-medium">{angle.angle}</p>
                    <p className="mt-1">{angle.relevance}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.limitations.length > 0 ? (
            <div>
              <p className={labelClassName}>Limitations</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                {draft.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
