"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import {
  EMPTY_JOB_DESCRIPTION_FORM,
  JDInputPanel,
} from "@/components/setup/JDInputPanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import type { JobDescriptionInput } from "@/types/jd";
import { pageMilestone } from "@/lib/app-version";

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
    persistenceWarning,
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
        compact
        eyebrow="Composer"
        milestone={pageMilestone("Generate")}
        title="Generate"
        description="Paste the job description, choose a base resume, and generate your tailored application package."
      />

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={[]}
        warnings={[]}
        persistenceCollapsible
        compact
      />

      <JDInputPanel
        jobDescriptions={jobDescriptions}
        onSave={handleSaveJobDescription}
        onDelete={handleDeleteJobDescription}
        onClearAll={handleClearSavedJobDescriptions}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        title="Job description composer"
        description="Generation saves or reuses the job automatically. Research, model tiers, and saved-job management stay secondary."
        listTitle={`Secondary saved jobs (${jobDescriptions.length})`}
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
