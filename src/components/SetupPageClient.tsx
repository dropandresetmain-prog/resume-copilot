"use client";

import { useEffect, useMemo, useState } from "react";

import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { ResumeList } from "@/components/setup/ResumeList";
import { SetupAlerts } from "@/components/setup/SetupAlerts";
import { SourceResumesView } from "@/components/setup/SourceResumesView";
import { SummaryCards } from "@/components/setup/SummaryCards";
import { UploadCard } from "@/components/setup/UploadCard";
import { ViewTabs } from "@/components/setup/ui";
import {
  fetchProviderStatus,
  requestInventoryEnrichment,
  type EnrichmentClientError,
} from "@/lib/enrichment/client";
import {
  applyTestBatchResult,
  clearTestBatch,
  createEmptyEnrichmentState,
  mergeEnrichmentResult,
  mergeTestBatchIntoMain,
  updateDuplicateGroupStatus,
  updateSuggestionStatus,
  updateTestBatchSuggestionStatus,
} from "@/lib/enrichment/state";
import {
  clearAllResumes,
  countInventory,
  deleteResume,
  upsertResume,
} from "@/lib/inventory/inventory";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import {
  clearInventoryStorage,
  downloadInventoryJson,
  enrichInventory,
  loadInventoryFromStorage,
  parseImportedInventory,
  saveInventoryToStorage,
} from "@/lib/inventory/persistence";
import { parseDocxResume } from "@/lib/parser/docx-parser";
import type { InventoryState } from "@/types/resume";
import type {
  DuplicateGroupSuggestion,
  ProviderStatusResponse,
  SuggestionStatus,
} from "@/types/enrichment";

const EMPTY_INVENTORY: InventoryState = {
  resumes: [],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

export function SetupPageClient() {
  const [inventory, setInventory] = useState<InventoryState>(EMPTY_INVENTORY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichDebugRaw, setEnrichDebugRaw] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatusResponse | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(
    null,
  );
  const [storageReady, setStorageReady] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"collated" | "source">("collated");

  const totals = useMemo(() => countInventory(inventory), [inventory]);
  const collated = useMemo(
    () => buildCollatedInventory(inventory),
    [inventory],
  );

  const warnings = useMemo(
    () =>
      inventory.resumes
        .filter((resume) => resume.parseWarnings.length > 0)
        .map((resume) => ({
          filename: resume.filename,
          messages: resume.parseWarnings,
        })),
    [inventory.resumes],
  );

  useEffect(() => {
    const { inventory: stored, warning } = loadInventoryFromStorage();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    setPersistenceWarning(warning);
    if (stored) {
      setInventory(stored);
    }
    setStorageReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    fetchProviderStatus()
      .then(setProviderStatus)
      .catch(() => {
        setProviderStatus(null);
      });
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveInventoryToStorage(inventory);
  }, [inventory, storageReady]);

  function updateInventory(next: InventoryState) {
    setInventory(enrichInventory(next));
  }

  async function handleFilesSelected(files: File[]) {
    setIsProcessing(true);

    let nextInventory = inventory;
    const batchFailures = [...inventory.failures];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".docx")) {
        batchFailures.push({
          filename: file.name,
          message: "Only .docx files are supported.",
        });
        continue;
      }

      try {
        const parsed = await parseDocxResume(file);
        nextInventory = upsertResume(nextInventory, parsed);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown parsing error.";
        batchFailures.push({ filename: file.name, message });
      }
    }

    updateInventory({ ...nextInventory, failures: batchFailures });
    setIsProcessing(false);
  }

  async function handleEnrichInventory() {
    setEnrichError(null);
    setEnrichDebugRaw(null);
    setIsEnriching(true);

    try {
      const result = await requestInventoryEnrichment(collated, { mode: "full" });
      updateInventory({
        ...inventory,
        enrichment: mergeEnrichmentResult(inventory.enrichment, result),
      });
    } catch (error) {
      const clientError = error as EnrichmentClientError;
      const message =
        clientError instanceof Error ? clientError.message : "AI enrichment failed.";
      setEnrichError(message);
      setEnrichDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsEnriching(false);
    }
  }

  async function handleTestBatchEnrich() {
    setEnrichError(null);
    setEnrichDebugRaw(null);
    setIsEnriching(true);

    try {
      const result = await requestInventoryEnrichment(collated, {
        mode: "small_batch_test",
      });
      updateInventory({
        ...inventory,
        enrichment: applyTestBatchResult(inventory.enrichment, result),
      });
    } catch (error) {
      const clientError = error as EnrichmentClientError;
      const message =
        clientError instanceof Error ? clientError.message : "AI enrichment failed.";
      setEnrichError(message);
      setEnrichDebugRaw(clientError.rawModelResponse ?? null);
    } finally {
      setIsEnriching(false);
    }
  }

  function handleMergeTestBatch() {
    const confirmed = window.confirm(
      "Merge small-batch test suggestions into main enrichment? This adds pending suggestions to your main review queue.",
    );
    if (!confirmed) return;

    updateInventory({
      ...inventory,
      enrichment: mergeTestBatchIntoMain(inventory.enrichment),
    });
  }

  function handleClearTestBatch() {
    updateInventory({
      ...inventory,
      enrichment: clearTestBatch(inventory.enrichment),
    });
  }

  function handleTestBatchSuggestionStatus(
    suggestionId: string,
    status: SuggestionStatus,
  ) {
    updateInventory({
      ...inventory,
      enrichment: updateTestBatchSuggestionStatus(
        inventory.enrichment,
        suggestionId,
        status,
      ),
    });
  }

  function handleSuggestionStatus(
    suggestionId: string,
    status: SuggestionStatus,
  ) {
    updateInventory({
      ...inventory,
      enrichment: updateSuggestionStatus(
        inventory.enrichment,
        suggestionId,
        status,
      ),
    });
  }

  function handleDuplicateGroupStatus(
    groupId: string,
    status: DuplicateGroupSuggestion["status"],
  ) {
    updateInventory({
      ...inventory,
      enrichment: updateDuplicateGroupStatus(
        inventory.enrichment,
        groupId,
        status,
      ),
    });
  }

  function handleDeleteResume(resumeId: string) {
    updateInventory(deleteResume(inventory, resumeId));
  }

  function handleClearAll() {
    const firstConfirmed = window.confirm(
      "Clear all uploaded resumes, parsing errors, enrichment review state, and saved browser inventory?\n\nThis will delete everything in your local inventory.",
    );
    if (!firstConfirmed) return;

    const finalConfirmed = window.confirm(
      "Final confirmation: permanently delete ALL inventory data?\n\nThis cannot be undone. Export your inventory first if you need a backup.",
    );
    if (!finalConfirmed) return;

    clearInventoryStorage();
    setInventory(clearAllResumes());
  }

  function handleExport() {
    downloadInventoryJson(inventory);
  }

  async function handleImportSelected(fileList: FileList | null) {
    setImportError(null);
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const text = await file.text();
    const { inventory: imported, error } = parseImportedInventory(text);

    if (error || !imported) {
      setImportError(error ?? "Import failed.");
      return;
    }

    const confirmed = window.confirm(
      "Replace the current inventory with the imported JSON file?",
    );
    if (!confirmed) return;

    updateInventory(imported);
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Milestone 2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Career Resume Copilot
          </h1>
          <p className="max-w-3xl text-base text-zinc-600">
            Build a reusable resume inventory from your existing resumes. Uploaded
            DOCX files are parsed in the browser. AI enrichment adds reviewable
            suggestions without overwriting parsed source data.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <UploadCard
            onFilesSelected={handleFilesSelected}
            isProcessing={isProcessing}
            onExport={handleExport}
            onImport={handleImportSelected}
            onClearAll={handleClearAll}
            canExport={inventory.resumes.length > 0}
            canClear={inventory.resumes.length > 0}
          />
          <SummaryCards totals={totals} />
        </div>

        <SetupAlerts
          persistenceWarning={persistenceWarning}
          importError={importError}
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
          onEnrich={handleEnrichInventory}
          onTestBatchEnrich={handleTestBatchEnrich}
          onMergeTestBatch={handleMergeTestBatch}
          onClearTestBatch={handleClearTestBatch}
          onSuggestionStatus={handleSuggestionStatus}
          onTestBatchSuggestionStatus={handleTestBatchSuggestionStatus}
          onDuplicateGroupStatus={handleDuplicateGroupStatus}
        />

        <ResumeList
          resumes={inventory.resumes}
          onDeleteResume={handleDeleteResume}
        />

        <ViewTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "collated" ? (
          <CollatedInventoryView collated={collated} />
        ) : (
          <SourceResumesView resumes={inventory.resumes} />
        )}
      </div>
    </div>
  );
}
