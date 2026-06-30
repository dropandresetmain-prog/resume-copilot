"use client";

import { useEffect, useRef, useState } from "react";
import { fetchResumeApplicationCountsFromCloud } from "@/lib/supabase/generated-resume-drafts";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { EnrichmentReviewPanel } from "@/components/setup/EnrichmentReviewPanel";
import { InventoryDuplicateCleanupPanel } from "@/components/setup/InventoryDuplicateCleanupPanel";
import { InventoryProjectCleanupPanel } from "@/components/setup/InventoryProjectCleanupPanel";
import { InventoryTextExtractionPanel } from "@/components/setup/InventoryTextExtractionPanel";
import { UploadCard } from "@/components/setup/UploadCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildCollatedBulletKey,
  hideInventoryBullet,
  inventoryEditsEqual,
  isBulletHidden,
  restoreInventoryBullet,
  setInventoryBulletEdit,
} from "@/lib/inventory/edits";
import { createEmptyInventoryEdits, type InventoryEdits } from "@/types/inventory-edits";

// Parse result after a DOCX upload batch completes.
type UploadResult = {
  addedCount: number;
  failedCount: number;
  newFailures: Array<{ filename: string; message: string }>;
};

// Import dialog phases: idle (show upload card) → processing → result.
type UploadPhase = "idle" | "processing" | UploadResult;

type VaultTab = "work" | "education" | "skills" | "additional" | "keywords";

const TABS: { key: VaultTab; label: string }[] = [
  { key: "work", label: "Work experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "additional", label: "Additional" },
  { key: "keywords", label: "Keywords" },
];

function vaultHealthPercent(totals: {
  resumes: number;
  workExperiences: number;
  educationItems: number;
  skillCategories: number;
}): number {
  const checks = [
    totals.resumes > 0,
    totals.workExperiences > 0,
    totals.educationItems > 0,
    totals.skillCategories > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function vaultHint(totals: {
  resumes: number;
  workExperiences: number;
  educationItems: number;
  skillCategories: number;
}): string {
  if (totals.resumes === 0) return "Upload a resume to start filling your vault.";
  if (totals.educationItems === 0) return "Add education entries to improve vault health.";
  if (totals.skillCategories === 0) return "Add skills to improve vault health.";
  if (totals.workExperiences === 0) return "Add work experience to reach full vault health.";
  return "Your vault looks complete — keep your entries current.";
}

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold bg-folio-mint-surface text-folio-sidebar"
    >
      {initials || "?"}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-folio-sage-border py-16">
      <p className="text-sm text-folio-outline">{message}</p>
    </div>
  );
}

/**
 * Career Vault page — primary inventory surface at `/inventory`.
 *
 * M2 additions: explicit DOCX upload parse states (saved/partial/failed inside
 * the dialog); revert-to-original per bullet; save error surfacing; Vault
 * Management Tools section (enrichment review, duplicate cleanup, project
 * cleanup) under progressive disclosure.
 *
 * Source resumes are never mutated. All overlay edits live in InventoryEdits
 * and are persisted through handleSaveInventoryEdits only.
 *
 * @see docs/CAREER_VAULT.md
 * @see docs/FOLIO_RECOVERY_ROADMAP.md §9 M2
 */
export function CareerVaultPageClient() {
  const {
    collated,
    inventory,
    totals,
    isProcessing,
    isEnriching,
    enrichError,
    enrichDebugRaw,
    providerStatus,
    handleSaveInventoryEdits,
    handleFilesSelected,
    handleClearResumeInventory,
    handleEnrichMissing,
    handleFullRerunEnrich,
    handleSuggestionStatus,
    handleResolveSuggestion,
    handleDuplicateGroupStatus,
  } = useWorkspace();

  // ── Extraction / import panel visibility ─────────────────────────────────
  const [extractionPanelOpen, setExtractionPanelOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);

  // ── Upload phase: explicit parse result states (M2 §1) ───────────────────
  // Tracks the lifecycle of a single upload batch inside the import dialog.
  // "idle"       → show UploadCard normally
  // "processing" → keep dialog open, show parsing indicator
  // UploadResult → show saved / partial / failed state with details
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const uploadSnapRef = useRef({ resumeCount: 0, failureCount: 0 });
  const wasProcessingRef = useRef(false);

  // Detect the isProcessing false-edge to compute upload result from inventory diff.
  useEffect(() => {
    if (wasProcessingRef.current && !isProcessing && uploadPhase === "processing") {
      const addedCount = inventory.resumes.length - uploadSnapRef.current.resumeCount;
      const failedCount = inventory.failures.length - uploadSnapRef.current.failureCount;
      const newFailures = inventory.failures.slice(uploadSnapRef.current.failureCount);
      setUploadPhase({ addedCount, failedCount, newFailures });
    }
    wasProcessingRef.current = isProcessing;
  }, [isProcessing, inventory, uploadPhase]);

  // ── Resume application counts ─────────────────────────────────────────────
  const [resumeAppCounts, setResumeAppCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchResumeApplicationCountsFromCloud()
      .then(setResumeAppCounts)
      .catch(() => {/* non-critical, leave counts at zero */});
  }, []);

  // ── Inventory edits state ─────────────────────────────────────────────────
  const savedEdits = inventory.edits ?? createEmptyInventoryEdits();
  const [draftEdits, setDraftEdits] = useState<InventoryEdits>(savedEdits);
  const [syncedSavedEdits, setSyncedSavedEdits] = useState<InventoryEdits>(savedEdits);

  // Sync local draft when workspace saves externally (e.g. after enrichment or
  // when another tab triggers a cloud reload).
  if (!inventoryEditsEqual(syncedSavedEdits, savedEdits)) {
    setSyncedSavedEdits(savedEdits);
    setDraftEdits(savedEdits);
  }

  const hasUnsavedChanges = !inventoryEditsEqual(draftEdits, savedEdits);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<VaultTab>("work");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBulletKey, setEditingBulletKey] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [vaultToolsOpen, setVaultToolsOpen] = useState(false);

  // ── beforeunload guard (hasUnsavedChanges) ────────────────────────────────
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function guard(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsavedChanges]);

  // ── Overlay edit persistence ──────────────────────────────────────────────
  // All edits go through persistEdits — never touch source resumes directly.
  async function persistEdits(nextEdits: InventoryEdits) {
    setDraftEdits(nextEdits);
    setSaveError(null);
    try {
      await handleSaveInventoryEdits(nextEdits);
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    }
  }

  async function toggleHide(bulletKey: string, currentlyHidden: boolean) {
    const next = currentlyHidden
      ? restoreInventoryBullet(draftEdits, bulletKey)
      : hideInventoryBullet(draftEdits, bulletKey);
    await persistEdits(next);
  }

  function startEdit(bulletKey: string, currentText: string) {
    setEditingBulletKey(bulletKey);
    setEditDraftText(currentText);
  }

  async function commitEdit(bulletKey: string) {
    const next = setInventoryBulletEdit(draftEdits, bulletKey, editDraftText);
    setEditingBulletKey(null);
    setEditDraftText("");
    await persistEdits(next);
  }

  function cancelEdit() {
    setEditingBulletKey(null);
    setEditDraftText("");
  }

  // Revert a bullet's text override back to its source-resume text (M2 §2).
  // Calls setInventoryBulletEdit with null to delete the override key.
  async function revertBulletEdit(bulletKey: string) {
    const next = setInventoryBulletEdit(draftEdits, bulletKey, null);
    await persistEdits(next);
  }

  // ── Import dialog handlers ────────────────────────────────────────────────
  // Snapshot resume/failure counts before upload so we can compute the diff.
  function handleImportFiles(files: File[]) {
    uploadSnapRef.current = {
      resumeCount: inventory.resumes.length,
      failureCount: inventory.failures.length,
    };
    setUploadPhase("processing");
    void handleFilesSelected(files);
  }

  function closeImportDialog() {
    setImportPanelOpen(false);
    setUploadPhase("idle");
  }

  // ── Enrichment chip index ─────────────────────────────────────────────────
  const enrichmentByKey = new Map<string, Array<{ id: string; issueTitle: string }>>();
  for (const s of inventory.enrichment?.suggestions ?? []) {
    if (s.status === "accepted") {
      const arr = enrichmentByKey.get(s.bulletKey) ?? [];
      arr.push({ id: s.id, issueTitle: s.issueTitle });
      enrichmentByKey.set(s.bulletKey, arr);
    }
  }

  const vaultPct = vaultHealthPercent(totals);
  const hint = vaultHint(totals);

  return (
    <div className="relative max-w-[860px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            Career Vault
          </h1>
          <p className="mt-1 text-sm text-folio-outline">
            Manage and refine your professional inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExtractionPanelOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 bg-folio-primary-container"
        >
          <PlusIcon />
          Add experience
        </button>
      </div>

      {/* Vault health card */}
      <div className="mt-6 rounded-xl border border-folio-sage-border bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-folio-on-surface">Vault health</span>
          <span className="text-sm font-semibold text-folio-primary-container">
            {vaultPct}%
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-folio-surface-dim">
          <div
            className="h-full rounded-full bg-folio-primary-container transition-all duration-500"
            style={{ width: `${vaultPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-folio-outline">{hint}</p>
      </div>

      {/* Add-from-Text panel — shown below vault summary, above tabs */}
      {extractionPanelOpen && (
        <div className="mt-6">
          <InventoryTextExtractionPanel
            collated={collated}
            enrichment={inventory.enrichment}
            draftEdits={draftEdits}
            onDraftEditsChange={setDraftEdits}
            onSaveApplied={async (edits, enrichment) => {
              await handleSaveInventoryEdits(edits, { enrichment });
            }}
            isOpen={extractionPanelOpen}
            onOpenChange={setExtractionPanelOpen}
          />
        </div>
      )}

      {/* Tab nav */}
      <div className="mt-6 flex border-b border-folio-sage-border">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`mb-[-1px] px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-folio-primary-container text-folio-primary-container"
                  : "text-folio-outline hover:text-folio-on-surface"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4 space-y-3 pb-8">
        {/* ── Work experience ── */}
        {activeTab === "work" &&
          (collated.experiences.length === 0 ? (
            <EmptyTabState message="No work experience yet. Upload a resume or add entries above." />
          ) : (
            collated.experiences.map((exp) => {
              const isExpanded = expandedId === exp.id;
              const expAppCount = exp.sourceCitations.reduce((sum, cite) => {
                return sum + (resumeAppCounts.get(cite.resumeId) ?? 0);
              }, 0);

              return (
                <div
                  key={exp.id}
                  className="rounded-xl border border-folio-sage-border bg-white p-4"
                >
                  {/* Card header row */}
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={exp.company} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug text-folio-on-surface">
                        {exp.role}
                      </p>
                      <p className="mt-0.5 text-[13px] text-folio-outline">
                        {exp.company}
                        {exp.dateRange ? ` · ${exp.dateRange}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-folio-surface-container px-2.5 py-0.5 text-[11px] text-folio-outline">
                          {exp.bullets.length}{" "}
                          {exp.bullets.length === 1 ? "bullet" : "bullets"}
                        </span>
                        {/* status colours — intentional */}
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: "#D6F5EC",
                            color: "var(--color-folio-sidebar)",
                            borderColor: "#9FE1CB",
                          }}
                        >
                          {expAppCount === 0
                            ? "Not used in active apps"
                            : `Used in ${expAppCount} ${expAppCount === 1 ? "application" : "applications"}`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                      className="mt-0.5 shrink-0 rounded p-1 text-folio-outline transition hover:bg-folio-surface-container hover:text-folio-on-surface"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                      aria-expanded={isExpanded}
                    >
                      <ChevronIcon open={isExpanded} />
                    </button>
                  </div>

                  {/* Expanded bullet list */}
                  {isExpanded && (
                    <div className="mt-4">
                      <ul className="space-y-3">
                        {exp.bullets.map((bullet) => {
                          const bKey =
                            bullet.inventoryBulletKey ??
                            buildCollatedBulletKey(exp, bullet);
                          const hidden = isBulletHidden(draftEdits, bKey);
                          const hasTextOverride =
                            draftEdits.editedBulletTextByBulletKey[bKey] !== undefined;
                          const displayText =
                            draftEdits.editedBulletTextByBulletKey[bKey] ??
                            bullet.description;
                          const chips = enrichmentByKey.get(bKey) ?? [];
                          const isEditing = editingBulletKey === bKey;

                          return (
                            <li
                              key={bullet.id}
                              className={`group border-t border-folio-surface-container pt-3 first:border-t-0 first:pt-0 ${
                                hidden ? "opacity-40" : ""
                              }`}
                            >
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <textarea
                                    autoFocus
                                    rows={2}
                                    value={editDraftText}
                                    onChange={(e) => setEditDraftText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                                        void commitEdit(bKey);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    className="flex-1 rounded-lg border border-folio-outline-variant p-2 text-[14px] text-folio-on-surface focus:border-folio-primary-container focus:outline-none"
                                  />
                                  <div className="flex shrink-0 flex-col gap-1">
                                    <button
                                      type="button"
                                      onClick={() => void commitEdit(bKey)}
                                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-folio-primary-container"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      className="rounded-lg border border-folio-outline-variant px-3 py-1.5 text-xs font-medium text-folio-outline"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 shrink-0 select-none text-folio-outline">
                                    •
                                  </span>
                                  <span className="flex-1 text-[14px] leading-relaxed text-folio-on-surface">
                                    {displayText}
                                    {hasTextOverride && (
                                      <span className="ml-1.5 rounded-full bg-folio-mint-surface px-1.5 py-0.5 text-[10px] font-medium text-folio-olive-text">
                                        edited
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(bKey, displayText)}
                                      className="rounded p-1 text-folio-outline hover:bg-folio-surface-container hover:text-folio-on-surface"
                                      aria-label="Edit bullet"
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void toggleHide(bKey, hidden)}
                                      className="rounded px-2 py-0.5 text-[11px] text-folio-outline hover:bg-folio-surface-container hover:text-folio-on-surface"
                                    >
                                      {hidden ? "Show" : "Hide"}
                                    </button>
                                    {hasTextOverride && (
                                      <button
                                        type="button"
                                        onClick={() => void revertBulletEdit(bKey)}
                                        className="rounded px-2 py-0.5 text-[11px] text-folio-outline hover:bg-folio-surface-container hover:text-folio-on-surface"
                                        title="Revert to original source text"
                                      >
                                        Revert
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {chips.length > 0 && !isEditing && (
                                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-4">
                                  {chips.map((chip) => (
                                    <span
                                      key={chip.id}
                                      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-folio-mint-surface text-folio-olive-text"
                                    >
                                      {chip.issueTitle}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                    </div>
                  )}
                </div>
              );
            })
          ))}

        {/* ── Skills ── */}
        {activeTab === "skills" &&
          (collated.skillItems.length === 0 ? (
            <EmptyTabState message="No skills yet. Upload a resume to populate skills." />
          ) : (
            <div className="rounded-xl border border-folio-sage-border bg-white p-4">
              {Object.entries(
                collated.skillItems.reduce<Record<string, string[]>>((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item.text);
                  return acc;
                }, {}),
              ).map(([category, skills]) => (
                <div key={category} className="mt-4 first:mt-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-folio-outline">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-folio-sage-border px-3 py-1 text-[13px] text-folio-on-surface"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

        {/* ── Education ── */}
        {activeTab === "education" &&
          (collated.educationItems.length === 0 ? (
            <EmptyTabState message="No education yet. Upload a resume to populate education." />
          ) : (
            collated.educationItems.map((edu) => (
              <div
                key={edu.id}
                className="rounded-xl border border-folio-sage-border bg-white p-4"
              >
                <p className="text-[15px] font-semibold text-folio-on-surface">
                  {edu.institution}
                </p>
                {edu.programmes.length > 0 && (
                  <p className="mt-0.5 text-[13px] text-folio-outline">
                    {edu.programmes.join(", ")}
                  </p>
                )}
                {edu.dateRange && (
                  <p className="mt-0.5 text-[13px] text-folio-outline">{edu.dateRange}</p>
                )}
                {edu.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {edu.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-[14px] text-folio-on-surface">
                        <span className="mt-0.5 shrink-0 text-folio-outline">•</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ))}

        {/* ── Additional ── */}
        {activeTab === "additional" &&
          (collated.additionalExperienceItems.length === 0 ? (
            <EmptyTabState message="No additional experience yet." />
          ) : (
            <div className="rounded-xl border border-folio-sage-border bg-white p-4">
              <ul className="space-y-2">
                {collated.additionalExperienceItems.map((item) => (
                  <li key={item.id} className="flex gap-2 text-[14px] text-folio-on-surface">
                    <span className="mt-0.5 shrink-0 text-folio-outline">•</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {/* ── Keywords ── */}
        {activeTab === "keywords" &&
          ((inventory.enrichment?.keywordBank.length ?? 0) === 0 ? (
            <EmptyTabState message="No keywords yet. Run enrichment or add experience to populate the keyword bank." />
          ) : (
            <div className="rounded-xl border border-folio-sage-border bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {inventory.enrichment!.keywordBank.map((item) => (
                  <span
                    key={item.id}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      item.approved
                        ? "border-[#88d6b5] bg-[#e8f5ef] text-[#016147]"
                        : "border-folio-outline-variant bg-folio-surface-container text-folio-outline"
                    }`}
                  >
                    {item.keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Unsaved changes banner (M2 §2) — shown when auto-save is pending or failed. */}
      {hasUnsavedChanges && (
        <div
          role="status"
          data-testid="inventory-unsaved-changes-banner"
          className={`mt-2 rounded-lg border px-4 py-3 text-sm ${
            saveError
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-medium">
            {saveError ?? "Saving changes…"}
          </p>
          {saveError && (
            <p className="mt-0.5 text-xs">
              Some changes may not have saved. Check your connection and try again.
            </p>
          )}
        </div>
      )}

      {/* Vault Management Tools — progressive disclosure (M2 §4) */}
      <div className="mt-6 pb-32">
        <button
          type="button"
          onClick={() => setVaultToolsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-folio-sage-border bg-white px-4 py-3 text-sm font-medium text-folio-on-surface transition hover:bg-folio-surface-container-low"
          aria-expanded={vaultToolsOpen}
        >
          <span>Vault management tools</span>
          <ChevronIcon open={vaultToolsOpen} />
        </button>

        {vaultToolsOpen && (
          <div className="mt-3 space-y-4">
            {/* Enrichment review: AI suggestions and enrichment run. Keyword Bank promoted to main panel. */}
            <EnrichmentReviewPanel
              collated={collated}
              enrichment={inventory.enrichment}
              providerStatus={providerStatus}
              isEnriching={isEnriching}
              enrichError={enrichError}
              enrichDebugRaw={enrichDebugRaw}
              hideKeywordBank={true}
              onEnrichMissing={handleEnrichMissing}
              onFullRerunEnrich={handleFullRerunEnrich}
              onSuggestionStatus={handleSuggestionStatus}
              onResolveSuggestion={handleResolveSuggestion}
              onDuplicateGroupStatus={handleDuplicateGroupStatus}
            />

            {/* Duplicate cleanup: self-hides when no duplicates are detected. */}
            <InventoryDuplicateCleanupPanel
              inventory={inventory}
              draftEdits={draftEdits}
              hasUnsavedChanges={hasUnsavedChanges}
              onDraftEditsChange={(nextEdits) => { void persistEdits(nextEdits); }}
            />

            {/* Project-pollution cleanup: self-hides when no polluted overlay rows. */}
            <InventoryProjectCleanupPanel
              draftEdits={draftEdits}
              savedEdits={savedEdits}
              hasUnsavedChanges={hasUnsavedChanges}
              onDraftEditsChange={setDraftEdits}
              onSaveCleanup={handleSaveInventoryEdits}
            />
          </div>
        )}
      </div>

      {/* Floating action buttons — bottom right */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setImportPanelOpen(true)}
          className="rounded-lg border border-folio-sage-border bg-white px-4 py-2.5 text-sm font-medium text-folio-on-surface shadow-md transition hover:bg-folio-surface-container-low"
        >
          Import from resume
        </button>
        <button
          type="button"
          onClick={() => setExtractionPanelOpen(true)}
          className="rounded-lg border border-folio-sage-border bg-white px-4 py-2.5 text-sm font-medium text-folio-on-surface shadow-md transition hover:bg-folio-surface-container-low"
        >
          Paste career text
        </button>
      </div>

      {/* Import from resume dialog with explicit parse states (M2 §1) */}
      <Dialog
        open={importPanelOpen}
        onOpenChange={(open) => {
          if (!open) closeImportDialog();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import from resume</DialogTitle>
            <DialogDescription>
              Upload a DOCX resume to add it to your Career Vault.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {/* idle: show upload card */}
            {uploadPhase === "idle" && (
              <UploadCard
                onFilesSelected={handleImportFiles}
                isProcessing={isProcessing}
                onClearAll={handleClearResumeInventory}
                canClear={inventory.resumes.length > 0}
              />
            )}

            {/* processing: keep dialog open; show explicit parsing indicator */}
            {uploadPhase === "processing" && (
              <div
                data-testid="vault-upload-processing"
                className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-folio-sage-border bg-folio-surface-container-low px-6 py-10"
              >
                <p className="text-sm font-medium text-folio-on-surface">
                  Parsing resume…
                </p>
                <p className="text-xs text-folio-outline">
                  Files are parsed in your browser. This may take a moment.
                </p>
              </div>
            )}

            {/* done: explicit saved / partial / failed state */}
            {typeof uploadPhase === "object" && (
              <div
                data-testid="vault-upload-result"
                className="space-y-4"
              >
                {/* Saved: all parsed, no failures */}
                {uploadPhase.addedCount > 0 && uploadPhase.failedCount === 0 && (
                  <div
                    data-testid="vault-upload-saved"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                  >
                    <p className="font-medium">
                      {uploadPhase.addedCount === 1
                        ? "1 resume added to your vault."
                        : `${uploadPhase.addedCount} resumes added to your vault.`}
                    </p>
                  </div>
                )}

                {/* Partial: some parsed, some failed */}
                {uploadPhase.addedCount > 0 && uploadPhase.failedCount > 0 && (
                  <div
                    data-testid="vault-upload-partial"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  >
                    <p className="font-medium">
                      {uploadPhase.addedCount}{" "}
                      {uploadPhase.addedCount === 1 ? "resume" : "resumes"} added
                      {", "}
                      {uploadPhase.failedCount} failed to parse.
                    </p>
                    <p className="mt-0.5 text-xs">
                      Successfully parsed resumes were saved. Check the details below for failed files.
                    </p>
                  </div>
                )}

                {/* Failed: all files failed */}
                {uploadPhase.addedCount === 0 && uploadPhase.failedCount > 0 && (
                  <div
                    data-testid="vault-upload-failed"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                  >
                    <p className="font-medium">
                      {uploadPhase.failedCount === 1
                        ? "Failed to parse the file."
                        : `Failed to parse all ${uploadPhase.failedCount} files.`}
                    </p>
                    <p className="mt-0.5 text-xs">
                      Only .docx files are supported. Make sure the file is not corrupted.
                    </p>
                  </div>
                )}

                {/* No output (e.g. empty file list edge case) */}
                {uploadPhase.addedCount === 0 && uploadPhase.failedCount === 0 && (
                  <div className="rounded-lg border border-folio-sage-border bg-folio-surface-container-low px-4 py-3 text-sm text-folio-outline">
                    No changes were made to your vault.
                  </div>
                )}

                {/* Failure details */}
                {uploadPhase.newFailures.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadPhase.newFailures.map((failure, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800"
                      >
                        <span className="font-medium">{failure.filename}:</span>{" "}
                        {failure.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeImportDialog}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-folio-primary-container"
                  >
                    Done
                  </button>
                  {uploadPhase.failedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setUploadPhase("idle")}
                      className="rounded-lg border border-folio-sage-border px-4 py-2 text-sm font-medium text-folio-on-surface"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
