"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
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
        milestone="v0.5.4 · Records"
        title="Records"
        description="Review Saved Jobs and Generated Drafts. Paste new jobs on Generate."
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

      <DraftHistoryPanel isSignedIn={isSignedIn} jobDescriptions={jobDescriptions} />
    </>
  );
}
