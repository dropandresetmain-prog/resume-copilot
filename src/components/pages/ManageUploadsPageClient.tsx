"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { AuthPanel } from "@/components/setup/AuthPanel";
import { CloudFileStoragePanel } from "@/components/setup/CloudFileStoragePanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SummaryCards } from "@/components/setup/SummaryCards";
import { UploadCard } from "@/components/setup/UploadCard";
import { WorkspaceBand } from "@/components/setup/ui";
import { pageMilestone } from "@/lib/app-version";

export function ManageUploadsPageClient() {
  const {
    user,
    inventory,
    totals,
    warnings,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    persistenceWarning,
    isProcessing,
    isCloudLoading,
    fileStorageRefreshToken,
    hasInventory,
    handleFilesSelected,
    handleClearResumeInventory,
    handleDeleteResume,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        eyebrow="Readiness"
        milestone={pageMilestone("Uploads")}
        title="Uploads"
        description="Start with a trusted resume inventory: sign in, upload DOCX resumes, and confirm the parser has enough evidence for generation."
      />

      {hasInventory && isSignedIn ? (
        <WorkspaceBand className="border-emerald-200 bg-emerald-50/80">
          <p className="text-sm text-emerald-950">
            Your inventory is ready. Continue to{" "}
            <Link href="/generate" className="font-medium underline underline-offset-4">
              Generate
            </Link>{" "}
            to create a tailored resume draft, or visit{" "}
            <Link href="/inventory" className="font-medium underline underline-offset-4">
              Inventory
            </Link>{" "}
            to enrich your experience.
          </p>
        </WorkspaceBand>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <UploadCard
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing || isCloudLoading}
          onClearAll={handleClearResumeInventory}
          canClear={inventory.resumes.length > 0}
          disabled={cloudEnabled && !isSignedIn}
          disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        />
        <div className="space-y-5">
          <AuthPanel user={user} />
          <SummaryCards totals={totals} />
        </div>
      </div>

      <CloudFileStoragePanel
        isSignedIn={isSignedIn}
        refreshToken={fileStorageRefreshToken}
        resumes={inventory.resumes}
        onDeleteResume={handleDeleteResume}
      />

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={inventory.failures}
        warnings={warnings}
      />
    </>
  );
}
