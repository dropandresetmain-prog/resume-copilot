"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { InventoryEditPanel } from "@/components/setup/InventoryEditPanel";
import { SourceResumesView } from "@/components/setup/SourceResumesView";
import { ViewTabs } from "@/components/setup/ui";

export function InventoryPageClient() {
  const {
    collated,
    inventory,
    providerStatus,
    isEnriching,
    enrichError,
    enrichDebugRaw,
    activeTab,
    setActiveTab,
    handleEnrichMissing,
    handleFullRerunEnrich,
    handleSuggestionStatus,
    handleResolveSuggestion,
    handleDuplicateGroupStatus,
    handleSaveInventoryEdits,
  } = useWorkspace();

  return (
    <>
      <PageHeader
        milestone="v0.7.7 · Inventory"
        title="Career inventory"
        description="Review your collated experience, run AI enrichment on new or changed items, and manage approved keywords."
      />

      <EnrichmentReviewPanel
        collated={collated}
        enrichment={inventory.enrichment}
        providerStatus={providerStatus}
        isEnriching={isEnriching}
        enrichError={enrichError}
        enrichDebugRaw={enrichDebugRaw}
        onEnrichMissing={handleEnrichMissing}
        onFullRerunEnrich={handleFullRerunEnrich}
        onSuggestionStatus={handleSuggestionStatus}
        onResolveSuggestion={handleResolveSuggestion}
        onDuplicateGroupStatus={handleDuplicateGroupStatus}
      />

      <ViewTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "collated" ? (
        <CollatedInventoryView collated={collated} />
      ) : activeTab === "edit" ? (
        <InventoryEditPanel
          key={JSON.stringify(inventory.edits ?? {})}
          inventory={inventory}
          onSaveEdits={handleSaveInventoryEdits}
        />
      ) : (
        <SourceResumesView resumes={inventory.resumes} />
      )}
    </>
  );
}
