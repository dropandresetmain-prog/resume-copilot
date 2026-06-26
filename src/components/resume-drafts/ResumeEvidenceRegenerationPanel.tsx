"use client";

import { useMemo, useState } from "react";

import { ModelSelectionDebug } from "@/components/ai/ModelSelectionDebug";
import { ModelTierSelect } from "@/components/ai/ModelTierSelect";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import type { ModelTier } from "@/lib/ai/model-tiers";
import {
  resolveResumeModelTierForDraft,
  writeStoredResumeModelTier,
} from "@/lib/ai/model-tier-storage";
import { buildEvidenceSpine } from "@/lib/evidence/spine";
import { listCollatedBulletsWithEditState } from "@/lib/inventory/edits";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import {
  actionStateHint,
  buildAddEvidenceList,
} from "@/lib/resume-draft/add-evidence-list";
import {
  removeBulletsFromDraftBySourceKeys,
  resolveDraftStatusAfterContentEdit,
} from "@/lib/resume-draft/apply-evidence-changes";
import {
  auditForcedBullets,
  buildRegenerationOutcomeSummary,
  collectPayloadBulletKeys,
  findForcedKeysAlreadyInPayload,
  type RegenerationOutcomeSummary,
} from "@/lib/resume-draft/forced-bullets";
import { requestResumeDraftGeneration } from "@/lib/resume-draft/client";
import {
  buildResumeDraftPayloadFromInventory,
  MAX_RESUME_DRAFT_BULLETS,
} from "@/lib/resume-draft/payload";
import { requestResumeRoleRewrite } from "@/lib/resume-draft/role-rewrite-client";
import { assessRegenerationFeasibility } from "@/lib/resume-draft/regeneration";
import {
  applyTargetedRoleRewrites,
  buildTargetedRewriteOutcomeSummary,
  planTargetedForcedBulletRewrite,
  TARGETED_REWRITE_BLOCKED_MESSAGE,
  type TargetedRewriteOutcomeSummary,
} from "@/lib/resume-draft/targeted-role-rewrite";
import {
  buildEvidenceQueueSummary,
  collectGeneratedBulletsWithKeys,
  type EvidencePendingAction,
} from "@/lib/resume-draft/evidence-pending-queue";
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

function actionId(type: EvidencePendingAction["type"], bulletKey: string): string {
  return `${type}:${bulletKey}`;
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
  const activeCollated = useMemo(
    () => buildActiveCollatedInventory(inventory),
    [inventory],
  );

  const [pendingActions, setPendingActions] = useState<EvidencePendingAction[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [outcomeSummary, setOutcomeSummary] = useState<
    RegenerationOutcomeSummary | TargetedRewriteOutcomeSummary | null
  >(null);
  const [resumeModelTier, setResumeModelTier] = useState<ModelTier>(() =>
    resolveResumeModelTierForDraft({
      draftTier: draft.inputSnapshot?.resumeModelTier,
    }),
  );
  const [lastModelName, setLastModelName] = useState<string | null>(draft.modelName ?? null);
  const [lastFallbackApplied, setLastFallbackApplied] = useState(
    draft.inputSnapshot?.modelFallbackApplied ?? false,
  );

  const savedControls = draft.inputSnapshot?.regenerationControls;
  const pendingRemoveKeys = pendingActions
    .filter((action) => action.type === "remove_from_draft")
    .map((action) => action.bulletKey);
  const pendingAddKeys = pendingActions
    .filter((action) => action.type === "add_to_draft")
    .map((action) => action.bulletKey);
  const pendingExcludeKeys = pendingActions
    .filter((action) => action.type === "exclude_from_generation")
    .map((action) => action.bulletKey);

  const mergedControls: ResumeDraftRegenerationControls = useMemo(
    () => ({
      forcedBulletKeys: [
        ...new Set([
          ...(savedControls?.forcedBulletKeys ?? []),
          ...pendingAddKeys,
        ]),
      ],
      excludedBulletKeys: [
        ...new Set([
          ...(savedControls?.excludedBulletKeys ?? []),
          ...pendingExcludeKeys,
        ]),
      ],
    }),
    [savedControls, pendingAddKeys, pendingExcludeKeys],
  );

  const evidenceSpine = useMemo(() => {
    if (!jobDescription) {
      return null;
    }
    return buildEvidenceSpine({
      collated: activeCollated,
      enrichment: inventory.enrichment,
      jdText: jobDescription.rawText,
      roleTitle: jobDescription.roleTitle,
      maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
      regenerationControls: mergedControls,
    });
  }, [activeCollated, inventory.enrichment, jobDescription, mergedControls]);

  const addEvidenceRows = useMemo(() => {
    if (!evidenceSpine) {
      return [];
    }
    return buildAddEvidenceList(evidenceSpine, draft.content, mergedControls, {
      hiddenBulletKeys: inventory.edits?.hiddenBulletKeys,
    });
  }, [evidenceSpine, draft.content, mergedControls, inventory.edits?.hiddenBulletKeys]);

  const feasibility = useMemo(
    () => assessRegenerationFeasibility({ regenerationControls: mergedControls }),
    [mergedControls],
  );

  const targetedPlan = useMemo(() => {
    const contentAfterRemovals =
      pendingRemoveKeys.length > 0
        ? removeBulletsFromDraftBySourceKeys(draft.content, pendingRemoveKeys)
        : draft.content;

    return planTargetedForcedBulletRewrite({
      content: contentAfterRemovals,
      forcedBulletKeys: mergedControls.forcedBulletKeys,
      inventoryListings: availableBullets,
    });
  }, [
    draft.content,
    pendingRemoveKeys,
    mergedControls.forcedBulletKeys,
    availableBullets,
  ]);

  const affectedRoleCount =
    targetedPlan.mode === "targeted" && pendingAddKeys.length > 0
      ? targetedPlan.roles.length
      : 0;

  const queueSummary = buildEvidenceQueueSummary(pendingActions, affectedRoleCount);

  function hasPendingAction(type: EvidencePendingAction["type"], bulletKey: string): boolean {
    return pendingActions.some(
      (action) => action.type === type && action.bulletKey === bulletKey,
    );
  }

  function togglePendingAction(action: EvidencePendingAction) {
    setPendingActions((current) => {
      const id = actionId(action.type, action.bulletKey);
      const exists = current.some((item) => actionId(item.type, item.bulletKey) === id);
      if (exists) {
        return current.filter((item) => actionId(item.type, item.bulletKey) !== id);
      }
      const withoutConflicts = current.filter((item) => item.bulletKey !== action.bulletKey);
      return [...withoutConflicts, action];
    });
    setOutcomeSummary(null);
    setError(null);
  }

  function clearPendingQueue() {
    setPendingActions([]);
    setOutcomeSummary(null);
    setError(null);
  }

  async function handleApplyEvidenceChanges() {
    if (pendingActions.length === 0 || isApplying) {
      return;
    }

    if (!jobDescription || !draft.referenceResumeId) {
      setError("Job description or base resume is missing for this draft.");
      return;
    }

    setIsApplying(true);
    setError(null);
    setOutcomeSummary(null);
    setWarnings(feasibility.warnings);

    const priorContent = draft.content;
    let workingContent = priorContent;

    try {
      if (pendingRemoveKeys.length > 0) {
        workingContent = removeBulletsFromDraftBySourceKeys(workingContent, pendingRemoveKeys);
      }

      let nextStatus = resolveDraftStatusAfterContentEdit(draft.status);
      let nextContent = workingContent;
      const nextRationale = draft.rationale;
      let nextInputSnapshot = draft.inputSnapshot;
      let nextModelName = draft.modelName;

      if (pendingAddKeys.length > 0) {
        if (!feasibility.ok) {
          setError(feasibility.errors.join(" "));
          return;
        }
        if (targetedPlan.mode !== "targeted") {
          setError(TARGETED_REWRITE_BLOCKED_MESSAGE);
          return;
        }

        const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
          inventory,
          jobDescription,
          referenceResumeId: draft.referenceResumeId,
          regenerationControls: mergedControls,
        });

        const response = await requestResumeRoleRewrite({
          jobDescription: generationInput.jobDescription,
          referenceResume: {
            bulletStyle: generationInput.referenceResume.bulletStyle,
          },
          resumeModelTier,
          roles: targetedPlan.roles.map((role) => ({
            roleIndex: role.roleIndex,
            currentRole: role.currentRole,
            forcedBulletKeys: role.forcedBulletKeys,
            allowedSourceBulletKeys: role.allowedSourceBulletKeys,
            inventoryBullets: role.inventoryBullets,
          })),
        });

        nextContent = applyTargetedRoleRewrites(workingContent, response.roles);
        nextStatus = resolveDraftStatusAfterContentEdit(draft.status);
        nextInputSnapshot = {
          ...inputSnapshot,
          regenerationControls: mergedControls,
          resumeModelTier,
          modelFallbackApplied: response.modelFallbackApplied,
        };
        nextModelName = response.modelName ?? draft.modelName;
        if (response.modelName) {
          setLastModelName(response.modelName);
        }
        setLastFallbackApplied(response.modelFallbackApplied ?? false);

        setOutcomeSummary(
          buildTargetedRewriteOutcomeSummary({
            priorContent: workingContent,
            newContent: nextContent,
            plan: targetedPlan,
          }),
        );
      } else if (pendingExcludeKeys.length > 0 || pendingRemoveKeys.length > 0) {
        const { inputSnapshot } = buildResumeDraftPayloadFromInventory({
          inventory,
          jobDescription,
          referenceResumeId: draft.referenceResumeId,
          regenerationControls: mergedControls,
        });
        nextInputSnapshot = {
          ...inputSnapshot,
          regenerationControls: mergedControls,
          resumeModelTier,
        };
        if (pendingRemoveKeys.length > 0) {
          setOutcomeSummary({
            lines: [
              `Removed ${pendingRemoveKeys.length} bullet(s) from draft without AI rewrite.`,
              pendingExcludeKeys.length > 0
                ? `Excluded ${pendingExcludeKeys.length} item(s) from future generation.`
                : "No generation exclusions staged.",
            ],
            affectedRoleLabels: [],
            forcedIncludedCount: 0,
            unchangedRoleCount: nextContent.experience.length,
          });
        }
      }

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: {
          ...nextContent,
          serverPdfValidation: undefined,
        },
        rationale: nextRationale
          ? {
              ...nextRationale,
              overall:
                pendingAddKeys.length > 0
                  ? `${nextRationale.overall}\n\nEvidence queue: targeted role rewrite applied.`
                  : nextRationale.overall,
            }
          : undefined,
        inputSnapshot: nextInputSnapshot,
        status: nextStatus,
        modelName: nextModelName,
      });

      onDraftUpdated(updated);
      setPendingActions([]);
    } catch (applyError) {
      const message =
        applyError instanceof Error ? applyError.message : "Failed to apply evidence changes.";
      setError(message);
    } finally {
      setIsApplying(false);
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

    setIsApplying(true);
    setError(null);
    setOutcomeSummary(null);
    setWarnings(feasibility.warnings);

    const priorContent = draft.content;

    try {
      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls: mergedControls,
      });

      const response = await requestResumeDraftGeneration({
        ...generationInput,
        inputSnapshot,
        resumeModelTier,
      });

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: response.content,
        rationale: response.rationale,
        inputSnapshot: response.inputSnapshot,
        status: response.draftStatus ?? "generated",
        modelName: response.modelName,
      });

      if (response.modelName) {
        setLastModelName(response.modelName);
      }
      setLastFallbackApplied(response.inputSnapshot?.modelFallbackApplied ?? false);

      const alreadyInPayloadKeys = findForcedKeysAlreadyInPayload({
        forcedKeys: mergedControls.forcedBulletKeys,
        baselinePayloadKeys: collectPayloadBulletKeys(
          buildResumeDraftPayloadFromInventory({
            inventory,
            jobDescription,
            referenceResumeId: draft.referenceResumeId,
            regenerationControls: {
              forcedBulletKeys: [],
              excludedBulletKeys: mergedControls.excludedBulletKeys,
            },
          }).generationInput,
        ),
      });

      const audit = auditForcedBullets({
        forcedKeys: mergedControls.forcedBulletKeys,
        unavailableKeys: generationInput.auditHints?.unavailableForcedBulletKeys,
        excludedBulletKeys: mergedControls.excludedBulletKeys,
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
      setPendingActions([]);
      if (response.inputSnapshot?.resumeModelTier) {
        setResumeModelTier(response.inputSnapshot.resumeModelTier);
      }
    } catch (regenerationError) {
      setError(
        regenerationError instanceof Error
          ? regenerationError.message
          : "Resume regeneration failed.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  const generatedBullets = collectGeneratedBulletsWithKeys(draft.content);

  return (
    <SetupCard
      title="Fix resume evidence"
      description="Stage evidence changes, review the summary, then apply once. Checkbox clicks do not call AI."
    >
      <p className="mt-3 text-sm text-slate-600">
        Prefer targeted apply when adding evidence. Full regenerate is a last resort. Active
        inventory bullets:{" "}
        {buildActiveCollatedInventory(inventory).experiences.reduce(
          (total, experience) => total + experience.bullets.length,
          0,
        )}
      </p>

      <div className="mt-4 space-y-4">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">In draft — stage changes</h3>
          <p className="mt-1 text-xs text-slate-500">
            Remove bullets locally without AI, or exclude source evidence from future regeneration.
          </p>
          <ul className="mt-3 space-y-3">
            {generatedBullets.map((item) => {
              const primaryKey = item.sourceKeys[0];
              if (!primaryKey) {
                return null;
              }

              return (
                <li
                  key={`${item.experienceIndex}-${item.bulletIndex}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {item.company} · {item.role}
                  </span>
                  <p className="mt-1 text-sm text-slate-800">{item.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={
                        hasPendingAction("remove_from_draft", primaryKey)
                          ? primaryButtonClassName
                          : secondaryButtonClassName
                      }
                      onClick={() =>
                        togglePendingAction({
                          id: actionId("remove_from_draft", primaryKey),
                          type: "remove_from_draft",
                          bulletKey: primaryKey,
                          label: item.text,
                        })
                      }
                      data-action="stage-remove-from-draft"
                    >
                      {hasPendingAction("remove_from_draft", primaryKey)
                        ? "Staged: remove from draft"
                        : "Remove from draft"}
                    </button>
                    <button
                      type="button"
                      className={
                        hasPendingAction("exclude_from_generation", primaryKey)
                          ? primaryButtonClassName
                          : secondaryButtonClassName
                      }
                      onClick={() =>
                        togglePendingAction({
                          id: actionId("exclude_from_generation", primaryKey),
                          type: "exclude_from_generation",
                          bulletKey: primaryKey,
                          label: item.text,
                        })
                      }
                      data-action="stage-exclude-from-generation"
                    >
                      {hasPendingAction("exclude_from_generation", primaryKey)
                        ? "Staged: exclude from generation"
                        : "Exclude from future generation"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Add inventory evidence</h3>
          <p className="mt-1 text-xs text-slate-500">
            Ranked by job relevance across work, additional experience, education, skills, and
            evidence-tied keywords. Stage work bullets to add; other categories are advisory or
            full-regenerate only.
          </p>

          {targetedPlan.mode === "blocked" && pendingAddKeys.length > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {TARGETED_REWRITE_BLOCKED_MESSAGE}
            </p>
          ) : null}

          <ul
            className="mt-3 max-h-64 space-y-2 overflow-y-auto"
            data-testid="add-evidence-ranked-list"
          >
            {addEvidenceRows.map((row) => {
              const hint = actionStateHint(row.actionState);
              const canStageAdd =
                row.actionState === "addable" && row.bulletKey !== undefined;

              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  data-evidence-category={row.categoryLabel}
                  data-evidence-action-state={row.actionState}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {row.categoryLabel}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{row.displayLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{row.evidenceText}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.rationale}</p>
                  {row.acceptedWording ? (
                    <p className="mt-1 text-xs text-cyan-800">
                      Preferred wording: {row.acceptedWording}
                    </p>
                  ) : null}
                  {canStageAdd ? (
                    <button
                      type="button"
                      className={`mt-3 ${hasPendingAction("add_to_draft", row.bulletKey!) ? primaryButtonClassName : secondaryButtonClassName}`}
                      onClick={() =>
                        togglePendingAction({
                          id: actionId("add_to_draft", row.bulletKey!),
                          type: "add_to_draft",
                          bulletKey: row.bulletKey!,
                          label: row.evidenceText,
                        })
                      }
                      data-action="stage-add-to-draft"
                    >
                      {hasPendingAction("add_to_draft", row.bulletKey!)
                        ? "Staged: add to draft"
                        : "Add to draft"}
                    </button>
                  ) : hint ? (
                    <p className="mt-2 text-xs text-slate-600">{hint}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {pendingActions.length > 0 ? (
        <div
          className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm text-cyan-950"
          data-testid="evidence-queue-summary"
        >
          <p className="font-semibold">Pending evidence changes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {queueSummary.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

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

      <div className="mt-4 max-w-md">
        <ModelTierSelect
          id="regeneration-resume-model-tier"
          label="Resume model"
          value={resumeModelTier}
          disabled={isApplying}
          onChange={(tier) => {
            setResumeModelTier(tier);
            writeStoredResumeModelTier(tier);
          }}
        />
        <ModelSelectionDebug
          requestedTier={resumeModelTier}
          actualModel={lastModelName ?? draft.modelName}
          fallbackApplied={lastFallbackApplied}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3" data-testid="regeneration-action-buttons">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => void handleApplyEvidenceChanges()}
            disabled={isApplying || pendingActions.length === 0}
            className={primaryButtonClassName}
            data-action="apply-evidence-changes"
            aria-busy={isApplying}
          >
            {isApplying ? "Applying…" : "Apply evidence changes"}
          </button>
          <p className="text-xs text-slate-500">
            Applies staged removes locally; adds run one targeted rewrite when needed.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => void handleFullRegenerate()}
            disabled={isApplying || !jobDescription || !draft.referenceResumeId}
            className={secondaryButtonClassName}
            data-action="regenerate-full-resume"
            aria-busy={isApplying}
          >
            {isApplying ? "Regenerating…" : "Regenerate full resume (last resort)"}
          </button>
        </div>
        <button
          type="button"
          onClick={clearPendingQueue}
          disabled={isApplying || pendingActions.length === 0}
          className={secondaryButtonClassName}
        >
          Clear staged changes
        </button>
      </div>

      {!jobDescription ? (
        <p className="mt-3 text-sm text-amber-800">
          Saved job description not found — evidence apply requires the original JD.
        </p>
      ) : null}
    </SetupCard>
  );
}
