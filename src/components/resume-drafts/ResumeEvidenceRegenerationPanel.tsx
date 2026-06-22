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
import {
  auditForcedBullets,
  buildRegenerationOutcomeSummary,
  collectPayloadBulletKeys,
  explainUnavailableForcedKeys,
  findForcedKeysAlreadyInPayload,
  type RegenerationOutcomeSummary,
} from "@/lib/resume-draft/forced-bullets";
import { requestResumeDraftGeneration } from "@/lib/resume-draft/client";
import { buildResumeDraftPayloadFromInventory } from "@/lib/resume-draft/payload";
import { formatSourceRefLabel, hasSourceRefs } from "@/lib/resume-draft/preview-helpers";
import { requestResumeRoleRewrite } from "@/lib/resume-draft/role-rewrite-client";
import { assessRegenerationFeasibility } from "@/lib/resume-draft/regeneration";
import {
  applyTargetedRoleRewrites,
  buildTargetedRewriteOutcomeSummary,
  planTargetedForcedBulletRewrite,
  resolveDraftStatusAfterTargetedRewrite,
  TARGETED_REWRITE_BLOCKED_MESSAGE,
  type TargetedRewriteOutcomeSummary,
} from "@/lib/resume-draft/targeted-role-rewrite";
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
  const [outcomeSummary, setOutcomeSummary] = useState<
    RegenerationOutcomeSummary | TargetedRewriteOutcomeSummary | null
  >(null);

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

  const payloadPreview = useMemo(() => {
    if (!jobDescription || !draft.referenceResumeId) {
      return null;
    }

    try {
      const baseline = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls: {
          forcedBulletKeys: [],
          excludedBulletKeys: regenerationControls.excludedBulletKeys,
        },
      });
      const withControls = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls,
      });
      return { baseline, withControls };
    } catch {
      return null;
    }
  }, [inventory, jobDescription, draft.referenceResumeId, regenerationControls]);

  const unavailableForcedEntries = useMemo(() => {
    if (!payloadPreview || forcedKeys.size === 0) {
      return [];
    }

    return explainUnavailableForcedKeys({
      unavailableKeys:
        payloadPreview.withControls.generationInput.auditHints?.unavailableForcedBulletKeys ??
        [],
      excludedBulletKeys: regenerationControls.excludedBulletKeys,
      hiddenBulletKeys: inventory.edits?.hiddenBulletKeys,
    });
  }, [payloadPreview, forcedKeys.size, regenerationControls.excludedBulletKeys, inventory.edits]);

  const alreadyInPayloadKeys = useMemo(() => {
    if (!payloadPreview || forcedKeys.size === 0) {
      return [];
    }

    return findForcedKeysAlreadyInPayload({
      forcedKeys: regenerationControls.forcedBulletKeys,
      baselinePayloadKeys: collectPayloadBulletKeys(payloadPreview.baseline.generationInput),
    });
  }, [payloadPreview, forcedKeys.size, regenerationControls.forcedBulletKeys]);

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

  const targetedPlan = useMemo(
    () =>
      planTargetedForcedBulletRewrite({
        content: draft.content,
        forcedBulletKeys: regenerationControls.forcedBulletKeys,
        inventoryListings: availableBullets,
      }),
    [draft.content, regenerationControls.forcedBulletKeys, availableBullets],
  );

  const canRunTargetedUpdate =
    forcedKeys.size > 0 && targetedPlan.mode === "targeted" && feasibility.ok;

  async function handleTargetedUpdate() {
    if (!jobDescription || !draft.referenceResumeId || !canRunTargetedUpdate) {
      return;
    }
    if (targetedPlan.mode !== "targeted") {
      return;
    }

    setIsRegenerating(true);
    setError(null);
    setOutcomeSummary(null);
    setWarnings(feasibility.warnings);

    const priorContent = draft.content;

    try {
      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls,
      });

      const response = await requestResumeRoleRewrite({
        jobDescription: generationInput.jobDescription,
        referenceResume: {
          bulletStyle: generationInput.referenceResume.bulletStyle,
        },
        roles: targetedPlan.roles.map((role) => ({
          roleIndex: role.roleIndex,
          currentRole: role.currentRole,
          forcedBulletKeys: role.forcedBulletKeys,
          allowedSourceBulletKeys: role.allowedSourceBulletKeys,
          inventoryBullets: role.inventoryBullets,
        })),
      });

      const mergedContent = applyTargetedRoleRewrites(priorContent, response.roles);
      const nextStatus = resolveDraftStatusAfterTargetedRewrite(draft.status);

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: mergedContent,
        rationale: draft.rationale
          ? {
              ...draft.rationale,
              overall: `${draft.rationale.overall}\n\nTargeted forced-bullet role rewrite applied.`,
            }
          : undefined,
        inputSnapshot: {
          ...inputSnapshot,
          regenerationControls,
        },
        status: nextStatus,
      });

      setOutcomeSummary(
        buildTargetedRewriteOutcomeSummary({
          priorContent,
          newContent: updated.content,
          plan: targetedPlan,
        }),
      );

      onDraftUpdated(updated);
      setExcludedGeneratedKeys(new Set());
    } catch (targetedError) {
      const message =
        targetedError instanceof Error
          ? targetedError.message
          : "Targeted forced-bullet update failed.";
      setError(
        message.includes("validation")
          ? `${message} Try full regeneration if you need to restructure roles.`
          : message,
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleFullRegenerate() {
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
    setOutcomeSummary(null);
    setWarnings(feasibility.warnings);

    const priorContent = draft.content;

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

      const audit = auditForcedBullets({
        forcedKeys: regenerationControls.forcedBulletKeys,
        unavailableKeys: generationInput.auditHints?.unavailableForcedBulletKeys,
        excludedBulletKeys: regenerationControls.excludedBulletKeys,
        hiddenBulletKeys: inventory.edits?.hiddenBulletKeys,
        alreadyInPayloadKeys,
        contentBeforeRepair: priorContent,
        contentAfterRepair: updated.content,
        removedDuringRepair: response.rationale?.forcedBulletAudit?.removedDuringRepair,
        unableToPreserveDuringRepair:
          response.rationale?.forcedBulletAudit?.unableToPreserveDuringRepair,
      });

      setOutcomeSummary(
        buildRegenerationOutcomeSummary({
          priorContent,
          newContent: updated.content,
          audit,
        }),
      );

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
        Active inventory bullets available: {buildActiveCollatedInventory(inventory).experiences.reduce(
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
            Include bullets in the next regeneration even if ranking would omit them. Forced bullets
            must appear in the regenerated resume when available.
          </p>

          {alreadyInPayloadKeys.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {alreadyInPayloadKeys.map((key) => (
                <li key={key}>
                  Already in generation payload — forcing may not change bullet selection.
                </li>
              ))}
            </ul>
          ) : null}

          {targetedPlan.mode === "blocked" && forcedKeys.size > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {TARGETED_REWRITE_BLOCKED_MESSAGE}
            </p>
          ) : null}

          {unavailableForcedEntries.length > 0 ? (
            <ul className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {unavailableForcedEntries.map((entry) => (
                <li key={entry.key}>
                  <span className="font-medium">Unavailable forced bullet:</span> {entry.message}
                </li>
              ))}
            </ul>
          ) : null}

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

      {outcomeSummary ? (
        <ul
          className="mt-4 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          data-testid="regeneration-outcome-summary"
        >
          {outcomeSummary.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {canRunTargetedUpdate ? (
          <button
            type="button"
            onClick={() => void handleTargetedUpdate()}
            disabled={isRegenerating || !jobDescription || !draft.referenceResumeId}
            className={primaryButtonClassName}
            data-action="apply-forced-bullet-update"
          >
            {isRegenerating ? "Updating…" : "Apply forced bullet update"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleFullRegenerate()}
          disabled={isRegenerating || !jobDescription || !draft.referenceResumeId}
          className={canRunTargetedUpdate ? secondaryButtonClassName : primaryButtonClassName}
          data-action="regenerate-full-resume"
        >
          {isRegenerating ? "Regenerating…" : "Regenerate full resume"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExcludedGeneratedKeys(new Set());
            setForcedKeys(new Set());
            setOutcomeSummary(null);
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
