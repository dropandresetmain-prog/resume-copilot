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
import { applyResumeBatchRevision } from "@/lib/resume-draft/custom-revision-batch";
import { requestResumeBatchRevision } from "@/lib/resume-draft/custom-revision-client";
import {
  isProfessionalSummaryRevisionScopeAvailable,
  PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY,
} from "@/lib/resume-draft/custom-revision";
import { isApprovedDraftStatus } from "@/lib/resume-draft/draft-status";
import type { StoredJobDescription } from "@/types/jd";
import type {
  GeneratedResumeDraftRecord,
  ResumeCustomRevisionScope,
  ResumeDraftContent,
  ResumeRevisionQueueItem,
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
  { value: "selected_role", label: "Selected role" },
];

function createQueueItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ResumeStagedCustomRevisionPanel({
  draft,
  jobDescription,
  disabled = false,
  onAccepted,
}: ResumeStagedCustomRevisionPanelProps) {
  const [scope, setScope] = useState<"professional_summary" | "selected_role">("selected_role");
  const [roleIndex, setRoleIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [queue, setQueue] = useState<ResumeRevisionQueueItem[]>([]);
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

  const summaryRevisionAvailable = isProfessionalSummaryRevisionScopeAvailable(draft.content);
  const summaryAlreadyQueued = queue.some((item) => item.scope === "professional_summary");
  const hasJobDescription = Boolean(jobDescription?.rawText?.trim());
  const requiresReapprovalAfterAccept = isApprovedDraftStatus(draft.status);

  const scopeOptions = summaryRevisionAvailable
    ? [
        { value: "professional_summary" as const, label: "Professional summary" },
        ...SCOPE_OPTIONS,
      ]
    : SCOPE_OPTIONS;

  const canAddToQueue =
    customInstruction.trim().length > 0 &&
    hasJobDescription &&
    (scope !== "selected_role" || roleOptions.length > 0) &&
    (scope !== "professional_summary" ||
      (summaryRevisionAvailable && !summaryAlreadyQueued));

  const canReviseQueue = queue.length > 0 && hasJobDescription;

  function handleAddToQueue() {
    if (!canAddToQueue) {
      return;
    }

    const item: ResumeRevisionQueueItem =
      scope === "professional_summary"
        ? {
            id: createQueueItemId(),
            scope,
            customInstruction: customInstruction.trim(),
          }
        : {
            id: createQueueItemId(),
            scope,
            roleIndex,
            customInstruction: customInstruction.trim(),
          };

    setQueue((current) => [...current, item]);
    setCustomInstruction("");
    setPendingRevision(null);
    setAcceptFeedback(null);
    setError(null);
  }

  function handleRemoveQueueItem(itemId: string) {
    setQueue((current) => current.filter((item) => item.id !== itemId));
    setPendingRevision(null);
  }

  async function handleReviseSelectedSections() {
    if (!canReviseQueue || isRevising || disabled || !jobDescription?.rawText?.trim()) {
      return;
    }

    setIsRevising(true);
    setError(null);
    setWarnings([]);
    setPendingRevision(null);
    setAcceptFeedback(null);

    try {
      const response = await requestResumeBatchRevision({
        draftId: draft.id,
        queue,
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

      const candidateContent = applyResumeBatchRevision(draft.content, {
        summaryText: response.summaryCandidate?.text,
        roleUpdates: response.roleCandidates.map((candidate) => ({
          roleIndex: candidate.roleIndex,
          bullets: candidate.bullets,
        })),
        warnings: response.warnings,
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
        revisionError instanceof Error ? revisionError.message : "Resume batch revision failed.",
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
      setQueue([]);
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

  const previewSummaryChanged =
    pendingRevision &&
    pendingRevision.content.professionalSummary.text !== draft.content.professionalSummary.text;

  const previewRoleChanges =
    pendingRevision?.content.experience
      .map((role, index) => {
        const prior = draft.content.experience[index];
        if (!prior || JSON.stringify(prior.bullets) === JSON.stringify(role.bullets)) {
          return null;
        }
        return { index, role, prior };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null) ?? [];

  return (
    <div data-testid="resume-staged-custom-revision">
      <SetupCard
        title="Custom AI revision"
        description="Stage one or more scoped instructions, then revise all queued sections in a single AI step. Preview before accepting — Accept saves only the proposed changes."
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
                setScope(event.target.value as "professional_summary" | "selected_role");
                setPendingRevision(null);
              }}
              className={formFieldClassName}
              data-testid="resume-revision-scope"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!summaryRevisionAvailable ? (
              <p
                className="mt-2 text-xs text-amber-800"
                data-testid="resume-revision-summary-unavailable"
              >
                {PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY}
              </p>
            ) : null}
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
            Instructions stage only — they do not call AI until you click Revise selected sections.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isRevising || !canAddToQueue}
          onClick={handleAddToQueue}
          className={`mt-4 w-full sm:w-auto ${secondaryButtonClassName}`}
          data-action="add-resume-revision-queue"
        >
          Add to revision queue
        </button>

        {queue.length > 0 ? (
          <div
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
            data-testid="resume-revision-queue"
          >
            <p className="text-sm font-semibold text-slate-900">Revision queue</p>
            <ul className="mt-3 space-y-3">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  data-testid="resume-revision-queue-item"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.scope === "professional_summary"
                          ? "Professional summary"
                          : `${draft.content.experience[item.roleIndex]?.role} · ${draft.content.experience[item.roleIndex]?.company}`}
                      </p>
                      <p className="mt-1 text-slate-700">{item.customInstruction}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueueItem(item.id)}
                      className={secondaryButtonClassName}
                      data-action="remove-resume-revision-queue-item"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hasJobDescription ? (
          <p
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            data-testid="resume-revision-jd-required-hint"
          >
            Job description required for scoped revision.
          </p>
        ) : null}

        <button
          type="button"
          disabled={disabled || isRevising || !canReviseQueue}
          onClick={() => void handleReviseSelectedSections()}
          className={`mt-4 w-full sm:w-auto ${primaryButtonClassName}`}
          data-action="revise-resume-selected-sections"
          aria-busy={isRevising}
        >
          {isRevising ? "Revising…" : "Revise selected sections"}
        </button>
        <p className="mt-1 text-xs text-slate-500">Runs 1 AI step. Does not save until you accept.</p>

        {pendingRevision ? (
          <div
            className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4"
            data-testid="resume-revision-preview"
          >
            <p className="text-sm font-semibold text-slate-900">Revised draft preview</p>
            <p className="mt-1 text-xs text-slate-600">
              Accept all applies the queued changes to your saved draft. Reject all keeps the current
              version.
            </p>
            <div className="mt-3 max-h-64 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
              {previewSummaryChanged ? (
                <div data-testid="resume-revision-preview-summary">
                  <p className="m-0 font-medium text-slate-900">Professional summary</p>
                  <p className="mt-2 m-0 whitespace-pre-wrap">
                    {pendingRevision.content.professionalSummary.text}
                  </p>
                </div>
              ) : null}
              {previewRoleChanges.map((change) => (
                <div
                  key={`${change.index}-${change.role.company}`}
                  data-testid="resume-revision-preview-role"
                >
                  <p className="m-0 font-medium text-slate-900">
                    {change.role.role} · {change.role.company}
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    {change.role.bullets.map((bullet, bulletIndex) => (
                      <li key={`${bullet.text}-${bulletIndex}`}>{bullet.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {requiresReapprovalAfterAccept ? (
              <p
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                data-testid="resume-revision-reapproval-warning"
              >
                Saving this change requires re-approval before export.
              </p>
            ) : null}
            <div className={`${secondaryActionGroupClassName} mt-4`}>
              <button
                type="button"
                onClick={() => void handleAcceptRevision()}
                disabled={isAccepting}
                className={primaryButtonClassName}
                data-action="accept-resume-revision"
                aria-busy={isAccepting}
              >
                {isAccepting ? "Saving…" : "Accept all"}
              </button>
              <button
                type="button"
                onClick={handleRejectRevision}
                className={secondaryButtonClassName}
                data-action="reject-resume-revision"
              >
                Reject all / keep current
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
