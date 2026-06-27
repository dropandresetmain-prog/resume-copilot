"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { ApplicationRecordsPanel } from "@/components/setup/ApplicationRecordsPanel";
import { DraftHistoryPanel } from "@/components/setup/DraftHistoryPanel";
import { JDInputPanel } from "@/components/setup/JDInputPanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { pageMilestone } from "@/lib/app-version";

export function RecordsPageClient() {
  const {
    user,
    jobDescriptions,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    persistenceWarning,
    handleSaveJobDescription,
    handleDeleteJobDescription,
    handleClearSavedJobDescriptions,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        compact
        eyebrow="Workspace"
        milestone={pageMilestone("Applications")}
        title="Applications"
        description="Track each application package by job, status, notes, and latest artifacts."
      />

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={[]}
        warnings={[]}
        persistenceCollapsible
        compact
      />

      <ApplicationRecordsPanel
        // Application rows and linked artifacts are user-scoped; remount on identity changes.
        key={user?.id ?? "signed-out"}
        isSignedIn={isSignedIn}
        jobDescriptions={jobDescriptions}
      />

      <details className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Saved jobs and legacy draft history
        </summary>
        <div className="mt-4 space-y-5">
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
        </div>
      </details>
    </>
  );
}
