"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { pageMilestone } from "@/lib/app-version";
import { ResumeDraftReviewWorkspace } from "@/components/resume-drafts/ResumeDraftReviewWorkspace";
import { secondaryButtonClassName, SetupCard } from "@/components/setup/ui";
import { getGeneratedResumeDraftFromCloud } from "@/lib/supabase/generated-resume-drafts";
import type { GeneratedResumeDraftRecord } from "@/types/resume-draft";

type ResumeDraftEditPageClientProps = {
  draftId: string;
};

export function ResumeDraftEditPageClient({ draftId }: ResumeDraftEditPageClientProps) {
  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoading(true);
      setError(null);
      try {
        const record = await getGeneratedResumeDraftFromCloud(draftId);
        if (!cancelled) {
          if (!record) {
            setError("Resume draft not found.");
            setDraft(null);
          } else {
            setDraft(record);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load resume draft.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading resume editor…</p>;
  }

  if (error && !draft) {
    return (
      <SetupCard title="Resume editor unavailable">
        <p className="mt-3 text-sm text-red-700">{error}</p>
        <Link
          href={`/resume-preview/${draftId}`}
          className={`mt-4 inline-flex ${secondaryButtonClassName}`}
        >
          Back to application package
        </Link>
      </SetupCard>
    );
  }

  if (!draft) {
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Advanced editor"
        milestone={pageMilestone("Resume Editor")}
        title="Resume editor"
        description="Use the full draft editor for deeper content changes. The application package remains the main review and export path."
      />

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Link
          href={`/resume-preview/${draftId}`}
          className={`inline-flex ${secondaryButtonClassName}`}
        >
          Back to application package
        </Link>
        <Link href="/generate" className={`inline-flex ${secondaryButtonClassName}`}>
          Back to Generate
        </Link>
      </div>

      <ResumeDraftReviewWorkspace
        key={`${draft.id}:${draft.updatedAt}`}
        draft={draft}
        onDraftUpdated={setDraft}
      />
    </>
  );
}
