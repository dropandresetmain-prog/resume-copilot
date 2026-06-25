"use client";

import { useMemo, useState } from "react";

import { ModelSelectionDebug } from "@/components/ai/ModelSelectionDebug";
import { ModelTierSelect } from "@/components/ai/ModelTierSelect";
import {
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import {
  resolveResumeModelTierForDraft,
  writeStoredResumeModelTier,
} from "@/lib/ai/model-tier-storage";
import type { ModelTier } from "@/lib/ai/model-tiers";
import { applyResumeCustomRevision } from "@/lib/resume-draft/custom-revision";
import { requestResumeCustomRevision } from "@/lib/resume-draft/custom-revision-client";
import type { StoredJobDescription } from "@/types/jd";
import type {
  GeneratedResumeDraftRecord,
  ResumeCustomRevisionScope,
  ResumeDraftContent,
} from "@/types/resume-draft";

type ResumeStagedCustomRevisionPanelProps = {
  draft: GeneratedResumeDraftRecord;
  jobDescription?: StoredJobDescription | null;
  disabled?: boolean;
  onAccepted: (
    content: ResumeDraftContent,
    warnings: string[],
    modelSelection?: {
      requestedTier: ModelTier;
      actualModel?: string;
      fallbackApplied?: boolean;
    },
  ) => void | Promise<void>;
};

const SCOPE_OPTIONS: { value: ResumeCustomRevisionScope; label: string }[] = [
  { value: "professional_summary", label: "Professional summary" },
  { value: "selected_role", label: "Selected role" },
];

export function ResumeStagedCustomRevisionPanel({
  draft,
  jobDescription,
  disabled = false,
  onAccepted,
}: ResumeStagedCustomRevisionPanelProps) {
  const [scope, setScope] = useState<ResumeCustomRevisionScope>("selected_role");
  const [roleIndex, setRoleIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptFeedback, setAcceptFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingRevision, setPendingRevision] = useState<{
    content: ResumeDraftContent;
    warnings: string[];
    modelSelection?: {
      requestedTier: ModelTier;
      actualModel?: string;
      fallbackApplied?: boolean;
    };
  } | null>(null);
  const [resumeModelTier, setResumeModelTier] = useState<ModelTier>(() =>
    resolveResumeModelTierForDraft({
      draftTier: draft.inputSnapshot?.resumeModelTier,
    }),
  );
  const [lastModelName, setLastModelName] = useState<string | null>(draft.modelName ?? null);
  const [lastFallbackApplied, setLastFallbackApplied] = useState(
    draft.inputSnapshot?.modelFallbackApplied ?? false,
  );

  const roleOptions = useMemo(
    () =>
      draft.content.experience.map((role, index) => ({
        index,
        label: `${role.role} · ${role.company}`,
      })),
    [draft.content.experience],
  );

  const canRevise =
    customInstruction.trim().length > 0 &&
    Boolean(jobDescription?.rawText?.trim()) &&
    (scope !== "selected_role" || roleOptions.length > 0) &&
    (scope !== "professional_summary" || draft.content.professionalSummary.text.trim().length > 0);

  async function handleReviseResume() {
    if (!canRevise || isRevising || disabled || !jobDescription?.rawText?.trim()) {
      return;
    }

    setIsRevising(true);
    setError(null);
    setWarnings([]);
    setPendingRevision(null);
    setAcceptFeedback(null);

    try {
      const response = await requestResumeCustomRevision({
        draftId: draft.id,
        scope,
        roleIndex: scope === "selected_role" ? roleIndex : undefined,
        customInstruction: customInstruction.trim(),
        content: draft.content,
        jobDescription: {
          id: jobDescription.id,
          rawText: jobDescription.rawText,
          companyName: jobDescription.companyName,
          roleTitle: jobDescription.roleTitle,
        },
        resumeModelTier,
        persist: false,
      });

      if (response.persisted) {
        throw new Error("Expected candidate-only revision, but the server persisted the draft.");
      }

      if (response.modelName) {
        setLastModelName(response.modelName);
      }
      setLastFallbackApplied(response.modelFallbackApplied ?? false);

      const candidateContent = applyResumeCustomRevision(draft.content, {
        scope: response.scope,
        roleIndex: response.roleIndex,
        professionalSummaryText: response.professionalSummaryText,
        roleBullets: response.roleBullets,
      });

      setPendingRevision({
        content: candidateContent,
        warnings: response.warnings,
        modelSelection: {
          requestedTier: resumeModelTier,
          actualModel: response.modelName,
          fallbackApplied: response.modelFallbackApplied,
        },
      });
      setWarnings(response.warnings);
    } catch (revisionError) {
      setError(
        revisionError instanceof Error ? revisionError.message : "Resume custom revision failed.",
      );
    } finally {
      setIsRevising(false);
    }
  }

  async function handleAcceptRevision() {
    if (!pendingRevision || isAccepting) {
      return;
    }

    setIsAccepting(true);
    setError(null);
    setAcceptFeedback(null);

    try {
      await onAccepted(
        pendingRevision.content,
        pendingRevision.warnings,
        pendingRevision.modelSelection,
      );
      setAcceptFeedback("Revision saved.");
      setPendingRevision(null);
      setCustomInstruction("");
      setWarnings([]);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error ? acceptError.message : "Failed to save revised resume draft.",
      );
    } finally {
      setIsAccepting(false);
    }
  }

  function handleRejectRevision() {
    setPendingRevision(null);
    setWarnings([]);
    setAcceptFeedback(null);
  }

  const previewSummary =
    pendingRevision && scope === "professional_summary"
      ? pendingRevision.content.professionalSummary.text
      : null;

  const previewRole =
    pendingRevision && scope === "selected_role"
      ? pendingRevision.content.experience[roleIndex]
      : null;

  return (
    <div data-testid="resume-staged-custom-revision">
      <SetupCard
        title="Custom AI revision"
        description="Choose a scope, enter instructions, then revise once. Preview the candidate change before accepting — Accept persists the scoped edit only."
      >
        <div className="mt-4 max-w-md">
          <ModelTierSelect
            id="resume-custom-revision-model-tier"
            label="Resume model"
            value={resumeModelTier}
            disabled={disabled || isRevising}
            onChange={(tier) => {
              setResumeModelTier(tier);
              writeStoredResumeModelTier(tier);
            }}
          />
          <ModelSelectionDebug
            requestedTier={resumeModelTier}
            actualModel={lastModelName}
            fallbackApplied={lastFallbackApplied}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="resume-revision-scope" className={labelClassName}>
              Revision scope
            </label>
            <select
              id="resume-revision-scope"
              value={scope}
              disabled={disabled || isRevising}
              onChange={(event) => {
                setScope(event.target.value as ResumeCustomRevisionScope);
                setPendingRevision(null);
              }}
              className={formFieldClassName}
              data-testid="resume-revision-scope"
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {scope === "selected_role" ? (
            <div>
              <label htmlFor="resume-revision-role" className={labelClassName}>
                Role
              </label>
              <select
                id="resume-revision-role"
                value={roleIndex}
                disabled={disabled || isRevising || roleOptions.length === 0}
                onChange={(event) => {
                  setRoleIndex(Number(event.target.value));
                  setPendingRevision(null);
                }}
                className={formFieldClassName}
                data-testid="resume-revision-role"
              >
                {roleOptions.map((option) => (
                  <option key={option.index} value={option.index}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <label htmlFor="resume-custom-revision-instruction" className={labelClassName}>
            Custom instructions
          </label>
          <textarea
            id="resume-custom-revision-instruction"
            value={customInstruction}
            onChange={(event) => {
              setCustomInstruction(event.target.value);
              setPendingRevision(null);
            }}
            rows={3}
            className={formFieldClassName}
            placeholder='e.g. "Make bullets more metrics-focused for this role."'
            data-testid="resume-custom-revision-instruction"
          />
          <p className="mt-1 text-xs text-slate-500">
            Instructions stage only — they do not call AI until you click Revise resume.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isRevising || !canRevise}
          onClick={() => void handleReviseResume()}
          className={`mt-4 w-full sm:w-auto ${primaryButtonClassName}`}
          data-action="revise-resume-custom"
          aria-busy={isRevising}
        >
          {isRevising ? "Revising…" : "Revise resume"}
        </button>
        <p className="mt-1 text-xs text-slate-500">Runs 1 AI step. Does not save until you accept.</p>

        {pendingRevision ? (
          <div
            className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4"
            data-testid="resume-revision-preview"
          >
            <p className="text-sm font-semibold text-slate-900">Revised draft preview</p>
            <p className="mt-1 text-xs text-slate-600">
              Accept applies the scoped change to your saved draft. Reject keeps the current version.
            </p>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
              {previewSummary ? (
                <p className="m-0 whitespace-pre-wrap">{previewSummary}</p>
              ) : previewRole ? (
                <ul className="m-0 list-disc space-y-2 pl-5">
                  {previewRole.bullets.map((bullet, index) => (
                    <li key={`${bullet.text}-${index}`}>{bullet.text}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className={`${secondaryActionGroupClassName} mt-4`}>
              <button
                type="button"
                onClick={() => void handleAcceptRevision()}
                disabled={isAccepting}
                className={primaryButtonClassName}
                data-action="accept-resume-revision"
                aria-busy={isAccepting}
              >
                {isAccepting ? "Saving…" : "Accept revision"}
              </button>
              <button
                type="button"
                onClick={handleRejectRevision}
                className={secondaryButtonClassName}
                data-action="reject-resume-revision"
              >
                Reject / keep current
              </button>
            </div>
          </div>
        ) : null}

        {acceptFeedback ? (
          <p className="mt-3 text-sm text-emerald-800" role="status" data-testid="resume-revision-saved">
            {acceptFeedback}
          </p>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </SetupCard>
    </div>
  );
}
