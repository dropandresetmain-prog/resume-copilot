"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { ApplicationRecordsPanel } from "@/components/setup/ApplicationRecordsPanel";
import { DraftHistoryPanel } from "@/components/setup/DraftHistoryPanel";
import { JDInputPanel } from "@/components/setup/JDInputPanel";

export function RecordsPageClient() {
  const {
    jobDescriptions,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    handleSaveJobDescription,
    handleDeleteJobDescription,
    handleClearSavedJobDescriptions,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        milestone="v0.8.0 · Records"
        title="Records"
        description="Track applications by job, update status and notes, and review saved jobs and draft history."
      />

      <JDInputPanel
        jobDescriptions={jobDescriptions}
        onSave={handleSaveJobDescription}
        onDelete={handleDeleteJobDescription}
        onClearAll={handleClearSavedJobDescriptions}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        showIntakeForm={false}
      />

      <ApplicationRecordsPanel isSignedIn={isSignedIn} jobDescriptions={jobDescriptions} />

      <DraftHistoryPanel isSignedIn={isSignedIn} jobDescriptions={jobDescriptions} />
    </>
  );
}
