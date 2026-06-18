"use client";

import { useEffect, useState } from "react";

import { formatSavedJobLabel } from "@/lib/jd/labels";
import { listGeneratedResumeDraftsFromCloud } from "@/lib/supabase/generated-resume-drafts";
import type { StoredJobDescription } from "@/types/jd";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

import { EmptyState, SetupCard } from "@/components/setup/ui";

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
              : "Failed to load draft history.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const jobById = new Map(jobDescriptions.map((jd) => [jd.id, jd]));
  const visibleDrafts = isSignedIn ? drafts : [];

  return (
    <SetupCard
      title="Generated draft history"
      description="Recently saved resume drafts from Generate. Full draft review UI is planned for a later milestone."
    >
      {!isSignedIn ? (
        <p className="mt-3 text-sm text-slate-600">
          Sign in to see saved draft history from Supabase.
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : visibleDrafts.length === 0 ? (
        <EmptyState
          title="No saved drafts yet"
          description="Generate a resume draft on the Generate page to see history here."
        />
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {visibleDrafts.map((draft) => {
            const job = draft.jobDescriptionId
              ? jobById.get(draft.jobDescriptionId)
              : undefined;
            const jobLabel = job
              ? formatSavedJobLabel(job)
              : draft.jobDescriptionId ?? "Unknown job";
            const summary = draft.content.professionalSummary?.text?.slice(0, 120);

            return (
              <li key={draft.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-900">{jobLabel}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(draft.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {draft.status} · {draft.provider ?? "unknown provider"}
                  {draft.modelName ? ` · ${draft.modelName}` : ""}
                </p>
                {summary ? (
                  <p className="mt-2 text-slate-600">
                    {summary}
                    {(draft.content.professionalSummary?.text?.length ?? 0) > 120 ? "…" : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SetupCard>
  );
}
