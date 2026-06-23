"use client";

import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { AuthPanel } from "@/components/setup/AuthPanel";
import { CloudFileStoragePanel } from "@/components/setup/CloudFileStoragePanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SummaryCards } from "@/components/setup/SummaryCards";
import { UploadCard } from "@/components/setup/UploadCard";
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
        milestone={pageMilestone("Uploads")}
        title="Uploads"
        description="Sign in, upload DOCX resumes, and review parsing results. This is the starting point for new users."
      />

      {hasInventory && isSignedIn ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Your inventory is ready. Continue to{" "}
          <Link href="/generate" className="font-medium underline">
            Generate
          </Link>{" "}
          to create a tailored resume draft, or visit{" "}
          <Link href="/inventory" className="font-medium underline">
            Inventory
          </Link>{" "}
          to enrich your experience.
        </p>
      ) : null}

      <AuthPanel user={user} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing || isCloudLoading}
          onClearAll={handleClearResumeInventory}
          canClear={inventory.resumes.length > 0}
          disabled={cloudEnabled && !isSignedIn}
          disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
        />
        <SummaryCards totals={totals} />
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
