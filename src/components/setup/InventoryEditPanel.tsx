"use client";

import { useMemo, useState } from "react";

import {
  EmptyState,
  SetupCard,
  SourceCitationChips,
  formFieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import {
  countEditedInventoryBullets,
  countHiddenInventoryBullets,
  hideInventoryBullet,
  listCollatedBulletsWithEditState,
  restoreInventoryBullet,
  setInventoryBulletEdit,
} from "@/lib/inventory/edits";
import type { CollatedExperience } from "@/types/collated";
import { createEmptyInventoryEdits, type InventoryEdits } from "@/types/inventory-edits";
import type { InventoryState } from "@/types/resume";

type InventoryEditPanelProps = {
  inventory: InventoryState;
  onSaveEdits: (edits: InventoryEdits) => void;
};

function groupListingsByExperience(
  listings: ReturnType<typeof listCollatedBulletsWithEditState>,
): Array<{ experience: CollatedExperience; bullets: typeof listings }> {
  const grouped = new Map<string, { experience: CollatedExperience; bullets: typeof listings }>();

  for (const listing of listings) {
    const existing = grouped.get(listing.experience.id);
    if (!existing) {
      grouped.set(listing.experience.id, {
        experience: listing.experience,
        bullets: [listing],
      });
      continue;
    }
    existing.bullets.push(listing);
  }

  return [...grouped.values()];
}

export function InventoryEditPanel({ inventory, onSaveEdits }: InventoryEditPanelProps) {
  const rawCollated = useMemo(() => buildCollatedInventory(inventory), [inventory]);
  const [draftEdits, setDraftEdits] = useState<InventoryEdits>(
    () => inventory.edits ?? createEmptyInventoryEdits(),
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState("");

  const listings = useMemo(
    () => listCollatedBulletsWithEditState(rawCollated, draftEdits),
    [rawCollated, draftEdits],
  );
  const grouped = useMemo(() => groupListingsByExperience(listings), [listings]);

  const hiddenCount = countHiddenInventoryBullets(draftEdits);
  const editedCount = countEditedInventoryBullets(draftEdits);
  const hasChanges =
    JSON.stringify(draftEdits) !== JSON.stringify(inventory.edits ?? createEmptyInventoryEdits());

  function handleSave() {
    onSaveEdits(draftEdits);
  }

  function handleReset() {
    setDraftEdits(inventory.edits ?? createEmptyInventoryEdits());
    setEditingKey(null);
  }

  if (rawCollated.experiences.length === 0) {
    return (
      <SetupCard
        title="Edit inventory bullets"
        description="Hide redundant bullets or adjust active wording without changing uploaded source files."
      >
        <div className="mt-4">
          <EmptyState
            title="No work experience to edit"
            description="Upload resumes first, then return here to manage bullets used during generation."
          />
        </div>
      </SetupCard>
    );
  }

  return (
    <SetupCard
      title="Edit inventory bullets"
      description="Hide redundant bullets or adjust active wording. Uploaded source resumes are preserved — changes apply to the active inventory layer only."
    >
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>Excluded from generation: {hiddenCount}</span>
        <span>Edited wording: {editedCount}</span>
      </div>

      <div className="mt-4 space-y-4">
        {grouped.map(({ experience, bullets }) => {
          const metadata = [experience.role, experience.dateRange, experience.location]
            .filter(Boolean)
            .join(" · ");

          return (
            <article
              key={experience.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-base font-semibold text-zinc-900">{experience.company}</h3>
              {metadata ? <p className="mt-1 text-sm text-zinc-600">{metadata}</p> : null}
              <SourceCitationChips citations={experience.sourceCitations} />

              <ul className="mt-4 space-y-3">
                {bullets.map((listing) => {
                  const isEditing = editingKey === listing.bulletKey;

                  return (
                    <li
                      key={listing.bullet.id}
                      className={`border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0 ${
                        listing.isHidden ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {listing.bullet.keyword ? (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            {listing.bullet.keyword}
                          </span>
                        ) : null}
                        {listing.isHidden ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                            Excluded from generation
                          </span>
                        ) : null}
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editDraftText}
                          onChange={(event) => setEditDraftText(event.target.value)}
                          rows={3}
                          className={`${formFieldClassName} mt-2`}
                        />
                      ) : (
                        <p
                          className={`mt-2 text-sm leading-6 text-zinc-800 ${
                            listing.isHidden ? "line-through" : ""
                          }`}
                        >
                          {listing.effectiveDescription}
                        </p>
                      )}

                      {listing.editedText ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Original: {listing.bullet.description}
                        </p>
                      ) : null}

                      <SourceCitationChips citations={listing.bullet.sourceCitations} />

                      <div className="mt-3 flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className={secondaryButtonClassName}
                              onClick={() => {
                                setDraftEdits((current) =>
                                  setInventoryBulletEdit(
                                    current,
                                    listing.bulletKey,
                                    editDraftText,
                                  ),
                                );
                                setEditingKey(null);
                              }}
                            >
                              Save wording
                            </button>
                            <button
                              type="button"
                              className={secondaryButtonClassName}
                              onClick={() => {
                                setEditDraftText(
                                  draftEdits.editedBulletTextByBulletKey[listing.bulletKey] ??
                                    listing.bullet.description,
                                );
                                setEditingKey(null);
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={secondaryButtonClassName}
                              onClick={() => {
                                setEditDraftText(
                                  draftEdits.editedBulletTextByBulletKey[listing.bulletKey] ??
                                    listing.bullet.description,
                                );
                                setEditingKey(listing.bulletKey);
                              }}
                            >
                              Edit wording
                            </button>
                            {listing.isHidden ? (
                              <button
                                type="button"
                                className={secondaryButtonClassName}
                                onClick={() =>
                                  setDraftEdits((current) =>
                                    restoreInventoryBullet(current, listing.bulletKey),
                                  )
                                }
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={secondaryButtonClassName}
                                onClick={() =>
                                  setDraftEdits((current) =>
                                    hideInventoryBullet(current, listing.bulletKey),
                                  )
                                }
                              >
                                Exclude from generation
                              </button>
                            )}
                            {listing.editedText ? (
                              <button
                                type="button"
                                className={secondaryButtonClassName}
                                onClick={() =>
                                  setDraftEdits((current) =>
                                    setInventoryBulletEdit(current, listing.bulletKey, null),
                                  )
                                }
                              >
                                Reset wording
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges}
          className={primaryButtonClassName}
        >
          Save inventory edits
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges}
          className={secondaryButtonClassName}
        >
          Discard changes
        </button>
      </div>
    </SetupCard>
  );
}
