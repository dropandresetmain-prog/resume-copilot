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
        milestone="v0.4.4 · Records"
        title="Records"
        description="Manage saved jobs and view generated resume draft history."
      />

      <JDInputPanel
        jobDescriptions={jobDescriptions}
        onSave={handleSaveJobDescription}
        onDelete={handleDeleteJobDescription}
        onClearAll={handleClearSavedJobDescriptions}
        disabled={cloudEnabled && !isSignedIn}
        disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
      />

      <DraftHistoryPanel isSignedIn={isSignedIn} jobDescriptions={jobDescriptions} />
    </>
  );
}
