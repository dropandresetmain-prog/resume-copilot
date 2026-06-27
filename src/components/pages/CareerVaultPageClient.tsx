"use client";

import { useEffect, useState } from "react";
import { fetchResumeApplicationCountsFromCloud } from "@/lib/supabase/generated-resume-drafts";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
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

type VaultTab = "work" | "skills" | "education" | "additional";

const TABS: { key: VaultTab; label: string }[] = [
  { key: "work", label: "Work experience" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "additional", label: "Additional" },
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

export function CareerVaultPageClient() {
  const {
    collated,
    inventory,
    totals,
    isProcessing,
    handleSaveInventoryEdits,
    handleFilesSelected,
    handleClearResumeInventory,
  } = useWorkspace();

  const [extractionPanelOpen, setExtractionPanelOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [resumeAppCounts, setResumeAppCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchResumeApplicationCountsFromCloud()
      .then(setResumeAppCounts)
      .catch(() => {/* non-critical, leave counts at zero */});
  }, []);

  const savedEdits = inventory.edits ?? createEmptyInventoryEdits();
  const [draftEdits, setDraftEdits] = useState<InventoryEdits>(savedEdits);
  const [syncedSavedEdits, setSyncedSavedEdits] = useState<InventoryEdits>(savedEdits);
  const [activeTab, setActiveTab] = useState<VaultTab>("work");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBulletKey, setEditingBulletKey] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState("");

  // Keep draft in sync when workspace saves externally (e.g. after enrichment)
  if (!inventoryEditsEqual(syncedSavedEdits, savedEdits)) {
    setSyncedSavedEdits(savedEdits);
    setDraftEdits(savedEdits);
  }

  const hasUnsavedChanges = !inventoryEditsEqual(draftEdits, savedEdits);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function guard(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsavedChanges]);

  async function persistEdits(nextEdits: InventoryEdits) {
    setDraftEdits(nextEdits);
    await handleSaveInventoryEdits(nextEdits);
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

  const vaultPct = vaultHealthPercent(totals);
  const hint = vaultHint(totals);

  // Index accepted enrichment suggestions by bulletKey for chip display
  const enrichmentByKey = new Map<string, Array<{ id: string; issueTitle: string }>>();
  for (const s of inventory.enrichment?.suggestions ?? []) {
    if (s.status === "accepted") {
      const arr = enrichmentByKey.get(s.bulletKey) ?? [];
      arr.push({ id: s.id, issueTitle: s.issueTitle });
      enrichmentByKey.set(s.bulletKey, arr);
    }
  }

  return (
    <div className="relative max-w-[860px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            Career vault
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
      <div className="mt-4 space-y-3 pb-32">
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

                      {/* Add bullet ghost row */}
                      <button
                        type="button"
                        className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-folio-sage-border px-4 py-2.5 text-[13px] text-folio-outline transition hover:border-folio-primary-container hover:text-folio-primary-container"
                      >
                        <PlusIcon size={12} />
                        Add bullet point
                      </button>
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
      </div>

      {/* Floating action buttons — bottom right, above page edge */}
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

      {/* Inline panels rendered below content, visible when triggered */}
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

      <Dialog open={importPanelOpen} onOpenChange={setImportPanelOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import from resume</DialogTitle>
            <DialogDescription>
              Upload a DOCX resume to add it to your career vault.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <UploadCard
              onFilesSelected={(files) => {
                handleFilesSelected(files);
                setImportPanelOpen(false);
              }}
              isProcessing={isProcessing}
              onClearAll={handleClearResumeInventory}
              canClear={inventory.resumes.length > 0}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
