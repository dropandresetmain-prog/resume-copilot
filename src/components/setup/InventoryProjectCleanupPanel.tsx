"use client";

import { useMemo, useState } from "react";

import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import {
  auditProjectLikeOverlayPollution,
  dismissProjectOverlayCleanup,
  keepProjectOverlayAsWorkExperience,
  moveProjectOverlayToAdditionalExperience,
  REGENERATE_AFTER_PROJECT_CLEANUP_MESSAGE,
} from "@/lib/inventory/project-overlay-audit";
import type { InventoryEdits } from "@/types/inventory-edits";

type InventoryProjectCleanupPanelProps = {
  draftEdits: InventoryEdits;
  savedEdits: InventoryEdits;
  hasUnsavedChanges?: boolean;
  onDraftEditsChange: (edits: InventoryEdits) => void;
  onSaveCleanup: (edits: InventoryEdits) => Promise<void>;
};

export function InventoryProjectCleanupPanel({
  draftEdits,
  savedEdits,
  hasUnsavedChanges = false,
  onDraftEditsChange,
  onSaveCleanup,
}: InventoryProjectCleanupPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);

  const auditItems = useMemo(
    () => auditProjectLikeOverlayPollution(draftEdits),
    [draftEdits],
  );

  const showRegenerateWarning =
    Boolean(draftEdits.projectInventoryCleanupAt) ||
    Boolean(savedEdits.projectInventoryCleanupAt);

  if (auditItems.length === 0 && !showRegenerateWarning) {
    return null;
  }

  async function persistEdits(nextEdits: InventoryEdits, moved = false) {
    setIsSaving(true);
    setSaveError(null);
    onDraftEditsChange(nextEdits);
    try {
      await onSaveCleanup(nextEdits);
      if (moved) {
        setMoveFeedback("Moved to Additional Experience");
      }
    } catch {
      setSaveError("Failed to save cleanup changes. Try again from the Edit Bullets tab.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMove(experienceId: string) {
    const nextEdits = moveProjectOverlayToAdditionalExperience(draftEdits, experienceId);
    await persistEdits(nextEdits, true);
  }

  async function handleKeep(experienceId: string) {
    const nextEdits = keepProjectOverlayAsWorkExperience(draftEdits, experienceId);
    await persistEdits(nextEdits);
  }

  async function handleDismiss(experienceId: string) {
    const nextEdits = dismissProjectOverlayCleanup(draftEdits, experienceId);
    await persistEdits(nextEdits);
  }

  return (
    <div data-testid="inventory-project-cleanup-panel">
      {auditItems.length > 0 ? (
        <SetupCard
          title="Project placement cleanup"
          description="Some imported project notes are currently stored as Work Experience. Projects should usually be Additional Experience."
        >
          <p className="mt-3 text-sm text-slate-600">
            {auditItems.length} item{auditItems.length === 1 ? "" : "s"} need review.
          </p>
          <p
            className={`mt-2 text-sm font-medium ${hasUnsavedChanges ? "text-amber-900" : "text-emerald-800"}`}
            role="status"
            data-testid="inventory-project-cleanup-save-state"
          >
            {hasUnsavedChanges ? "Unsaved — save on Edit Bullets tab" : "Cleanup changes saved"}
          </p>
          {saveError ? (
            <p className="mt-2 text-sm text-red-800" role="alert">
              {saveError}
            </p>
          ) : null}
          {moveFeedback ? (
            <p
              className="mt-2 text-sm font-medium text-emerald-800"
              role="status"
              data-testid="inventory-project-cleanup-moved-feedback"
            >
              {moveFeedback}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {auditItems.map((item) => (
              <article
                key={item.experienceId}
                className="rounded-lg border border-cyan-200/80 bg-cyan-50/40 p-4"
                data-testid="inventory-project-cleanup-item"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {item.company} · {item.role}
                </h3>
                {item.descriptor ? (
                  <p className="mt-1 text-sm text-slate-700">{item.descriptor}</p>
                ) : null}
                {item.bullets.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {item.bullets.map((bullet) => (
                      <li key={bullet.id}>{bullet.description}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Proposed Additional Experience
                </p>
                <p className="mt-1 text-sm text-slate-800">{item.proposedAdditionalExperienceLine}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryButtonClassName}
                    disabled={isSaving}
                    data-testid="inventory-project-cleanup-move"
                    onClick={() => void handleMove(item.experienceId)}
                  >
                    Move to Additional Experience
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={isSaving}
                    data-testid="inventory-project-cleanup-keep"
                    onClick={() => void handleKeep(item.experienceId)}
                  >
                    Keep as Work Experience
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={isSaving}
                    data-testid="inventory-project-cleanup-dismiss"
                    onClick={() => void handleDismiss(item.experienceId)}
                  >
                    Hide for now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SetupCard>
      ) : null}

      {showRegenerateWarning ? (
        <p
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
          data-testid="inventory-project-cleanup-regenerate-warning"
        >
          {REGENERATE_AFTER_PROJECT_CLEANUP_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
