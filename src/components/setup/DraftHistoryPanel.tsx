"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildDraftListDisplays } from "@/lib/resume-draft/draft-labels";
import { DownloadResumeDocxButton } from "@/components/resume-drafts/DownloadResumeDocxButton";
import { DownloadResumePdfButton } from "@/components/resume-drafts/DownloadResumePdfButton";
import {
  deleteGeneratedResumeDraftFromCloud,
  listGeneratedResumeDraftsFromCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

import {
  destructiveButtonClassName,
  EmptyState,
  secondaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";

type DraftHistoryPanelProps = {
  isSignedIn: boolean;
  jobDescriptions: StoredJobDescription[];
};

export function DraftHistoryPanel({
  isSignedIn,
  jobDescriptions,
}: DraftHistoryPanelProps) {
  const [drafts, setDrafts] = useState<GeneratedResumeDraftRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const rows = await listGeneratedResumeDraftsFromCloud();
        if (!cancelled) {
          setDrafts(rows);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load generated drafts.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const jobById = useMemo(
    () => new Map(jobDescriptions.map((jd) => [jd.id, jd])),
    [jobDescriptions],
  );
  const displays = useMemo(
    () => buildDraftListDisplays(drafts, jobById),
    [drafts, jobById],
  );
  const visibleDrafts = isSignedIn ? drafts : [];

  async function handleDeleteDraft(draft: GeneratedResumeDraftRecord) {
    const confirmed = window.confirm(
      `Delete this generated draft?\n\n${displays[drafts.indexOf(draft)]?.primaryLabel ?? "Draft"}\n\nThis cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(draft.id);
    setError(null);
    try {
      await deleteGeneratedResumeDraftFromCloud(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete generated draft.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SetupCard
      title="Generated Drafts"
      description="Saved resume drafts from Generate. Edit to review formatting, or delete drafts you no longer need."
    >
      {!isSignedIn ? (
        <p className="mt-3 text-sm text-slate-600">
          Sign in to see generated drafts from Supabase.
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : visibleDrafts.length === 0 ? (
        <EmptyState
          title="No generated drafts yet"
          description="Generate a resume on the Generate page to see drafts here."
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleDrafts.map((draft, index) => {
            const display = displays[index];
            return (
              <li
                key={draft.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-900">{display.primaryLabel}</p>
                  <p className="text-xs text-slate-500">{display.timestampLabel}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{display.secondaryLabel}</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Link
                    href={`/resume-preview/${draft.id}`}
                    className={`inline-flex ${secondaryButtonClassName}`}
                  >
                    Edit
                  </Link>
                  <DownloadResumeDocxButton
                    draftId={draft.id}
                    disabled={draft.status !== "approved"}
                    disabledReason={
                      draft.status === "approved"
                        ? undefined
                        : "Approve for Export before downloading."
                    }
                  />
                  <DownloadResumePdfButton
                    draftId={draft.id}
                    disabled={draft.status !== "approved"}
                    disabledReason={
                      draft.status === "approved"
                        ? undefined
                        : "Approve for Export before downloading."
                    }
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteDraft(draft)}
                    disabled={deletingId === draft.id}
                    className={destructiveButtonClassName}
                  >
                    {deletingId === draft.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SetupCard>
  );
}
