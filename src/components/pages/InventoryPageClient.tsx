"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { InventoryEditPanel } from "@/components/setup/InventoryEditPanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SourceResumesView } from "@/components/setup/SourceResumesView";
import { ViewTabs } from "@/components/setup/ui";
import { pageMilestone } from "@/lib/app-version";
import { createEmptyInventoryEdits, type InventoryEdits } from "@/types/inventory-edits";
import { inventoryEditsEqual } from "@/lib/inventory/edits";

export function InventoryPageClient() {
  const {
    collated,
    inventory,
    warnings,
    persistenceWarning,
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

  const savedEdits = inventory.edits ?? createEmptyInventoryEdits();
  const [draftEdits, setDraftEdits] = useState<InventoryEdits>(savedEdits);
  const [syncedSavedEdits, setSyncedSavedEdits] = useState<InventoryEdits>(savedEdits);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!inventoryEditsEqual(syncedSavedEdits, savedEdits)) {
    setSyncedSavedEdits(savedEdits);
    setDraftEdits(savedEdits);
  }

  const hasUnsavedChanges = !inventoryEditsEqual(draftEdits, savedEdits);

  async function handleSaveDraftEdits() {
    setIsSavingEdits(true);
    setSaveFeedback(null);

    try {
      await handleSaveInventoryEdits(draftEdits);
      setSaveFeedback({
        type: "success",
        message: "Changes saved to inventory.",
      });
    } catch {
      setSaveFeedback({
        type: "error",
        message: "Failed to save changes to inventory. Check the storage warning above.",
      });
    } finally {
      setIsSavingEdits(false);
    }
  }

  function handleDiscardDraftEdits() {
    setDraftEdits(savedEdits);
    setSaveFeedback(null);
  }

  return (
    <>
      <PageHeader
        milestone={pageMilestone("Inventory")}
        title="Career inventory"
        description="Review collated experience, enrich items, edit bullets on the Edit Bullets tab, and manage approved keywords."
      />

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={inventory.failures}
        warnings={warnings}
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

      {hasUnsavedChanges ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">Unsaved inventory changes</p>
          <p className="mt-1">
            Changes are not saved until you click Save changes to inventory on the Edit Bullets
            tab.
          </p>
        </div>
      ) : null}

      <ViewTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "collated" ? (
        <CollatedInventoryView collated={collated} />
      ) : activeTab === "edit" ? (
        <InventoryEditPanel
          inventory={inventory}
          draftEdits={draftEdits}
          onDraftEditsChange={setDraftEdits}
          onSave={handleSaveDraftEdits}
          onDiscard={handleDiscardDraftEdits}
          isSaving={isSavingEdits}
          saveFeedback={saveFeedback}
        />
      ) : (
        <SourceResumesView resumes={inventory.resumes} />
      )}
    </>
  );
}
