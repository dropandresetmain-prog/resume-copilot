"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { AuthPanel } from "@/components/setup/AuthPanel";
import { CloudFileStoragePanel } from "@/components/setup/CloudFileStoragePanel";
import { CollatedInventoryView } from "@/components/setup/CollatedInventoryView";
import { JDInputPanel } from "@/components/setup/JDInputPanel";
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
import { enrichInventory } from "@/lib/inventory/persistence";
import { detectLegacyLocalData } from "@/lib/legacy/local-data";
import {
  deleteJobDescriptionFromList,
  upsertJobDescriptionInList,
} from "@/lib/jd/persistence";
import { parseDocxResume } from "@/lib/parser/docx-parser";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadOriginalResumeFileToCloud } from "@/lib/supabase/files";
import {
  clearJobDescriptionsFromCloud,
  createJobDescriptionInCloud,
  deleteJobDescriptionFromCloud,
  listJobDescriptionsFromCloud,
  updateJobDescriptionInCloud,
} from "@/lib/supabase/job-descriptions";
import {
  deleteResumeInventoryFromCloud,
  loadResumeInventoryFromCloud,
  saveResumeInventoryToCloud,
} from "@/lib/supabase/resume-inventories";
import type { InventoryState } from "@/types/resume";
import type {
  DuplicateGroupSuggestion,
  ProviderStatusResponse,
  SuggestionStatus,
} from "@/types/enrichment";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

const EMPTY_INVENTORY: InventoryState = {
  resumes: [],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

export function SetupPageClient() {
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryState>(EMPTY_INVENTORY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichDebugRaw, setEnrichDebugRaw] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatusResponse | null>(null);
  const [legacyWarning] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return detectLegacyLocalData();
  });
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null);
  const [cloudLoadError, setCloudLoadError] = useState<string | null>(null);
  const [jdError, setJdError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(() => !isSupabaseConfigured());
  const [jobDescriptions, setJobDescriptions] = useState<StoredJobDescription[]>(
    [],
  );
  const [fileStorageWarning, setFileStorageWarning] = useState<string | null>(
    null,
  );
  const [fileStorageRefreshToken, setFileStorageRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<"collated" | "source">("collated");

  const skipCloudSaveRef = useRef(true);

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

  const isSignedIn = Boolean(user);
  const cloudEnabled = isSupabaseConfigured();
  const signInRequiredReason = cloudEnabled
    ? "Sign in to save and sync data across devices."
    : "Supabase is not configured. Data stays in memory for this session only.";

  const persistenceWarning = useMemo(
    () =>
      [legacyWarning, cloudLoadError, cloudSaveError, fileStorageWarning, jdError]
        .filter(Boolean)
        .join(" ") || null,
    [legacyWarning, cloudLoadError, cloudSaveError, fileStorageWarning, jdError],
  );

  useEffect(() => {
    if (!cloudEnabled) {
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    async function syncSignedInUser() {
      setIsCloudLoading(true);
      setCloudLoadError(null);
      skipCloudSaveRef.current = true;

      try {
        const cloudInventory = await loadResumeInventoryFromCloud();
        const jds = await listJobDescriptionsFromCloud();
        if (cancelled) return;

        if (cloudInventory) {
          setInventory(cloudInventory.inventory);
        } else {
          setInventory(EMPTY_INVENTORY);
        }
        setJobDescriptions(jds);
        setCloudSaveError(null);
        setJdError(null);
      } catch (error) {
        if (!cancelled) {
          setCloudLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load data from Supabase.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsCloudLoading(false);
          skipCloudSaveRef.current = false;
        }
      }
    }

    function resetSignedOutState() {
      skipCloudSaveRef.current = true;
      setInventory(EMPTY_INVENTORY);
      setJobDescriptions([]);
      setCloudSaveError(null);
      setCloudLoadError(null);
      setJdError(null);
      setIsCloudLoading(false);
    }

    async function handleAuthSession(session: { user: User } | null) {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        resetSignedOutState();
        return;
      }
      await syncSignedInUser();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      void handleAuthSession(session);
      setStorageReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleAuthSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [cloudEnabled]);

  useEffect(() => {
    fetchProviderStatus()
      .then(setProviderStatus)
      .catch(() => {
        setProviderStatus(null);
      });
  }, []);

  useEffect(() => {
    if (!user || !storageReady || !cloudEnabled || isCloudLoading) return;
    if (skipCloudSaveRef.current) return;

    const timer = window.setTimeout(() => {
      saveResumeInventoryToCloud(inventory)
        .then(() => {
          setCloudSaveError(null);
        })
        .catch((error) => {
          setCloudSaveError(
            error instanceof Error
              ? error.message
              : "Failed to save resume inventory to Supabase.",
          );
        });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [inventory, user, storageReady, cloudEnabled, isCloudLoading]);

  function updateInventory(next: InventoryState) {
    setInventory(enrichInventory(next));
  }

  async function handleFilesSelected(files: File[]) {
    setIsProcessing(true);
    setFileStorageWarning(null);

    let nextInventory = inventory;
    const batchFailures = [...inventory.failures];
    const uploadedFiles: File[] = [];

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
        uploadedFiles.push(file);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown parsing error.";
        batchFailures.push({ filename: file.name, message });
      }
    }

    const mergedInventory = { ...nextInventory, failures: batchFailures };
    updateInventory(mergedInventory);

    if (!user || !cloudEnabled) {
      setIsProcessing(false);
      return;
    }

    try {
      const saved = await saveResumeInventoryToCloud(mergedInventory);
      setCloudSaveError(null);

      const storageWarnings: string[] = [];
      for (const file of uploadedFiles) {
        try {
          const result = await uploadOriginalResumeFileToCloud(file, {
            resumeInventoryId: saved.id,
            fileName: file.name,
          });
          if (result.warning) {
            storageWarnings.push(`${file.name}: ${result.warning}`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Original file upload failed.";
          storageWarnings.push(`${file.name}: ${message}`);
        }
      }

      setFileStorageWarning(
        storageWarnings.length > 0 ? storageWarnings.join(" ") : null,
      );
      setFileStorageRefreshToken((token) => token + 1);
    } catch (error) {
      setCloudSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save resume inventory to Supabase.",
      );
    } finally {
      setIsProcessing(false);
    }
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

  async function handleSaveJobDescription(
    input: JobDescriptionInput,
    editingId: string | null,
    options?: { allowDuplicate?: boolean },
  ) {
    if (!user || !cloudEnabled) {
      throw new Error(signInRequiredReason);
    }

    setJdError(null);
    try {
      const saved = editingId
        ? await updateJobDescriptionInCloud(editingId, input, options)
        : await createJobDescriptionInCloud(input, options);
      setJobDescriptions((current) => upsertJobDescriptionInList(current, saved));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save job description.";
      setJdError(message);
      throw error;
    }
  }

  async function handleDeleteJobDescription(id: string) {
    if (!user || !cloudEnabled) {
      setJdError(signInRequiredReason);
      return;
    }

    setJdError(null);
    try {
      await deleteJobDescriptionFromCloud(id);
      setJobDescriptions((current) => deleteJobDescriptionFromList(current, id));
    } catch (error) {
      setJdError(
        error instanceof Error ? error.message : "Failed to delete job description.",
      );
    }
  }

  async function handleClearSavedJobDescriptions() {
    if (!user || !cloudEnabled) {
      setJdError(signInRequiredReason);
      return;
    }

    const confirmed = window.confirm(
      "Clear all saved job descriptions?\n\nThis does not affect resume inventory or enrichment state.",
    );
    if (!confirmed) return;

    setJdError(null);
    try {
      await clearJobDescriptionsFromCloud();
      setJobDescriptions([]);
    } catch (error) {
      setJdError(
        error instanceof Error
          ? error.message
          : "Failed to clear saved job descriptions.",
      );
    }
  }

  function handleDeleteResume(resumeId: string) {
    updateInventory(deleteResume(inventory, resumeId));
  }

  async function handleClearResumeInventory() {
    const firstConfirmed = window.confirm(
      "Clear resume inventory only?\n\nThis removes uploaded resumes, parsing errors, enrichment review state, and cloud inventory. Saved job descriptions are not affected.",
    );
    if (!firstConfirmed) return;

    const finalConfirmed = window.confirm(
      "Final confirmation: permanently delete all resume inventory data?\n\nThis cannot be undone.",
    );
    if (!finalConfirmed) return;

    if (user && cloudEnabled) {
      try {
        await deleteResumeInventoryFromCloud();
      } catch (error) {
        setCloudSaveError(
          error instanceof Error
            ? error.message
            : "Failed to delete cloud resume inventory.",
        );
        return;
      }
    }

    skipCloudSaveRef.current = true;
    setInventory(clearAllResumes());
    skipCloudSaveRef.current = false;
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            v0.3.0 · Supabase
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Career Resume Copilot
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            Build a reusable resume inventory from your existing resumes. Paste job
            descriptions for later tailoring. Uploaded DOCX files are parsed in the
            browser and synced through Supabase when you are signed in.
          </p>
        </header>

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
        />

        <SetupAlerts
          persistenceWarning={persistenceWarning}
          importError={null}
          failures={inventory.failures}
          warnings={warnings}
        />

        <JDInputPanel
          jobDescriptions={jobDescriptions}
          onSave={handleSaveJobDescription}
          onDelete={handleDeleteJobDescription}
          onClearAll={handleClearSavedJobDescriptions}
          disabled={cloudEnabled && !isSignedIn}
          disabledReason={cloudEnabled && !isSignedIn ? signInRequiredReason : undefined}
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
