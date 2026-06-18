"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { ResumeDraftPanel } from "@/components/setup/ResumeDraftPanel";
import { SetupCard } from "@/components/setup/ui";

export function GeneratePageClient() {
  const {
    inventory,
    jobDescriptions,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    hasInventory,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        milestone="v0.4.4 · Generate"
        title="Generate tailored resume"
        description="Select a saved job and reference resume to generate a structured draft. Approved keywords and your career inventory inform the output."
      />

      {!isSignedIn || !hasInventory ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {hasInventory ? (
            "Sign in to save generated drafts to Supabase."
          ) : (
            <>
              Upload your resumes first in{" "}
              <Link href="/setup" className="font-medium underline">
                Manage Uploads
              </Link>{" "}
              to build your career inventory before generating.
            </>
          )}
        </p>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your inventory is ready. Select a saved job and reference resume below.
        </p>
      )}

      <ResumeDraftPanel
        inventory={inventory}
        jobDescriptions={jobDescriptions}
        isSignedIn={isSignedIn}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
      />

      <SetupCard
        title="Coming later"
        description="These features are planned but not implemented yet."
      >
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Cover letter generation</li>
          <li>PDF / DOCX export</li>
        </ul>
      </SetupCard>
    </>
  );
}
