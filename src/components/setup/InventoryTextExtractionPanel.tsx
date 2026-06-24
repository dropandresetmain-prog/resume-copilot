"use client";

import { useMemo, useState } from "react";

import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { applyAcceptedInventoryTextSuggestions } from "@/lib/inventory-text-extraction/apply";
import { buildInventoryTextExtractionRequest } from "@/lib/inventory-text-extraction/context";
import {
  extractInventoryTextFromApi,
  type InventoryTextExtractionClientError,
} from "@/lib/inventory-text-extraction/client";
import { flagDuplicateInventoryTextSuggestions } from "@/lib/inventory-text-extraction/duplicate-preview";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentState } from "@/types/enrichment";
import type { InventoryEdits } from "@/types/inventory-edits";
import type {
  InventoryTextExtractionSuggestion,
  InventoryTextSuggestionCategory,
  ReviewedInventoryTextSuggestion,
} from "@/types/inventory-text-extraction";

const CATEGORY_LABELS: Record<InventoryTextSuggestionCategory, string> = {
  work_experience: "Work experience",
  bullets: "Bullets",
  skills: "Skills",
  education: "Education",
  additional_experience: "Additional experience",
  keywords: "Keywords",
};

const CATEGORY_ORDER: InventoryTextSuggestionCategory[] = [
  "work_experience",
  "bullets",
  "skills",
  "education",
  "additional_experience",
  "keywords",
];

type PanelPhase = "closed" | "paste" | "review" | "applied";

type InventoryTextExtractionPanelProps = {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  draftEdits: InventoryEdits;
  onDraftEditsChange: (edits: InventoryEdits) => void;
  onSaveApplied: (edits: InventoryEdits, enrichment: EnrichmentState) => Promise<void>;
};

function matchLabelCopy(label: InventoryTextExtractionSuggestion["matchLabel"]): string {
  switch (label) {
    case "add_to_existing":
      return "Add to existing experience";
    case "new_experience":
      return "New experience suggestion";
    case "standalone":
      return "Standalone";
  }
}

function toReviewed(
  suggestions: InventoryTextExtractionSuggestion[],
): ReviewedInventoryTextSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    reviewStatus: "pending",
  }));
}

export function InventoryTextExtractionPanel({
  collated,
  enrichment,
  draftEdits,
  onDraftEditsChange,
  onSaveApplied,
}: InventoryTextExtractionPanelProps) {
  const [phase, setPhase] = useState<PanelPhase>("closed");
  const [pastedText, setPastedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractDebugRaw, setExtractDebugRaw] = useState<string | null>(null);
  const [insufficientReason, setInsufficientReason] = useState<string | null>(null);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<ReviewedInventoryTextSuggestion[]>([]);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<InventoryTextSuggestionCategory, ReviewedInventoryTextSuggestion[]>();
    for (const category of CATEGORY_ORDER) {
      map.set(category, []);
    }
    for (const suggestion of reviewed) {
      map.get(suggestion.category)?.push(suggestion);
    }
    return map;
  }, [reviewed]);

  const acceptedCount = reviewed.filter((item) => item.reviewStatus === "accepted").length;
  const applyableAcceptedCount = reviewed.filter(
    (item) => item.reviewStatus === "accepted" && item.applyability === "applyable",
  ).length;

  function openPanel() {
    setPhase("paste");
    setExtractError(null);
    setApplyFeedback(null);
  }

  function closePanel() {
    setPhase("closed");
    setPastedText("");
    setReviewed([]);
    setExtractError(null);
    setExtractDebugRaw(null);
    setInsufficientReason(null);
    setExtractionWarnings([]);
    setApplyFeedback(null);
  }

  async function handleExtract() {
    setIsExtracting(true);
    setExtractError(null);
    setExtractDebugRaw(null);
    setInsufficientReason(null);
    setExtractionWarnings([]);
    setApplyFeedback(null);

    try {
      const request = buildInventoryTextExtractionRequest(pastedText, collated);
      const result = await extractInventoryTextFromApi(request);

      if (!result.sufficient || result.suggestions.length === 0) {
        setInsufficientReason(
          result.insufficientReason ??
            "Not enough information to extract suggestions. Add more role context, bullets, or skills.",
        );
        setExtractionWarnings(result.warnings);
        setReviewed([]);
        setPhase("review");
        return;
      }

      const flagged = flagDuplicateInventoryTextSuggestions(result.suggestions, collated);
      setReviewed(toReviewed(flagged));
      setExtractionWarnings(result.warnings);
      setPhase("review");
    } catch (error) {
      const clientError = error as InventoryTextExtractionClientError;
      setExtractError(clientError.message ?? "Extraction failed.");
      setExtractDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsExtracting(false);
    }
  }

  function updateSuggestion(
    id: string,
    patch: Partial<ReviewedInventoryTextSuggestion>,
  ) {
    setReviewed((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleApplyAccepted() {
    setIsApplying(true);
    setApplyFeedback(null);

    try {
      const result = applyAcceptedInventoryTextSuggestions(
        reviewed,
        draftEdits,
        enrichment,
        collated,
      );

      onDraftEditsChange(result.edits);
      await onSaveApplied(result.edits, result.enrichment);

      const skippedNote =
        result.skippedCount > 0
          ? ` ${result.skippedCount} preview-only or unmappable suggestion(s) skipped.`
          : "";

      setApplyFeedback(
        `Applied ${result.appliedCount} suggestion(s) to inventory overlay.${skippedNote}`,
      );
      setPhase("applied");
    } catch {
      setApplyFeedback("Failed to save applied suggestions. Check the storage warning above.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div data-testid="inventory-text-extraction-panel">
      {phase === "closed" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={primaryButtonClassName}
            data-testid="inventory-add-from-text"
            onClick={openPanel}
          >
            Add from text
          </button>
          <p className="text-sm text-slate-600">
            Paste career notes or a ChatGPT summary — extract suggestions, review, then apply.
          </p>
        </div>
      ) : (
        <SetupCard
          title="Add experience from text"
          description="Paste free-form career text. Nothing is saved until you apply accepted suggestions."
        >
          {phase === "paste" || (phase === "review" && reviewed.length === 0 && insufficientReason) ? (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-900" htmlFor="inventory-paste-text">
                Pasted text
              </label>
              <textarea
                id="inventory-paste-text"
                data-testid="inventory-paste-text"
                className="min-h-[10rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                placeholder="Paste a career summary, project notes, extra bullets, or rough stories…"
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                disabled={isExtracting}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButtonClassName}
                  data-testid="inventory-extract-suggestions"
                  disabled={isExtracting || !pastedText.trim()}
                  onClick={() => void handleExtract()}
                >
                  {isExtracting ? "Extracting…" : "Extract suggestions"}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={closePanel}
                  disabled={isExtracting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {extractError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              <p className="font-medium">{extractError}</p>
              {extractDebugRaw ? (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-red-800">
                  {extractDebugRaw}
                </pre>
              ) : null}
            </div>
          ) : null}

          {insufficientReason && reviewed.length === 0 ? (
            <div
              role="status"
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p className="font-medium">Not enough information</p>
              <p className="mt-1">{insufficientReason}</p>
            </div>
          ) : null}

          {extractionWarnings.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {extractionWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {reviewed.length > 0 ? (
            <div className="mt-4 space-y-6" data-testid="inventory-text-suggestion-review">
              {CATEGORY_ORDER.map((category) => {
                const items = grouped.get(category) ?? [];
                if (items.length === 0) return null;

                return (
                  <section key={category}>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {CATEGORY_LABELS[category]} ({items.length})
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {items.map((suggestion) => (
                        <li
                          key={suggestion.id}
                          className="rounded-lg border border-slate-200 bg-white p-4"
                          data-testid="inventory-text-suggestion-item"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-cyan-800">
                                {matchLabelCopy(suggestion.matchLabel)}
                                {suggestion.applyability === "preview_only"
                                  ? " · Preview only"
                                  : ""}
                              </p>
                              {suggestion.company || suggestion.role ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {[suggestion.company, suggestion.role].filter(Boolean).join(" · ")}
                                </p>
                              ) : null}
                              <textarea
                                className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                                rows={2}
                                value={suggestion.editedText ?? suggestion.text}
                                onChange={(event) =>
                                  updateSuggestion(suggestion.id, {
                                    editedText: event.target.value,
                                  })
                                }
                              />
                              {suggestion.duplicateOfBulletKey ? (
                                <p className="mt-2 text-xs text-amber-800">
                                  {suggestion.duplicateReason ??
                                    "May duplicate an existing bullet."}
                                </p>
                              ) : null}
                              {suggestion.warnings.map((warning) => (
                                <p key={warning} className="mt-1 text-xs text-slate-500">
                                  {warning}
                                </p>
                              ))}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                className={
                                  suggestion.reviewStatus === "accepted"
                                    ? primaryButtonClassName
                                    : secondaryButtonClassName
                                }
                                onClick={() =>
                                  updateSuggestion(suggestion.id, { reviewStatus: "accepted" })
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className={
                                  suggestion.reviewStatus === "rejected"
                                    ? primaryButtonClassName
                                    : secondaryButtonClassName
                                }
                                onClick={() =>
                                  updateSuggestion(suggestion.id, { reviewStatus: "rejected" })
                                }
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className={primaryButtonClassName}
                  data-testid="inventory-apply-accepted-suggestions"
                  disabled={isApplying || applyableAcceptedCount === 0}
                  onClick={() => void handleApplyAccepted()}
                >
                  {isApplying
                    ? "Applying…"
                    : `Apply accepted suggestions (${applyableAcceptedCount})`}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() => setPhase("paste")}
                  disabled={isApplying}
                >
                  Edit pasted text
                </button>
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={closePanel}
                  disabled={isApplying}
                >
                  Close
                </button>
                <p className="text-sm text-slate-600">
                  {acceptedCount} accepted · preview-only items are not persisted
                </p>
              </div>
            </div>
          ) : null}

          {applyFeedback ? (
            <div
              role="status"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              data-testid="inventory-text-apply-feedback"
            >
              {applyFeedback}
            </div>
          ) : null}
        </SetupCard>
      )}
    </div>
  );
}
