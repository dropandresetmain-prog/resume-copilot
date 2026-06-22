"use client";

import { useMemo, useState } from "react";

import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { listCollatedBulletsWithEditState } from "@/lib/inventory/edits";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import { requestResumeDraftGeneration } from "@/lib/resume-draft/client";
import { buildResumeDraftPayloadFromInventory } from "@/lib/resume-draft/payload";
import { formatSourceRefLabel, hasSourceRefs } from "@/lib/resume-draft/preview-helpers";
import { assessRegenerationFeasibility } from "@/lib/resume-draft/regeneration";
import { updateGeneratedResumeDraftInCloud } from "@/lib/supabase/generated-resume-drafts";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type {
  GeneratedResumeDraftRecord,
  ResumeDraftRegenerationControls,
} from "@/types/resume-draft";

type ResumeEvidenceRegenerationPanelProps = {
  draft: GeneratedResumeDraftRecord;
  inventory: InventoryState;
  jobDescription: StoredJobDescription | null;
  onDraftUpdated: (draft: GeneratedResumeDraftRecord) => void;
};

function collectSourceKeysFromBullet(
  sourceRefs: Array<{ bulletKey?: string }>,
): string[] {
  return sourceRefs
    .map((ref) => ref.bulletKey?.trim())
    .filter((key): key is string => Boolean(key));
}

export function ResumeEvidenceRegenerationPanel({
  draft,
  inventory,
  jobDescription,
  onDraftUpdated,
}: ResumeEvidenceRegenerationPanelProps) {
  const activeCollated = useMemo(() => buildActiveCollatedInventory(inventory), [inventory]);
  const rawCollated = useMemo(() => buildCollatedInventory(inventory), [inventory]);
  const availableBullets = useMemo(
    () =>
      listCollatedBulletsWithEditState(rawCollated, inventory.edits).filter(
        (listing) => !listing.isHidden,
      ),
    [rawCollated, inventory.edits],
  );

  const [excludedGeneratedKeys, setExcludedGeneratedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [forcedKeys, setForcedKeys] = useState<Set<string>>(
    () => new Set(draft.inputSnapshot?.regenerationControls?.forcedBulletKeys ?? []),
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const regenerationControls: ResumeDraftRegenerationControls = useMemo(
    () => ({
      forcedBulletKeys: [...forcedKeys],
      excludedBulletKeys: [...excludedGeneratedKeys],
    }),
    [forcedKeys, excludedGeneratedKeys],
  );

  const feasibility = useMemo(
    () => assessRegenerationFeasibility({ regenerationControls }),
    [regenerationControls],
  );

  function toggleExcluded(key: string) {
    setExcludedGeneratedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleForced(key: string) {
    setForcedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleRegenerate() {
    if (!jobDescription || !draft.referenceResumeId) {
      setError("Job description or base resume is missing for this draft.");
      return;
    }

    if (!feasibility.ok) {
      setError(feasibility.errors.join(" "));
      setWarnings(feasibility.warnings);
      return;
    }

    setIsRegenerating(true);
    setError(null);
    setWarnings(feasibility.warnings);

    try {
      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls,
      });

      const response = await requestResumeDraftGeneration({
        ...generationInput,
        inputSnapshot,
      });

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: response.content,
        rationale: response.rationale,
        inputSnapshot: response.inputSnapshot,
        status: response.draftStatus ?? "generated",
      });

      onDraftUpdated(updated);
      setExcludedGeneratedKeys(new Set());
    } catch (regenerationError) {
      setError(
        regenerationError instanceof Error
          ? regenerationError.message
          : "Resume regeneration failed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <SetupCard
      title="Edit resume content"
      description="Inspect evidence, exclude or force inventory bullets, and regenerate the resume. Does not change source inventory."
    >
      <p className="mt-3 text-sm text-slate-600">
        Active inventory bullets available: {activeCollated.experiences.reduce(
          (total, experience) => total + experience.bullets.length,
          0,
        )}
      </p>

      <div className="mt-4 space-y-4">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Generated work experience bullets</h3>
          <p className="mt-1 text-xs text-slate-500">
            Uncheck to exclude a source bullet from the next regeneration.
          </p>
          <ul className="mt-3 space-y-3">
            {draft.content.experience.flatMap((experience, experienceIndex) =>
              experience.bullets.map((bullet, bulletIndex) => {
                const sourceKeys = collectSourceKeysFromBullet(bullet.sourceRefs);
                const primaryKey = sourceKeys[0];

                return (
                  <li
                    key={`${experienceIndex}-${bulletIndex}-${bullet.text}`}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <label className="flex items-start gap-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!primaryKey || !excludedGeneratedKeys.has(primaryKey)}
                        disabled={!primaryKey}
                        onChange={() => {
                          if (primaryKey) {
                            toggleExcluded(primaryKey);
                          }
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-700">
                          {experience.company} · {experience.role}
                        </span>
                        <span className="mt-1 block">{bullet.text}</span>
                      </span>
                    </label>
                    {hasSourceRefs(bullet.sourceRefs) ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        {bullet.sourceRefs.map((ref) => (
                          <li key={`${ref.bulletKey}-${ref.collatedBulletId}`}>
                            Source: {formatSourceRefLabel(ref)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700">No source references recorded.</p>
                    )}
                  </li>
                );
              }),
            )}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Force inventory bullets</h3>
          <p className="mt-1 text-xs text-slate-500">
            Include bullets in the next regeneration even if ranking would omit them.
          </p>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {availableBullets.map((listing) => (
              <li
                key={listing.bulletKey}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <label className="flex items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={forcedKeys.has(listing.bulletKey)}
                    onChange={() => toggleForced(listing.bulletKey)}
                  />
                  <span>
                    <span className="font-medium text-slate-700">
                      {listing.experience.company} · {listing.experience.role}
                    </span>
                    <span className="mt-1 block">{listing.effectiveDescription}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={isRegenerating || !jobDescription || !draft.referenceResumeId}
          className={primaryButtonClassName}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate resume"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExcludedGeneratedKeys(new Set());
            setForcedKeys(new Set());
          }}
          disabled={isRegenerating}
          className={secondaryButtonClassName}
        >
          Reset controls
        </button>
      </div>

      {!jobDescription ? (
        <p className="mt-3 text-sm text-amber-800">
          Saved job description not found — regeneration requires the original JD.
        </p>
      ) : null}
    </SetupCard>
  );
}
