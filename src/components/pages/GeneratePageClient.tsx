"use client";

import { useState } from "react";

import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { JDInputPanel } from "@/components/setup/JDInputPanel";
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
    handleSaveJobDescription,
    handleDeleteJobDescription,
    handleClearSavedJobDescriptions,
  } = useWorkspace();

  const [preferredJobId, setPreferredJobId] = useState("");

  const selectedJobId =
    preferredJobId && jobDescriptions.some((job) => job.id === preferredJobId)
      ? preferredJobId
      : jobDescriptions[0]?.id ?? "";

  return (
    <>
      <PageHeader
        milestone="v0.4.5 · Generate"
        title="Generate tailored resume"
        description="Paste a job description, save it, then tailor a resume from your career inventory and approved keywords."
      />

      {!isSignedIn || !hasInventory ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {hasInventory ? (
            "Sign in to save jobs and generated resumes to Supabase."
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
          Paste a job below, save it, then tailor your resume from the saved job list.
        </p>
      )}

      <JDInputPanel
        jobDescriptions={jobDescriptions}
        onSave={handleSaveJobDescription}
        onDelete={handleDeleteJobDescription}
        onClearAll={handleClearSavedJobDescriptions}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        onJobSaved={(job) => setPreferredJobId(job.id)}
      />

      <ResumeDraftPanel
        inventory={inventory}
        jobDescriptions={jobDescriptions}
        isSignedIn={isSignedIn}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        selectedJobDescriptionId={selectedJobId}
        onJobDescriptionChange={setPreferredJobId}
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
