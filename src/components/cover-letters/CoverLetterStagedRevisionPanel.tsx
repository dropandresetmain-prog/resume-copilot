"use client";

import { useState } from "react";

import { ModelSelectionDebug } from "@/components/ai/ModelSelectionDebug";
import { ModelTierSelect } from "@/components/ai/ModelTierSelect";
import {
  actionBarClassName,
  destructiveButtonClassName,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryActionGroupClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import {
  resolveCoverLetterModelTierForDraft,
  writeStoredCoverLetterModelTier,
} from "@/lib/ai/model-tier-storage";
import type { ModelTier } from "@/lib/ai/model-tiers";
import {
  COVER_LETTER_REVISION_ACTION_LABELS,
} from "@/lib/cover-letter/revision-prompt";
import { requestCoverLetterRevision } from "@/lib/cover-letter/revision-client";
import { splitCoverLetterParagraphs } from "@/lib/cover-letter/format-body";
import type { CoverLetterRevisionAction } from "@/types/cover-letter-draft";

const REVISION_CHIP_ACTIONS: Exclude<CoverLetterRevisionAction, "custom">[] = [
  "shorten",
  "warmer",
  "more_conversational",
  "more_direct",
  "more_formal",
  "remove_ai_phrases",
  "emphasize_company_fit",
  "emphasize_role_fit",
  "emphasize_technical_ai",
  "emphasize_founder_business",
];

type CoverLetterStagedRevisionPanelProps = {
  draftId: string;
  currentBody: string;
  disabled?: boolean;
  draftModelTier?: ModelTier | null;
  actualModel?: string | null;
  fallbackApplied?: boolean;
  onAccepted: (
    body: string,
    warnings: string[],
    modelSelection?: {
      requestedTier: ModelTier;
      actualModel?: string;
      fallbackApplied?: boolean;
    },
  ) => void | Promise<void>;
  onRegenerate?: () => void | Promise<void>;
  isRegenerating?: boolean;
  regenerateDisabled?: boolean;
  regenerateError?: string | null;
};

function buildStagedRevisionInstruction(
  selectedChips: ReadonlySet<CoverLetterRevisionAction>,
  customInstruction: string,
): string | null {
  const lines = REVISION_CHIP_ACTIONS.filter((action) => selectedChips.has(action)).map(
    (action) => COVER_LETTER_REVISION_ACTION_LABELS[action],
  );
  const custom = customInstruction.trim();
  if (custom) {
    lines.push(custom);
  }
  if (lines.length === 0) {
    return null;
  }
  return lines.map((line) => `- ${line}`).join("\n");
}

function chipClassName(selected: boolean): string {
  return selected
    ? "rounded-full border border-cyan-600 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-950"
    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400";
}

export function CoverLetterStagedRevisionPanel({
  draftId,
  currentBody,
  disabled = false,
  draftModelTier,
  actualModel,
  fallbackApplied = false,
  onAccepted,
  onRegenerate,
  isRegenerating = false,
  regenerateDisabled = false,
  regenerateError = null,
}: CoverLetterStagedRevisionPanelProps) {
  const [selectedChips, setSelectedChips] = useState<Set<CoverLetterRevisionAction>>(
    () => new Set(),
  );
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptFeedback, setAcceptFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingRevision, setPendingRevision] = useState<{
    body: string;
    warnings: string[];
    modelSelection?: {
      requestedTier: ModelTier;
      actualModel?: string;
      fallbackApplied?: boolean;
    };
  } | null>(null);
  const [coverLetterModelTier, setCoverLetterModelTier] = useState<ModelTier>(() =>
    resolveCoverLetterModelTierForDraft({ draftTier: draftModelTier }),
  );
  const [lastModelName, setLastModelName] = useState<string | null>(actualModel ?? null);
  const [lastFallbackApplied, setLastFallbackApplied] = useState(fallbackApplied);

  const stagedInstruction = buildStagedRevisionInstruction(selectedChips, customInstruction);
  const canRevise = Boolean(stagedInstruction) && currentBody.trim().length > 0;

  function toggleChip(action: CoverLetterRevisionAction) {
    setSelectedChips((current) => {
      const next = new Set(current);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
    setPendingRevision(null);
    setAcceptFeedback(null);
    setError(null);
  }

  async function handleReviseCoverLetter() {
    if (!canRevise || isRevising || disabled || !stagedInstruction) {
      return;
    }

    setIsRevising(true);
    setError(null);
    setWarnings([]);
    setPendingRevision(null);
    setAcceptFeedback(null);

    try {
      const response = await requestCoverLetterRevision({
        draftId,
        currentBody,
        action: "custom",
        customInstruction: `Apply these whole-letter revisions:\n${stagedInstruction}`,
        coverLetterModelTier,
        persist: false,
      });
      if (response.persisted) {
        throw new Error("Expected candidate-only revision, but the server persisted the draft.");
      }
      if (response.modelName) {
        setLastModelName(response.modelName);
      }
      setLastFallbackApplied(response.modelFallbackApplied ?? false);
      setPendingRevision({
        body: response.body,
        warnings: response.warnings,
        modelSelection: {
          requestedTier: coverLetterModelTier,
          actualModel: response.modelName,
          fallbackApplied: response.modelFallbackApplied,
        },
      });
      setWarnings(response.warnings);
    } catch (revisionError) {
      setError(
        revisionError instanceof Error
          ? revisionError.message
          : "Cover letter revision failed.",
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
        pendingRevision.body,
        pendingRevision.warnings,
        pendingRevision.modelSelection,
      );
      setAcceptFeedback("Revision saved.");
      setPendingRevision(null);
      setSelectedChips(new Set());
      setCustomInstruction("");
      setWarnings([]);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error ? acceptError.message : "Failed to save revised cover letter.",
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

  return (
    <div data-testid="cover-letter-staged-revision">
      <SetupCard
        title="Revise cover letter"
        description="Select instruction chips and/or add custom notes, then revise once. Preview the draft before accepting — Accept persists the revision."
      >
        <div className="mt-4 max-w-md">
          <ModelTierSelect
            id="cover-letter-revision-model-tier"
            label="Cover letter model"
            value={coverLetterModelTier}
            disabled={disabled || isRevising}
            onChange={(tier) => {
              setCoverLetterModelTier(tier);
              writeStoredCoverLetterModelTier(tier);
            }}
          />
          <ModelSelectionDebug
            requestedTier={coverLetterModelTier}
            actualModel={lastModelName}
            fallbackApplied={lastFallbackApplied}
          />
        </div>

        <div className={`mt-4 ${actionBarClassName}`}>
          <p className="text-xs font-semibold uppercase text-slate-500">Revision instructions</p>
          <p className="mt-1 text-xs text-slate-500">
            Chips stage instructions only — they do not call AI until you click Revise cover letter.
          </p>
          <div
            className={`${secondaryActionGroupClassName} mt-3`}
            data-testid="cover-letter-revision-chips"
          >
            {REVISION_CHIP_ACTIONS.map((action) => {
              const selected = selectedChips.has(action);
              return (
                <button
                  key={action}
                  type="button"
                  disabled={disabled || isRevising}
                  onClick={() => toggleChip(action)}
                  className={`${chipClassName(selected)} sm:w-auto`}
                  aria-pressed={selected}
                  data-revision-chip={action}
                >
                  {COVER_LETTER_REVISION_ACTION_LABELS[action]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="cover-letter-custom-revision" className={labelClassName}>
            Custom instructions
          </label>
          <textarea
            id="cover-letter-custom-revision"
            value={customInstruction}
            onChange={(event) => {
              setCustomInstruction(event.target.value);
              setPendingRevision(null);
            }}
            rows={3}
            className={formFieldClassName}
            placeholder='e.g. "Make this sound less corporate."'
          />
        </div>

        <button
          type="button"
          disabled={disabled || isRevising || !canRevise}
          onClick={() => void handleReviseCoverLetter()}
          className={`mt-4 w-full sm:w-auto ${primaryButtonClassName}`}
          data-action="revise-cover-letter"
          aria-busy={isRevising}
        >
          {isRevising ? "Revising…" : "Revise cover letter"}
        </button>
        <p className="mt-1 text-xs text-slate-500">Runs 1 AI step. Does not save until you accept.</p>

        {pendingRevision ? (
          <div
            className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4"
            data-testid="cover-letter-revision-preview"
          >
            <p className="text-sm font-semibold text-slate-900">Revised draft preview</p>
            <p className="mt-1 text-xs text-slate-600">
              Accept replaces the saved letter. Reject keeps your current version.
            </p>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
              <div className="space-y-3 font-serif text-sm leading-6 text-slate-800">
                {splitCoverLetterParagraphs(pendingRevision.body).map((paragraph, index) => (
                  <p key={index} className="m-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <div className={`${secondaryActionGroupClassName} mt-4`}>
              <button
                type="button"
                onClick={() => void handleAcceptRevision()}
                disabled={isAccepting}
                className={primaryButtonClassName}
                data-action="accept-cover-letter-revision"
                aria-busy={isAccepting}
              >
                {isAccepting ? "Saving…" : "Accept revision"}
              </button>
              <button
                type="button"
                onClick={handleRejectRevision}
                className={secondaryButtonClassName}
                data-action="reject-cover-letter-revision"
              >
                Reject / keep current
              </button>
            </div>
          </div>
        ) : null}

        {acceptFeedback ? (
          <p className="mt-3 text-sm text-emerald-800" role="status" data-testid="cover-letter-revision-saved">
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

        {onRegenerate ? (
          <div
            className="mt-6 border-t border-slate-200 pt-6"
            data-testid="cover-letter-regenerate-section"
          >
            <p className="text-xs font-semibold uppercase text-slate-500">Full regeneration</p>
            <p className="mt-1 text-xs text-slate-600">
              Regenerates cover letter only · 1 AI step · resume unchanged.
            </p>
            <button
              type="button"
              onClick={() => void onRegenerate()}
              disabled={disabled || isRevising || isRegenerating || regenerateDisabled}
              className={`mt-3 w-full sm:w-auto ${destructiveButtonClassName}`}
              data-action="regenerate-cover-letter"
              aria-busy={isRegenerating}
            >
              {isRegenerating ? "Regenerating cover letter…" : "Regenerate cover letter"}
            </button>
            {regenerateError ? (
              <p className="mt-2 text-sm text-red-700">{regenerateError}</p>
            ) : null}
          </div>
        ) : null}
      </SetupCard>
    </div>
  );
}
