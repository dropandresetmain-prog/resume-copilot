"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

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
  resolveSuggestionResolution,
  updateDuplicateGroupStatus,
  updateSuggestionStatus,
  updateTestBatchSuggestionStatus,
} from "@/lib/enrichment/state";
import {
  clearAllResumes,
  countInventory,
  deleteResume,
  upsertResume,
  updateInventoryEdits,
} from "@/lib/inventory/inventory";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
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
import type { CollatedInventory } from "@/types/collated";
import type { InventoryEdits } from "@/types/inventory-edits";
import { createEmptyInventoryEdits } from "@/types/inventory-edits";
import type { InventoryState } from "@/types/resume";
import type {
  DuplicateGroupSuggestion,
  ProviderStatusResponse,
  SuggestionResolution,
  SuggestionStatus,
} from "@/types/enrichment";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

const EMPTY_INVENTORY: InventoryState = {
  resumes: [],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
  edits: createEmptyInventoryEdits(),
};

export type WorkspaceContextValue = {
  user: User | null;
  inventory: InventoryState;
  jobDescriptions: StoredJobDescription[];
  totals: ReturnType<typeof countInventory>;
  collated: CollatedInventory;
  warnings: Array<{ filename: string; messages: string[] }>;
  isSignedIn: boolean;
  cloudEnabled: boolean;
  signInRequiredReason: string;
  persistenceWarning: string | null;
  isProcessing: boolean;
  isCloudLoading: boolean;
  isWorkspaceLoading: boolean;
  inventoryLoadError: string | null;
  isEnriching: boolean;
  enrichError: string | null;
  enrichDebugRaw: string | null;
  providerStatus: ProviderStatusResponse | null;
  fileStorageRefreshToken: number;
  activeTab: "collated" | "edit" | "source";
  setActiveTab: (tab: "collated" | "edit" | "source") => void;
  hasInventory: boolean;
  handleFilesSelected: (files: File[]) => Promise<void>;
  handleEnrichMissing: () => Promise<void>;
  handleFullRerunEnrich: () => Promise<void>;
  handleTestBatchEnrich: () => Promise<void>;
  handleMergeTestBatch: () => void;
  handleClearTestBatch: () => void;
  handleTestBatchSuggestionStatus: (
    suggestionId: string,
    status: SuggestionStatus,
  ) => void;
  handleSuggestionStatus: (suggestionId: string, status: SuggestionStatus) => void;
  handleResolveSuggestion: (
    suggestionId: string,
    resolution: SuggestionResolution,
  ) => void;
  handleDuplicateGroupStatus: (
    groupId: string,
    status: DuplicateGroupSuggestion["status"],
  ) => void;
  handleSaveJobDescription: (
    input: JobDescriptionInput,
    editingId: string | null,
    options?: { allowDuplicate?: boolean },
  ) => Promise<StoredJobDescription>;
  handleDeleteJobDescription: (id: string) => Promise<void>;
  handleClearSavedJobDescriptions: () => Promise<void>;
  handleDeleteResume: (resumeId: string) => void;
  handleClearResumeInventory: () => Promise<void>;
  handleProfileContactBackfill: (nextInventory: InventoryState) => Promise<void>;
  handleSaveInventoryEdits: (
    edits: InventoryEdits,
    options?: { enrichment?: InventoryState["enrichment"] },
  ) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
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
  const [activeTab, setActiveTab] = useState<"collated" | "edit" | "source">("collated");

  const skipCloudSaveRef = useRef(true);

  const totals = useMemo(() => countInventory(inventory), [inventory]);
  const collated = useMemo(
    () => buildActiveCollatedInventory(inventory),
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
  // Auth resolution and persisted inventory loading are one trust state for consumers:
  // an empty in-memory inventory is not authoritative until both have completed.
  const isWorkspaceLoading = !storageReady || isCloudLoading;
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

    async function handleAuthSession(session: Session | null) {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        resetSignedOutState();
        return;
      }
      await syncSignedInUser();
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await handleAuthSession(session);
      setStorageReady(true);
    })();

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

  async function handleEnrichMissing() {
    setEnrichError(null);
    setEnrichDebugRaw(null);
    setIsEnriching(true);

    try {
      const result = await requestInventoryEnrichment(collated, inventory.enrichment, {
        mode: "full",
        incremental: true,
      });
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

  async function handleFullRerunEnrich() {
    const confirmed = window.confirm(
      "This may create new suggestions and re-process existing inventory. Continue?",
    );
    if (!confirmed) return;

    setEnrichError(null);
    setEnrichDebugRaw(null);
    setIsEnriching(true);

    try {
      const result = await requestInventoryEnrichment(collated, inventory.enrichment, {
        mode: "full",
        incremental: false,
      });
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

  function handleResolveSuggestion(
    suggestionId: string,
    resolution: SuggestionResolution,
  ) {
    updateInventory({
      ...inventory,
      enrichment: resolveSuggestionResolution(
        inventory.enrichment,
        suggestionId,
        resolution,
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
  ): Promise<StoredJobDescription> {
    if (!user || !cloudEnabled) {
      throw new Error(signInRequiredReason);
    }

    setJdError(null);
    try {
      const saved = editingId
        ? await updateJobDescriptionInCloud(editingId, input, options)
        : await createJobDescriptionInCloud(input, options);
      setJobDescriptions((current) => upsertJobDescriptionInList(current, saved));
      return saved;
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

  async function handleSaveInventoryEdits(
    edits: InventoryEdits,
    options?: { enrichment?: InventoryState["enrichment"] },
  ) {
    const nextInventory = enrichInventory({
      ...updateInventoryEdits(inventory, edits),
      enrichment: options?.enrichment ?? inventory.enrichment,
    });

    if (!user || !cloudEnabled) {
      updateInventory(nextInventory);
      return;
    }

    setCloudSaveError(null);
    try {
      skipCloudSaveRef.current = true;
      await saveResumeInventoryToCloud(nextInventory);
      updateInventory(nextInventory);
    } catch (error) {
      setCloudSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save inventory edits to Supabase.",
      );
      throw error;
    } finally {
      skipCloudSaveRef.current = false;
    }
  }

  async function handleProfileContactBackfill(nextInventory: InventoryState) {
    if (!user || !cloudEnabled) {
      updateInventory(nextInventory);
      return;
    }

    setCloudSaveError(null);
    try {
      await saveResumeInventoryToCloud(nextInventory);
      updateInventory(nextInventory);
    } catch (error) {
      setCloudSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save profile/contact backfill to Supabase.",
      );
      throw error;
    }
  }

  const hasInventory = inventory.resumes.length > 0;

  const contextValue: WorkspaceContextValue = {
    user,
    inventory,
    jobDescriptions,
    totals,
    collated,
    warnings,
    isSignedIn,
    cloudEnabled,
    signInRequiredReason,
    persistenceWarning,
    isProcessing,
    isCloudLoading,
    isWorkspaceLoading,
    inventoryLoadError: cloudLoadError,
    isEnriching,
    enrichError,
    enrichDebugRaw,
    providerStatus,
    fileStorageRefreshToken,
    activeTab,
    setActiveTab,
    hasInventory,
    handleFilesSelected,
    handleEnrichMissing,
    handleFullRerunEnrich,
    handleTestBatchEnrich,
    handleMergeTestBatch,
    handleClearTestBatch,
    handleTestBatchSuggestionStatus,
    handleSuggestionStatus,
    handleResolveSuggestion,
    handleDuplicateGroupStatus,
    handleSaveJobDescription,
    handleDeleteJobDescription,
    handleClearSavedJobDescriptions,
    handleDeleteResume,
    handleClearResumeInventory,
    handleProfileContactBackfill,
    handleSaveInventoryEdits,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>
  );
}
