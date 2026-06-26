"use client";

import { useMemo } from "react";

import {
  primaryButtonClassName,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { buildCompanyContext } from "@/lib/company-context/build-company-context";
import {
  hasCoverLetterEvidenceControls,
  normalizeCoverLetterEvidenceControls,
} from "@/lib/cover-letter/evidence-controls";
import { buildCoverLetterProofEvidenceList } from "@/lib/cover-letter/proof-evidence-list";
import { buildEvidenceSpine } from "@/lib/evidence/spine";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import { buildAcceptedWordingByBulletKey } from "@/lib/resume-draft/enrichment-wording";
import { MAX_RESUME_DRAFT_BULLETS } from "@/lib/resume-draft/payload";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState } from "@/types/resume";
import type { CoverLetterEvidenceControls } from "@/types/cover-letter-draft";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type CoverLetterEvidenceRegenerationPanelProps = {
  inventory: InventoryState;
  jobDescription: StoredJobDescription | null;
  resumeDraft: GeneratedResumeDraftRecord | null;
  pendingControls: CoverLetterEvidenceControls;
  onPendingControlsChange: (controls: CoverLetterEvidenceControls) => void;
  disabled?: boolean;
};

function buildPendingSummary(controls: CoverLetterEvidenceControls): string[] {
  const lines: string[] = [];
  if (controls.forcedEvidenceIds.length > 0) {
    lines.push(
      `Use ${controls.forcedEvidenceIds.length} evidence item${controls.forcedEvidenceIds.length === 1 ? "" : "s"} in cover letter proof stories`,
    );
  }
  if (controls.excludedEvidenceIds.length > 0) {
    lines.push(
      `Avoid ${controls.excludedEvidenceIds.length} evidence item${controls.excludedEvidenceIds.length === 1 ? "" : "s"} in cover letter proof stories`,
    );
  }
  return lines;
}

export function CoverLetterEvidenceRegenerationPanel({
  inventory,
  jobDescription,
  resumeDraft,
  pendingControls,
  onPendingControlsChange,
  disabled = false,
}: CoverLetterEvidenceRegenerationPanelProps) {
  const evidenceRows = useMemo(() => {
    if (!jobDescription || !resumeDraft) {
      return [];
    }

    const collated = buildActiveCollatedInventory(inventory);
    const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(inventory.enrichment);
    const companyContext = buildCompanyContext({
      companyName: jobDescription.companyName ?? "Company",
      country: "Singapore",
      jobDescriptionText: jobDescription.rawText,
      roleTitle: jobDescription.roleTitle,
    });
    const spine = buildEvidenceSpine({
      collated,
      enrichment: inventory.enrichment,
      jdText: jobDescription.rawText,
      roleTitle: jobDescription.roleTitle ?? resumeDraft.content.targetRoleTitle,
      maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
      regenerationControls: resumeDraft.inputSnapshot?.regenerationControls,
      companyContext,
      acceptedWordingByBulletKey,
    });

    return buildCoverLetterProofEvidenceList(spine, pendingControls);
  }, [inventory, jobDescription, resumeDraft, pendingControls]);

  const summaryLines = buildPendingSummary(pendingControls);

  function toggleForce(evidenceId: string) {
    const normalized = normalizeCoverLetterEvidenceControls(pendingControls);
    const isForced = normalized.forcedEvidenceIds.includes(evidenceId);
    const nextForced = isForced
      ? normalized.forcedEvidenceIds.filter((id) => id !== evidenceId)
      : [...normalized.forcedEvidenceIds, evidenceId];
    const nextExcluded = normalized.excludedEvidenceIds.filter((id) => id !== evidenceId);
    onPendingControlsChange(
      normalizeCoverLetterEvidenceControls({
        forcedEvidenceIds: nextForced,
        excludedEvidenceIds: nextExcluded,
      }),
    );
  }

  function toggleExclude(evidenceId: string) {
    const normalized = normalizeCoverLetterEvidenceControls(pendingControls);
    const isExcluded = normalized.excludedEvidenceIds.includes(evidenceId);
    const nextExcluded = isExcluded
      ? normalized.excludedEvidenceIds.filter((id) => id !== evidenceId)
      : [...normalized.excludedEvidenceIds, evidenceId];
    const nextForced = normalized.forcedEvidenceIds.filter((id) => id !== evidenceId);
    onPendingControlsChange(
      normalizeCoverLetterEvidenceControls({
        forcedEvidenceIds: nextForced,
        excludedEvidenceIds: nextExcluded,
      }),
    );
  }

  if (!jobDescription || !resumeDraft) {
    return null;
  }

  return (
    <SetupCard
      title="Stage cover letter evidence"
      description="Choose inventory proof to use or avoid on the next regeneration only. Staging does not save and does not call AI."
      className="mt-4"
    >
      <p className="mt-3 text-sm text-slate-600">
        Work, Additional Experience, and Education only. Skills and keywords stay advisory for
        cover letters in this milestone.
      </p>

      <ul
        className="mt-4 max-h-64 space-y-2 overflow-y-auto"
        data-testid="cover-letter-proof-evidence-list"
      >
        {evidenceRows.length === 0 ? (
          <li className="text-sm text-slate-600">No ranked proof evidence available.</li>
        ) : (
          evidenceRows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              data-evidence-category={row.categoryLabel}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {row.categoryLabel}
                </span>
                <span className="text-sm font-medium text-slate-700">{row.displayLabel}</span>
              </div>
              <p className="mt-1 text-sm text-slate-800">{row.evidenceText}</p>
              <p className="mt-1 text-xs text-slate-500">{row.rationale}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  className={
                    row.stagedAs === "force" ? primaryButtonClassName : secondaryButtonClassName
                  }
                  onClick={() => toggleForce(row.id)}
                  data-action="stage-cover-letter-force-evidence"
                >
                  {row.stagedAs === "force" ? "Staged: use in cover letter" : "Use in cover letter"}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={
                    row.stagedAs === "exclude" ? primaryButtonClassName : secondaryButtonClassName
                  }
                  onClick={() => toggleExclude(row.id)}
                  data-action="stage-cover-letter-exclude-evidence"
                >
                  {row.stagedAs === "exclude"
                    ? "Staged: avoid in cover letter"
                    : "Avoid in cover letter"}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {hasCoverLetterEvidenceControls(pendingControls) ? (
        <div
          className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm text-cyan-950"
          data-testid="cover-letter-evidence-queue-summary"
        >
          <p className="font-semibold">Pending cover letter evidence</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-cyan-900">
            Applied on Regenerate cover letter only (1 AI step). Resume draft is unchanged.
          </p>
        </div>
      ) : null}
    </SetupCard>
  );
}
