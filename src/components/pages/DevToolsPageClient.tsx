"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { ProfileContactBackfillPanel } from "@/components/setup/ProfileContactBackfillPanel";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";

export function DevToolsPageClient() {
  const {
    inventory,
    collated,
    providerStatus,
    isEnriching,
    enrichError,
    enrichDebugRaw,
    isSignedIn,
    cloudEnabled,
    handleProfileContactBackfill,
    handleTestBatchEnrich,
    handleMergeTestBatch,
    handleClearTestBatch,
    handleTestBatchSuggestionStatus,
    handleEnrichMissing,
    handleFullRerunEnrich,
    handleSuggestionStatus,
    handleResolveSuggestion,
    handleDuplicateGroupStatus,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        milestone="v0.4.4 · Dev Tools"
        title="Dev Tools"
        description="Maintenance helpers for developers. These are not part of the normal resume generation flow."
      />

      <ProfileContactBackfillPanel
        inventory={inventory}
        isSignedIn={isSignedIn}
        disabled={cloudEnabled && !isSignedIn}
        onApply={handleProfileContactBackfill}
      />

      <EnrichmentReviewPanel
        collated={collated}
        enrichment={inventory.enrichment}
        providerStatus={providerStatus}
        isEnriching={isEnriching}
        enrichError={enrichError}
        enrichDebugRaw={enrichDebugRaw}
        showTestBatchControls
        testBatchOnly
        onEnrichMissing={handleEnrichMissing}
        onFullRerunEnrich={handleFullRerunEnrich}
        onTestBatchEnrich={handleTestBatchEnrich}
        onMergeTestBatch={handleMergeTestBatch}
        onClearTestBatch={handleClearTestBatch}
        onSuggestionStatus={handleSuggestionStatus}
        onResolveSuggestion={handleResolveSuggestion}
        onTestBatchSuggestionStatus={handleTestBatchSuggestionStatus}
        onDuplicateGroupStatus={handleDuplicateGroupStatus}
      />
    </>
  );
}
