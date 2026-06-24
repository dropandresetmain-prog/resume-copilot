"use client";

import { useState } from "react";

import { ModelSelectionDebug } from "@/components/ai/ModelSelectionDebug";
import { ModelTierSelect } from "@/components/ai/ModelTierSelect";
import {
  actionBarClassName,
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
import type { CoverLetterRevisionAction } from "@/types/cover-letter-draft";

const QUICK_REVISION_ACTIONS: Exclude<CoverLetterRevisionAction, "custom">[] = [
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

type CoverLetterQuickRevisionPanelProps = {
  draftId: string;
  currentBody: string;
  disabled?: boolean;
  draftModelTier?: ModelTier | null;
  actualModel?: string | null;
  fallbackApplied?: boolean;
  onRevised: (
    body: string,
    warnings: string[],
    modelSelection?: {
      requestedTier: ModelTier;
      actualModel?: string;
      fallbackApplied?: boolean;
    },
  ) => void;
};

export function CoverLetterQuickRevisionPanel({
  draftId,
  currentBody,
  disabled = false,
  draftModelTier,
  actualModel,
  fallbackApplied = false,
  onRevised,
}: CoverLetterQuickRevisionPanelProps) {
  const [isRevising, setIsRevising] = useState(false);
  const [activeAction, setActiveAction] = useState<CoverLetterRevisionAction | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [coverLetterModelTier, setCoverLetterModelTier] = useState<ModelTier>(() =>
    resolveCoverLetterModelTierForDraft({ draftTier: draftModelTier }),
  );
  const [lastModelName, setLastModelName] = useState<string | null>(actualModel ?? null);
  const [lastFallbackApplied, setLastFallbackApplied] = useState(fallbackApplied);

  async function runRevision(action: CoverLetterRevisionAction, instruction?: string) {
    if (!currentBody.trim() || isRevising || disabled) {
      return;
    }

    setIsRevising(true);
    setActiveAction(action);
    setError(null);
    setWarnings([]);

    try {
      const response = await requestCoverLetterRevision({
        draftId,
        currentBody,
        action,
        customInstruction: instruction,
        coverLetterModelTier,
      });
      if (response.modelName) {
        setLastModelName(response.modelName);
      }
      setLastFallbackApplied(response.modelFallbackApplied ?? false);
      onRevised(response.body, response.warnings, {
        requestedTier: coverLetterModelTier,
        actualModel: response.modelName,
        fallbackApplied: response.modelFallbackApplied,
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
      setActiveAction(null);
    }
  }

  return (
    <div data-testid="cover-letter-ai-revision">
    <SetupCard
      title="AI revision"
      description="Quick or custom AI rewrites. Each revision overwrites the saved letter immediately (1 AI step) — no separate save button."
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
        <p className="text-xs font-semibold uppercase text-slate-500">
          Revision shortcuts
        </p>
        <div className={`${secondaryActionGroupClassName} mt-3`}>
        {QUICK_REVISION_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            disabled={disabled || isRevising}
            onClick={() => void runRevision(action)}
            className={`${secondaryButtonClassName} sm:w-auto`}
          >
            {isRevising && activeAction === action
              ? "Revising…"
              : COVER_LETTER_REVISION_ACTION_LABELS[action]}
          </button>
        ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="cover-letter-custom-revision" className={labelClassName}>
          Revise this cover letter to…
        </label>
        <textarea
          id="cover-letter-custom-revision"
          value={customInstruction}
          onChange={(event) => setCustomInstruction(event.target.value)}
          rows={3}
          className={formFieldClassName}
          placeholder='e.g. "Make this sound less corporate." or "Make this more suitable for a construction / facade company."'
        />
        <button
          type="button"
          disabled={disabled || isRevising || !customInstruction.trim()}
          onClick={() => void runRevision("custom", customInstruction)}
          className={`mt-2 w-full sm:w-auto ${secondaryButtonClassName}`}
        >
          {isRevising && activeAction === "custom" ? "Revising…" : "Apply custom revision"}
        </button>
        <p className="mt-1 text-xs text-slate-500">Runs 1 AI revision and saves immediately.</p>
      </div>

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
