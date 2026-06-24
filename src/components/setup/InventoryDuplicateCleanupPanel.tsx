"use client";

import { useMemo } from "react";

import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import {
  clearInventoryAlternateWording,
  getEffectiveBulletDescription,
  hideInventoryDuplicateBullet,
  isBulletHidden,
  isInventoryAlternateWording,
  keepBothInventoryDuplicateGroup,
  keepOneInventoryDuplicateBullet,
  markInventoryAlternateWording,
  restoreInventoryBullet,
} from "@/lib/inventory/edits";
import { listActiveInventoryDuplicateGroups } from "@/lib/inventory/duplicate-detection";
import type { InventoryEdits } from "@/types/inventory-edits";
import type { InventoryState } from "@/types/resume";

type InventoryDuplicateCleanupPanelProps = {
  inventory: InventoryState;
  draftEdits: InventoryEdits;
  onDraftEditsChange: (edits: InventoryEdits) => void;
};

export function InventoryDuplicateCleanupPanel({
  inventory,
  draftEdits,
  onDraftEditsChange,
}: InventoryDuplicateCleanupPanelProps) {
  const rawCollated = useMemo(() => buildCollatedInventory(inventory), [inventory]);
  const duplicateGroups = useMemo(
    () => listActiveInventoryDuplicateGroups(rawCollated, draftEdits),
    [rawCollated, draftEdits],
  );

  if (duplicateGroups.length === 0) {
    return null;
  }

  return (
    <div data-testid="inventory-duplicate-cleanup-panel">
      <SetupCard
        title="Likely duplicate bullets"
        description="Same role bullets that look like variants or repeats. Nothing is removed automatically — choose what to keep for generation."
      >
      <p className="mt-3 text-sm text-slate-600">
        {duplicateGroups.length} group{duplicateGroups.length === 1 ? "" : "s"} need review.
        Save changes to inventory on the Edit Bullets tab when you are done.
      </p>

      <div className="mt-4 space-y-4">
        {duplicateGroups.map((group) => (
          <article
            key={group.id}
            className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-4"
            data-testid="inventory-duplicate-group"
          >
            <h3 className="text-sm font-semibold text-slate-900">
              {group.company} · {group.role}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {group.reasons.join(" · ")}
            </p>

            <ul className="mt-3 space-y-3">
              {group.bulletKeys.map((bulletKey, index) => {
                const hidden = isBulletHidden(draftEdits, bulletKey);
                const alternate = isInventoryAlternateWording(draftEdits, bulletKey);
                const description =
                  group.descriptions[index] ??
                  getEffectiveBulletDescription(draftEdits, bulletKey, "");

                return (
                  <li
                    key={bulletKey}
                    className={`rounded-lg border bg-white p-3 ${
                      hidden ? "border-slate-200 opacity-70" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {hidden ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Hidden from generation
                        </span>
                      ) : null}
                      {alternate ? (
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-900">
                          Alternate wording
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-2 text-sm leading-6 text-slate-800 ${
                        hidden ? "line-through" : ""
                      }`}
                    >
                      {description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={primaryButtonClassName}
                        data-action="keep-duplicate-bullet"
                        onClick={() =>
                          onDraftEditsChange(
                            keepOneInventoryDuplicateBullet(draftEdits, group, bulletKey),
                          )
                        }
                      >
                        Keep this one
                      </button>
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        data-action="hide-duplicate-bullet"
                        onClick={() =>
                          onDraftEditsChange(
                            hideInventoryDuplicateBullet(draftEdits, bulletKey),
                          )
                        }
                      >
                        Hide from generation
                      </button>
                      {hidden ? (
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          onClick={() =>
                            onDraftEditsChange(restoreInventoryBullet(draftEdits, bulletKey))
                          }
                        >
                          Restore
                        </button>
                      ) : null}
                      {!hidden ? (
                        <button
                          type="button"
                          className={secondaryButtonClassName}
                          data-action="mark-alternate-wording"
                          onClick={() =>
                            onDraftEditsChange(
                              alternate
                                ? clearInventoryAlternateWording(draftEdits, bulletKey)
                                : markInventoryAlternateWording(draftEdits, bulletKey),
                            )
                          }
                        >
                          {alternate ? "Unmark alternate wording" : "Mark alternate wording"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className={`${secondaryButtonClassName} mt-3`}
              data-action="keep-both-duplicate-group"
              onClick={() =>
                onDraftEditsChange(keepBothInventoryDuplicateGroup(draftEdits, group))
              }
            >
              Keep both (intentional variants)
            </button>
          </article>
        ))}
      </div>
      </SetupCard>
    </div>
  );
}
