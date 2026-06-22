"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import {
  EMPTY_JOB_DESCRIPTION_FORM,
  JDInputPanel,
} from "@/components/setup/JDInputPanel";
import type { JobDescriptionInput } from "@/types/jd";

type GeneratePageClientProps = {
  initialJobId?: string;
};

export function GeneratePageClient({ initialJobId }: GeneratePageClientProps = {}) {
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

  const prefilledJob = useMemo(
    () =>
      initialJobId ? jobDescriptions.find((item) => item.id === initialJobId) : undefined,
    [initialJobId, jobDescriptions],
  );

  const [jobForm, setJobForm] = useState<JobDescriptionInput>(() =>
    prefilledJob
      ? {
          rawText: prefilledJob.rawText,
          companyName: prefilledJob.companyName ?? "",
          roleTitle: prefilledJob.roleTitle ?? "",
          jobUrl: prefilledJob.jobUrl ?? "",
        }
      : EMPTY_JOB_DESCRIPTION_FORM,
  );
  const [editingJobId, setEditingJobId] = useState<string | null>(initialJobId ?? null);

  function handleGenerationFinished() {
    setJobForm(EMPTY_JOB_DESCRIPTION_FORM);
    setEditingJobId(null);
  }

  return (
    <>
      <PageHeader
        milestone="v0.9.3 · Company Context"
        title="Generate tailored resume"
        description="Paste a job description, optionally generate company context, then generate a tailored resume and cover letter."
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
          Everything you need is in one card below: paste the job, pick a base resume, and click
          Generate Tailored Resume.
        </p>
      )}

      <JDInputPanel
        jobDescriptions={jobDescriptions}
        onSave={handleSaveJobDescription}
        onDelete={handleDeleteJobDescription}
        onClearAll={handleClearSavedJobDescriptions}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        showSaveButton={false}
        form={jobForm}
        onFormChange={setJobForm}
        editingId={editingJobId}
        onEditingIdChange={setEditingJobId}
        generateFlow={{
          inventory,
          isSignedIn,
          onSaveJob: handleSaveJobDescription,
          onGenerationFinished: handleGenerationFinished,
        }}
      />
    </>
  );
}
