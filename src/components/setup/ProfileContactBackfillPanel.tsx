"use client";

import { useState } from "react";

import {
  primaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import {
  backfillProfileContactForInventory,
  type ProfileContactBackfillSummary,
} from "@/lib/inventory/backfill-profile-contact";
import type { InventoryState } from "@/types/resume";

type ProfileContactBackfillPanelProps = {
  inventory: InventoryState;
  isSignedIn: boolean;
  disabled?: boolean;
  onApply: (inventory: InventoryState) => Promise<void>;
};

export function ProfileContactBackfillPanel({
  inventory,
  isSignedIn,
  disabled = false,
  onApply,
}: ProfileContactBackfillPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileContactBackfillSummary | null>(null);

  async function handleBackfill() {
    setError(null);
    setSummary(null);
    setIsRunning(true);

    try {
      const result = backfillProfileContactForInventory(inventory);
      setSummary(result.summary);

      if (!result.changed) {
        return;
      }

      await onApply(result.inventory);
    } catch (backfillError) {
      setError(
        backfillError instanceof Error
          ? backfillError.message
          : "Profile/contact backfill failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  const hasResumes = inventory.resumes.length > 0;
  const missingProfileCount = inventory.resumes.filter(
    (resume) => !resume.profile?.fullName?.trim(),
  ).length;

  return (
    <SetupCard
      title="Profile / contact backfill"
      description="One-time helper for inventories parsed before v0.4.2 profile support."
    >
      <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        This only adds missing profile/contact data from preserved resume header text.
        It does not re-parse or overwrite cleaned experience inventory.
      </p>

      <p className="mt-3 text-sm text-slate-600">
        Resumes missing profile: {missingProfileCount} of {inventory.resumes.length}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleBackfill}
          disabled={disabled || !hasResumes || isRunning}
          className={primaryButtonClassName}
        >
          {isRunning ? "Backfilling…" : "Backfill profile/contact from existing resumes"}
        </button>
      </div>

      {!isSignedIn ? (
        <p className="mt-3 text-sm text-amber-800">
          Sign in to save backfilled profile data to Supabase.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Backfill summary</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Resumes checked: {summary.resumesChecked}</li>
            <li>Profiles added: {summary.profilesAdded}</li>
            <li>Skipped (already had profile): {summary.skippedAlreadyHadProfile}</li>
            <li>Skipped (no reliable source text): {summary.skippedNoSourceText}</li>
            <li>Warnings/sections removed: {summary.warningsRemoved}</li>
          </ul>
          {summary.filenamesUpdated.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Updated: {summary.filenamesUpdated.join(", ")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No inventory changes were needed.</p>
          )}
        </div>
      ) : null}
    </SetupCard>
  );
}
