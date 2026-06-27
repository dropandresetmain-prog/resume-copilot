"use client";

import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { InventoryEditPanel } from "@/components/setup/InventoryEditPanel";
import { InventoryDuplicateCleanupPanel } from "@/components/setup/InventoryDuplicateCleanupPanel";
import { InventoryProjectCleanupPanel } from "@/components/setup/InventoryProjectCleanupPanel";
import { InventoryTextExtractionPanel } from "@/components/setup/InventoryTextExtractionPanel";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SourceResumesView } from "@/components/setup/SourceResumesView";
import { UploadCard } from "@/components/setup/UploadCard";
import { SectionHeader, SetupCard, ViewTabs } from "@/components/setup/ui";
import { pageMilestone } from "@/lib/app-version";
import { createEmptyInventoryEdits, type InventoryEdits } from "@/types/inventory-edits";
import { inventoryEditsEqual } from "@/lib/inventory/edits";

export function InventoryPageClient() {
  const { user } = useWorkspace();

  // Inventory drafts are user-scoped. Remounting prevents an unsaved overlay from
  // one identity surviving an auth switch when both users have similar saved data.
  return <InventoryWorkspace key={user?.id ?? "signed-out"} />;
}

function InventoryWorkspace() {
  const {
    collated,
    inventory,
    warnings,
    persistenceWarning,
    providerStatus,
    isEnriching,
    enrichError,
    enrichDebugRaw,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    isWorkspaceLoading,
    inventoryLoadError,
    isProcessing,
    activeTab,
    setActiveTab,
    handleEnrichMissing,
    handleFullRerunEnrich,
    handleSuggestionStatus,
    handleResolveSuggestion,
    handleDuplicateGroupStatus,
    handleSaveInventoryEdits,
    handleFilesSelected,
    handleClearResumeInventory,
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
  const [enrichAutoSaveFeedback, setEnrichAutoSaveFeedback] = useState<string | null>(null);
  const wasEnrichingRef = useRef(isEnriching);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (wasEnrichingRef.current && !isEnriching && !enrichError) {
      setEnrichAutoSaveFeedback("Enrichment applied and saved automatically.");
      const timer = window.setTimeout(() => setEnrichAutoSaveFeedback(null), 6000);
      wasEnrichingRef.current = isEnriching;
      return () => window.clearTimeout(timer);
    }
    wasEnrichingRef.current = isEnriching;
  }, [isEnriching, enrichError]);

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

  const isPersistedSignedOut = cloudEnabled && !isSignedIn;
  const hasParsedInventory = inventory.resumes.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Evidence"
        milestone={pageMilestone("Inventory")}
        title="Inventory"
        description="Review the career evidence used by generation, tune bullet wording, and keep parser/source details available without crowding the main view."
      />

      {isWorkspaceLoading ? (
        <SetupCard
          title="Loading career vault"
          description="Loading your persisted resumes, parsed inventory, edits, and review state."
        >
          <p role="status" className="mt-4 text-sm text-slate-600">
            Loading saved career evidence…
          </p>
        </SetupCard>
      ) : isPersistedSignedOut ? (
        <SetupCard
          title="Sign in to access Career Vault"
          description={signInRequiredReason}
        >
          <p className="mt-4 text-sm text-slate-600">
            Your persisted resumes and inventory are not loaded while signed out.
          </p>
        </SetupCard>
      ) : inventoryLoadError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          data-testid="inventory-load-error"
        >
          <p className="font-medium">Career Vault could not load</p>
          <p className="mt-1">
            {inventoryLoadError} Reload the page to retry. The empty state below is not proof
            that your saved inventory is missing.
          </p>
        </div>
      ) : null}

      <SetupAlerts
        persistenceWarning={persistenceWarning}
        importError={null}
        failures={inventory.failures}
        warnings={warnings}
      />

      {!isWorkspaceLoading && !isPersistedSignedOut && !inventoryLoadError ? (
        <div className="space-y-4">
          <SectionHeader
            eyebrow="Source resumes"
            title={hasParsedInventory ? "Import another resume" : "Build your Career Vault"}
            description={
              hasParsedInventory
                ? "Upload another DOCX source resume or inspect existing sources below."
                : "No parsed inventory is available yet. Uploading a file is only successful when its parsed evidence appears in the vault."
            }
          />
          <UploadCard
            onFilesSelected={(files) => {
              void handleFilesSelected(files);
            }}
            isProcessing={isProcessing}
            onClearAll={() => {
              void handleClearResumeInventory();
            }}
            canClear={hasParsedInventory}
          />
        </div>
      ) : null}

      {!isWorkspaceLoading && !isPersistedSignedOut && !inventoryLoadError ? (
        <>
      <div className="space-y-4">
        <SectionHeader
          eyebrow="Import"
          title="Add evidence from pasted text"
          description="Turn notes, ChatGPT summaries, or rough bullets into reviewable inventory suggestions."
        />
        <InventoryTextExtractionPanel
          collated={collated}
          enrichment={inventory.enrichment}
          draftEdits={draftEdits}
          onDraftEditsChange={setDraftEdits}
          onSaveApplied={async (edits, enrichment) => {
            await handleSaveInventoryEdits(edits, { enrichment });
            setSaveFeedback({
              type: "success",
              message: "Applied suggestions saved to inventory.",
            });
          }}
        />
      </div>

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
        {enrichAutoSaveFeedback ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            data-testid="inventory-enrich-auto-save-feedback"
          >
            {enrichAutoSaveFeedback}
          </p>
        ) : null}
      </div>

      <InventoryDuplicateCleanupPanel
        inventory={inventory}
        draftEdits={draftEdits}
        hasUnsavedChanges={hasUnsavedChanges}
        onDraftEditsChange={setDraftEdits}
      />

      <InventoryProjectCleanupPanel
        draftEdits={draftEdits}
        savedEdits={savedEdits}
        hasUnsavedChanges={hasUnsavedChanges}
        onDraftEditsChange={setDraftEdits}
        onSaveCleanup={handleSaveInventoryEdits}
      />

      {hasUnsavedChanges ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="inventory-unsaved-changes-banner"
        >
          <p className="font-medium">Unsaved inventory changes</p>
          <p className="mt-1">
            Changes are not saved until you click Save changes to inventory on the Edit Bullets tab.
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
      ) : null}
    </>
  );
}
