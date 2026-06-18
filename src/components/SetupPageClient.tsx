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
import { requestInventoryEnrichment } from "@/lib/enrichment/client";
import {
  createEmptyEnrichmentState,
  mergeEnrichmentResult,
  updateDuplicateGroupStatus,
  updateSuggestionStatus,
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
    setIsEnriching(true);

    try {
      const result = await requestInventoryEnrichment(collated);
      updateInventory({
        ...inventory,
        enrichment: mergeEnrichmentResult(inventory.enrichment, result),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI enrichment failed.";
      setEnrichError(message);
    } finally {
      setIsEnriching(false);
    }
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
    const confirmed = window.confirm(
      "Clear all uploaded resumes, parsing errors, enrichment review state, and saved browser inventory?",
    );
    if (!confirmed) return;
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
          isEnriching={isEnriching}
          enrichError={enrichError}
          onEnrich={handleEnrichInventory}
          onSuggestionStatus={handleSuggestionStatus}
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
