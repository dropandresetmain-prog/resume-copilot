"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { InventoryEditPanel } from "@/components/setup/InventoryEditPanel";
import { InventoryDuplicateCleanupPanel } from "@/components/setup/InventoryDuplicateCleanupPanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SourceResumesView } from "@/components/setup/SourceResumesView";
import { SectionHeader, ViewTabs } from "@/components/setup/ui";
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
        eyebrow="Evidence"
        milestone={pageMilestone("Inventory")}
        title="Inventory"
        description="Review the career evidence used by generation, tune bullet wording, and keep parser/source details available without crowding the main view."
      />

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={inventory.failures}
        warnings={warnings}
      />

      <div className="space-y-4">
        <SectionHeader
          eyebrow="Review layer"
          title="Enrichment and evidence quality"
          description="AI suggestions, duplicate checks, and approved keywords sit above the inventory sections they inform."
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
      </div>

      <InventoryDuplicateCleanupPanel
        inventory={inventory}
        draftEdits={draftEdits}
        onDraftEditsChange={setDraftEdits}
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

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-800">Inventory sections</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Overview, edits, and source audit
            </h2>
          </div>
          <ViewTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div>
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
        </div>
      </div>
    </>
  );
}
