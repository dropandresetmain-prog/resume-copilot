"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import { SecondaryCommunicationsPanel } from "@/components/cover-letters/SecondaryCommunicationsPanel";
import { ResumePdfPreview } from "@/components/resume-drafts/ResumePdfPreview";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { buildCompanyContext } from "@/lib/company-context/build-company-context";
import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import {
  hasCoverLetterEvidenceControls,
  normalizeCoverLetterEvidenceControls,
} from "@/lib/cover-letter/evidence-controls";
import { buildCoverLetterProofEvidenceList } from "@/lib/cover-letter/proof-evidence-list";
import { buildEvidenceSpine } from "@/lib/evidence/spine";
import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
import { splitCoverLetterParagraphs } from "@/lib/cover-letter/format-body";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import { requestCoverLetterRevision } from "@/lib/cover-letter/revision-client";
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  isOverWordLimit,
} from "@/lib/cover-letter/word-limits";
import { buildCoverLetterGenerationOptions } from "@/lib/generate/build-cover-letter-options";
import {
  generateAndSaveCoverLetterDraft,
  REGENERATE_COVER_LETTER_CONFIRM,
} from "@/lib/generate/cover-letter-generation";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import { experienceKey } from "@/lib/inventory/normalize";
import { requestResumeDraftGeneration } from "@/lib/resume-draft/client";
import {
  calculateFitScore,
  type ResumeFitAssessment,
} from "@/lib/resume-draft/layout";
import { optimizeResumePreviewSettings } from "@/lib/resume-draft/preview-optimizer";
import {
  clampPreviewBodyFontPx,
  PREVIEW_BODY_FONT_MAX_PX,
  PREVIEW_BODY_FONT_MIN_PX,
  PREVIEW_BODY_FONT_STEP_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  PREVIEW_LINE_SPACING_MAX,
  PREVIEW_LINE_SPACING_MIN,
  PREVIEW_MARGIN_MAX_MM,
  PREVIEW_MARGIN_MIN_MM,
  PREVIEW_MARGIN_TOP_MAX_MM,
  PREVIEW_MARGIN_TOP_MIN_MM,
  PREVIEW_SECTION_SPACING_MAX,
  PREVIEW_SECTION_SPACING_MIN,
} from "@/lib/resume-draft/preview-settings";
import { requestResumeSingleBulletRevision } from "@/lib/resume-draft/custom-revision-client";
import { applyResumeSingleBulletRevisions } from "@/lib/resume-draft/custom-revision";
import {
  deliverExportedFile,
  exportResumeDocxFromApi,
  exportResumePdfFromApi,
} from "@/lib/resume-draft/export-client";
import {
  buildResumeDraftPayloadFromInventory,
  normalizeRegenerationControls,
  MAX_RESUME_DRAFT_BULLETS,
} from "@/lib/resume-draft/payload";
import { buildAcceptedWordingByBulletKey } from "@/lib/resume-draft/enrichment-wording";
import {
  DEFAULT_RESUME_LAYOUT_SETTINGS,
  type ResumeLayoutSettings,
} from "@/lib/resume-draft/document-model";
import {
  approveResumeDraftForExport,
  formatOnePageBlockedMessage,
  ResumePdfOnePageBlockedError,
} from "@/lib/resume-draft/approve-resume-draft-client";
import { resolveDraftStatusAfterContentEdit } from "@/lib/resume-draft/apply-evidence-changes";
import {
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
  RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
  RESUME_DRAFT_STATUS_NEEDS_REVIEW,
} from "@/lib/resume-draft/draft-status";
import { areExportLayoutSettingsEqual } from "@/lib/resume-draft/export-layout-settings";
import {
  buildExportResumeDocumentModel,
  findReferenceResumeInInventory,
} from "@/lib/resume-draft/build-export-document-model";
import {
  applyResumeBatchRevision,
} from "@/lib/resume-draft/custom-revision-batch";
import { requestResumeBatchRevision } from "@/lib/resume-draft/custom-revision-client";
import {
  resolveResumeModelTierForDraft,
  writeStoredResumeModelTier,
} from "@/lib/ai/model-tier-storage";
import type { ModelTier } from "@/lib/ai/model-tiers";
import {
  buildPackageFitSummary,
  fitScoreToVerdict,
  PACKAGE_FIT_SUMMARY_UNAVAILABLE,
} from "@/lib/package/fit-summary";
import { buildPackageTailoringDiagnostics } from "@/lib/package/tailoring-diagnostics";
import { getApplicationRecordFromCloud } from "@/lib/supabase/application-records";
import {
  findCoverLetterDraftByResumeDraftId,
  updateGeneratedCoverLetterDraftInCloud,
} from "@/lib/supabase/generated-cover-letter-drafts";
import {
  getGeneratedResumeDraftFromCloud,
  updateGeneratedResumeDraftInCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { CollatedExperience } from "@/types/collated";
import type { CompanyContext } from "@/types/company-context";
import type {
  CoverLetterEvidenceControls,
  CoverLetterRevisionAction,
  GeneratedCoverLetterDraftRecord,
} from "@/types/cover-letter-draft";
import type { StoredJobDescription } from "@/types/jd";
import type {
  GeneratedResumeDraftRecord,
  ResumeDraftConfidence,
  ResumeDraftContent,
  ResumeDraftExperienceSection,
  ResumeRevisionQueueItem,
  ResumeSingleBulletRevisionTarget,
} from "@/types/resume-draft";

type OutputEditorPageClientProps = {
  draftId: string;
};

type OutputTab = "resume" | "cover-letter";

// ── Small presentational helpers ─────────────────────────────────────────────

function RefreshIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
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

function ToggleSwitch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ${
        on ? "bg-folio-primary-container" : "bg-folio-outline-variant"
      }`}
    >
      <span
        className={`mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Confidence → human relevance label for the AI rationale chip. */
function relevanceLabel(confidence: ResumeDraftConfidence): string {
  if (confidence === "high") return "High relevance";
  if (confidence === "medium") return "Medium relevance";
  return "Supporting evidence";
}

function RationaleChip({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-folio-mint-surface text-folio-olive-text">
      {text}
    </span>
  );
}

// ── Experience toggle card ────────────────────────────────────────────────────

function ExperienceToggleCard({
  company,
  role,
  chips,
  on,
  onToggle,
}: {
  company: string;
  role: string;
  chips: string[];
  on: boolean;
  onToggle: () => void;
}) {
  const initials = company
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-start gap-3 rounded-xl border border-folio-sage-border bg-white p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold bg-folio-mint-surface text-folio-sidebar">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-folio-on-surface">
          <span className="text-folio-outline">{company}</span> · {role}
        </p>
        {chips.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <RationaleChip key={chip} text={chip} />
            ))}
          </div>
        ) : null}
      </div>
      <ToggleSwitch on={on} onToggle={onToggle} label={`${company} ${role}`} />
    </div>
  );
}

// ── Editable resume document (Text view, left panel) ──────────────────────────
// Renders the resume and provides in-context editing:
//  • each experience bullet is selectable → Edit / Replace / Remove
//  • Edit (inline textarea) and Remove are immediate content edits (M5a invalidation)
//  • Replace stages the bullet; staged bullets regenerate together in ONE AI call,
//    preview → accept (single_bullet revision scope)
//  • header / summary / skills / education / additional / role details each get a
//    section-level inline Edit reveal reusing the structured mutators

const SECTION_HEADING_CLASS =
  "border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar";

const SECTION_EDIT_LINK_CLASS =
  "text-[12px] font-medium text-folio-primary-container hover:underline focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function bulletStageKey(roleIndex: number, bulletIndex: number): string {
  return `${roleIndex}:${bulletIndex}`;
}

type ResumeTextDocumentProps = {
  draft: GeneratedResumeDraftRecord;
  linkedJob: StoredJobDescription | null;
  /** Persists an edited content with the M5a invalidation path (downgrades approval). */
  onApplyContentEdit: (next: ResumeDraftContent) => Promise<void>;
  /** Page-level busy flag (regenerate/approve) — disables in-document mutations. */
  disabled: boolean;
};

function ResumeTextDocument({
  draft,
  linkedJob,
  onApplyContentEdit,
  disabled,
}: ResumeTextDocumentProps) {
  const content = draft.content;
  const header = content.header;
  const contactLine = [header.location, header.email, header.phone, header.linkedin]
    .filter(Boolean)
    .join("  ·  ");

  // Which section is open in inline edit mode; the working copy is held separately.
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<ResumeDraftContent | null>(null);
  const [isSavingSection, setIsSavingSection] = useState(false);

  // Inline per-bullet edit state.
  const [editingBulletKey, setEditingBulletKey] = useState<string | null>(null);
  const [bulletEditText, setBulletEditText] = useState("");
  const [selectedBulletKey, setSelectedBulletKey] = useState<string | null>(null);
  const [busyBulletKey, setBusyBulletKey] = useState<string | null>(null);

  // Replace staging — keyed by roleIndex:bulletIndex → optional per-bullet instruction.
  const [stagedReplace, setStagedReplace] = useState<Map<string, string>>(new Map());
  const [replacePreview, setReplacePreview] = useState<
    { roleIndex: number; bulletIndex: number; text: string }[] | null
  >(null);
  const [replaceWarnings, setReplaceWarnings] = useState<string[]>([]);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const hasJob = Boolean(linkedJob?.rawText?.trim());
  const modelTier = useMemo(
    () => resolveResumeModelTierForDraft({ draftTier: draft.inputSnapshot?.resumeModelTier }),
    [draft.inputSnapshot?.resumeModelTier],
  );

  function openSection(section: string) {
    setSectionDraft(content);
    setEditingSection(section);
    setDocError(null);
  }

  function closeSection() {
    setEditingSection(null);
    setSectionDraft(null);
  }

  async function saveSection() {
    if (!sectionDraft || isSavingSection) return;
    setIsSavingSection(true);
    setDocError(null);
    try {
      await onApplyContentEdit(sectionDraft);
      closeSection();
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSavingSection(false);
    }
  }

  function patchSection(updater: (current: ResumeDraftContent) => ResumeDraftContent) {
    setSectionDraft((current) => (current ? updater(current) : current));
  }

  function startBulletEdit(roleIndex: number, bulletIndex: number, currentText: string) {
    setEditingBulletKey(bulletStageKey(roleIndex, bulletIndex));
    setBulletEditText(currentText);
    setDocError(null);
  }

  async function saveBulletEdit(roleIndex: number, bulletIndex: number) {
    const key = bulletStageKey(roleIndex, bulletIndex);
    if (busyBulletKey) return;
    const text = bulletEditText.trim();
    if (!text) {
      setDocError("Bullet text cannot be empty.");
      return;
    }
    setBusyBulletKey(key);
    setDocError(null);
    try {
      const next: ResumeDraftContent = {
        ...content,
        experience: content.experience.map((role, ri) =>
          ri === roleIndex
            ? {
                ...role,
                bullets: role.bullets.map((b, bi) =>
                  bi === bulletIndex ? { ...b, text } : b,
                ),
              }
            : role,
        ),
      };
      await onApplyContentEdit(next);
      setEditingBulletKey(null);
      setSelectedBulletKey(null);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Failed to save bullet.");
    } finally {
      setBusyBulletKey(null);
    }
  }

  async function removeBullet(roleIndex: number, bulletIndex: number) {
    const key = bulletStageKey(roleIndex, bulletIndex);
    if (busyBulletKey) return;
    setBusyBulletKey(key);
    setDocError(null);
    try {
      const next: ResumeDraftContent = {
        ...content,
        experience: content.experience.map((role, ri) =>
          ri === roleIndex
            ? { ...role, bullets: role.bullets.filter((_, bi) => bi !== bulletIndex) }
            : role,
        ),
      };
      await onApplyContentEdit(next);
      // Drop any staging that referenced the removed bullet.
      setStagedReplace((prev) => {
        const nextMap = new Map(prev);
        nextMap.delete(key);
        return nextMap;
      });
      setSelectedBulletKey(null);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Failed to remove bullet.");
    } finally {
      setBusyBulletKey(null);
    }
  }

  function toggleStageReplace(roleIndex: number, bulletIndex: number) {
    const key = bulletStageKey(roleIndex, bulletIndex);
    setStagedReplace((prev) => {
      const nextMap = new Map(prev);
      if (nextMap.has(key)) nextMap.delete(key);
      else nextMap.set(key, "");
      return nextMap;
    });
    setReplacePreview(null);
    setReplaceError(null);
  }

  function setStageInstruction(key: string, instruction: string) {
    setStagedReplace((prev) => {
      const nextMap = new Map(prev);
      if (nextMap.has(key)) nextMap.set(key, instruction);
      return nextMap;
    });
    setReplacePreview(null);
  }

  async function runReplaceRegeneration() {
    if (isReplacing || stagedReplace.size === 0 || !linkedJob) return;
    const targets: ResumeSingleBulletRevisionTarget[] = [];
    for (const [key, instruction] of stagedReplace.entries()) {
      const [ri, bi] = key.split(":").map(Number);
      const currentText = content.experience[ri]?.bullets[bi]?.text;
      if (typeof currentText !== "string") continue;
      targets.push({
        roleIndex: ri,
        bulletIndex: bi,
        currentText,
        customInstruction: instruction.trim() || undefined,
      });
    }
    if (targets.length === 0) return;

    setIsReplacing(true);
    setReplaceError(null);
    setReplacePreview(null);
    try {
      const response = await requestResumeSingleBulletRevision({
        draftId: draft.id,
        scope: "single_bullet",
        content,
        jobDescription: {
          id: linkedJob.id,
          rawText: linkedJob.rawText,
          companyName: linkedJob.companyName,
          roleTitle: linkedJob.roleTitle,
        },
        bullets: targets,
        resumeModelTier: modelTier,
        persist: false,
      });
      setReplacePreview(response.bulletCandidates);
      setReplaceWarnings(response.warnings);
    } catch (err) {
      setReplaceError(err instanceof Error ? err.message : "Single-bullet revision failed.");
    } finally {
      setIsReplacing(false);
    }
  }

  async function acceptReplacePreview() {
    if (!replacePreview || isReplacing) return;
    setIsReplacing(true);
    setReplaceError(null);
    try {
      const next = applyResumeSingleBulletRevisions(content, replacePreview);
      await onApplyContentEdit(next);
      setReplacePreview(null);
      setReplaceWarnings([]);
      setStagedReplace(new Map());
      setSelectedBulletKey(null);
    } catch (err) {
      setReplaceError(err instanceof Error ? err.message : "Failed to save revised bullets.");
    } finally {
      setIsReplacing(false);
    }
  }

  function rejectReplacePreview() {
    setReplacePreview(null);
    setReplaceWarnings([]);
  }

  const previewByKey = new Map(
    (replacePreview ?? []).map((c) => [bulletStageKey(c.roleIndex, c.bulletIndex), c.text]),
  );
  const docDisabled = disabled || isReplacing;

  return (
    <div className="text-folio-on-surface" data-testid="resume-text-document">
      {docError ? (
        <p className="mb-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-[13px] text-folio-error">
          {docError}
        </p>
      ) : null}

      {/* Header */}
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-center">
            {header.fullName ? (
              <h2 className="text-2xl font-semibold tracking-tight">{header.fullName}</h2>
            ) : null}
            {contactLine ? (
              <p className="mt-1.5 text-xs text-folio-outline">{contactLine}</p>
            ) : null}
          </div>
          {editingSection !== "header" ? (
            <button
              type="button"
              onClick={() => openSection("header")}
              disabled={docDisabled}
              className={SECTION_EDIT_LINK_CLASS}
              data-testid="section-edit-header"
            >
              Edit
            </button>
          ) : null}
        </div>
        {editingSection === "header" && sectionDraft ? (
          <div className="mt-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { field: "fullName", label: "Full name" },
                  { field: "email", label: "Email" },
                  { field: "phone", label: "Phone" },
                  { field: "location", label: "Location" },
                  { field: "linkedin", label: "LinkedIn" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field}>
                  <label className={LABEL_CLASS}>{label}</label>
                  <input
                    type="text"
                    value={(sectionDraft.header[field] as string | undefined) ?? ""}
                    onChange={(e) =>
                      patchSection((c) => ({
                        ...c,
                        header: { ...c.header, [field]: e.target.value },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              ))}
            </div>
            <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
          </div>
        ) : null}
      </header>

      {/* Professional summary — heading omitted; it is the opening block of the resume */}
      {content.professionalSummary.text !== undefined ? (
        <section className="mt-6">
          <div className="flex items-center justify-end">
            {editingSection !== "summary" ? (
              <button
                type="button"
                onClick={() => openSection("summary")}
                disabled={docDisabled}
                className={SECTION_EDIT_LINK_CLASS}
                data-testid="section-edit-summary"
              >
                Edit
              </button>
            ) : null}
          </div>
          {editingSection === "summary" && sectionDraft ? (
            <div className="mt-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
              <textarea
                value={sectionDraft.professionalSummary.text ?? ""}
                onChange={(e) =>
                  patchSection((c) => ({
                    ...c,
                    professionalSummary: { ...c.professionalSummary, text: e.target.value },
                  }))
                }
                rows={3}
                className={TEXTAREA_CLASS}
              />
              <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
            </div>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-folio-on-surface-variant">
              {content.professionalSummary.text}
            </p>
          )}
        </section>
      ) : null}

      {/* Experience */}
      {content.experience.length > 0 ? (
        <section className="mt-6">
          <h3 className={SECTION_HEADING_CLASS}>Experience</h3>
          <div className="mt-3 space-y-4">
            {content.experience.map((exp, roleIndex) => {
              const meta = [exp.location, exp.dateRange].filter(Boolean).join(" · ");
              const roleEditKey = `role:${roleIndex}`;
              const isEditingRole = editingSection === roleEditKey;
              return (
                <div key={`${exp.company}-${exp.role}-${roleIndex}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold">
                      {exp.role}
                      <span className="font-normal text-folio-on-surface-variant"> · {exp.company}</span>
                    </p>
                    <div className="flex items-center gap-3">
                      {meta ? <p className="text-xs text-folio-outline">{meta}</p> : null}
                      {!isEditingRole ? (
                        <button
                          type="button"
                          onClick={() => openSection(roleEditKey)}
                          disabled={docDisabled}
                          className={SECTION_EDIT_LINK_CLASS}
                        >
                          Edit details
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isEditingRole && sectionDraft ? (
                    <div className="mt-2 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { field: "role", label: "Role" },
                            { field: "company", label: "Company" },
                            { field: "location", label: "Location" },
                            { field: "dateRange", label: "Date range" },
                          ] as const
                        ).map(({ field, label }) => (
                          <div key={field}>
                            <label className={LABEL_CLASS}>{label}</label>
                            <input
                              type="text"
                              value={(sectionDraft.experience[roleIndex]?.[field] as string | undefined) ?? ""}
                              onChange={(e) =>
                                patchSection((c) => ({
                                  ...c,
                                  experience: c.experience.map((r, ri) =>
                                    ri === roleIndex ? { ...r, [field]: e.target.value } : r,
                                  ),
                                }))
                              }
                              className={INPUT_CLASS}
                            />
                          </div>
                        ))}
                      </div>
                      <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
                    </div>
                  ) : null}

                  {exp.bullets.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.map((b, bulletIndex) => {
                        const key = bulletStageKey(roleIndex, bulletIndex);
                        const isSelected = selectedBulletKey === key;
                        const isEditing = editingBulletKey === key;
                        const isStaged = stagedReplace.has(key);
                        const proposed = previewByKey.get(key);
                        const bulletBusy = busyBulletKey === key;
                        return (
                          <li key={bulletIndex} data-testid="resume-bullet">
                            {isEditing ? (
                              <div className="rounded-lg border border-folio-sage-border bg-folio-surface-container-low p-3">
                                <textarea
                                  value={bulletEditText}
                                  onChange={(e) => setBulletEditText(e.target.value)}
                                  rows={2}
                                  className={TEXTAREA_CLASS}
                                  data-testid="bullet-edit-textarea"
                                  autoFocus
                                />
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void saveBulletEdit(roleIndex, bulletIndex)}
                                    disabled={bulletBusy}
                                    className={PRIMARY_BUTTON}
                                    data-testid="bullet-edit-save"
                                  >
                                    {bulletBusy ? "Saving…" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBulletKey(null)}
                                    disabled={bulletBusy}
                                    className={GHOST_BUTTON}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`rounded-lg border px-2.5 py-1.5 transition ${
                                  isStaged
                                    ? "border-folio-olive-border bg-folio-mint-surface"
                                    : isSelected
                                      ? "border-folio-primary-container bg-folio-surface-container-low"
                                      : "border-transparent hover:bg-folio-surface-container-low"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedBulletKey(isSelected ? null : key)}
                                  className="flex w-full gap-2 text-left text-[13px] leading-relaxed focus:outline-none"
                                  aria-expanded={isSelected}
                                  data-testid="bullet-select"
                                >
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-folio-outline" />
                                  <span>{b.text}</span>
                                </button>

                                {isStaged ? (
                                  <p className="mt-1 pl-3 text-[11px] font-medium text-folio-olive-text">
                                    Staged to replace
                                    {proposed ? " — proposed below" : ""}
                                  </p>
                                ) : null}

                                {proposed ? (
                                  <p
                                    className="mt-1 rounded-md border border-folio-olive-border bg-white px-2.5 py-1.5 text-[13px] leading-relaxed text-folio-on-surface"
                                    data-testid="bullet-replace-proposed"
                                  >
                                    {proposed}
                                  </p>
                                ) : null}

                                {isSelected ? (
                                  <div className="mt-2 flex flex-wrap gap-2 pl-3" data-testid="bullet-actions">
                                    <button
                                      type="button"
                                      onClick={() => startBulletEdit(roleIndex, bulletIndex, b.text)}
                                      disabled={docDisabled || bulletBusy}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-edit"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleStageReplace(roleIndex, bulletIndex)}
                                      disabled={docDisabled || bulletBusy || !hasJob}
                                      title={hasJob ? undefined : "Saved job description required to regenerate"}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-replace"
                                    >
                                      {isStaged ? "Unstage replace" : "Replace"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void removeBullet(roleIndex, bulletIndex)}
                                      disabled={docDisabled || bulletBusy}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-remove"
                                    >
                                      {bulletBusy ? "Removing…" : "Remove"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Replace staging bar — one AI call regenerates all staged bullets together */}
          {stagedReplace.size > 0 ? (
            <div
              className="mt-4 rounded-xl border border-folio-olive-border bg-folio-mint-surface p-4"
              data-testid="bullet-replace-staging"
            >
              <p className="text-[13px] font-medium text-folio-olive-text">
                {stagedReplace.size} bullet{stagedReplace.size === 1 ? "" : "s"} staged to replace
              </p>
              <p className="mt-0.5 text-[12px] text-folio-olive-text">
                Add an optional instruction per bullet. They regenerate together in one AI step.
              </p>
              <ul className="mt-3 space-y-2">
                {[...stagedReplace.entries()].map(([key, instruction]) => {
                  const [ri, bi] = key.split(":").map(Number);
                  const currentText = content.experience[ri]?.bullets[bi]?.text ?? "";
                  return (
                    <li key={key} className="rounded-lg border border-folio-sage-border bg-white p-3">
                      <p className="text-[12px] text-folio-on-surface-variant">{currentText}</p>
                      <input
                        type="text"
                        value={instruction}
                        onChange={(e) => setStageInstruction(key, e.target.value)}
                        placeholder="Optional instruction (e.g. more metrics-focused)"
                        className={`${INPUT_CLASS} mt-2`}
                        data-testid="bullet-replace-instruction"
                      />
                    </li>
                  );
                })}
              </ul>

              {replaceWarnings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[12px] text-folio-cta-secondary">
                  {replaceWarnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              ) : null}

              {replaceError ? (
                <p className="mt-2 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-[13px] text-folio-error">
                  {replaceError}
                </p>
              ) : null}

              {isApprovedDraftStatus(draft.status) && replacePreview ? (
                <p className="mt-2 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary">
                  Accepting will require re-approval before export.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {!replacePreview ? (
                  <button
                    type="button"
                    onClick={() => void runReplaceRegeneration()}
                    disabled={isReplacing || !hasJob}
                    className={PRIMARY_BUTTON}
                    data-testid="bullet-replace-regenerate"
                  >
                    {isReplacing
                      ? "Regenerating… (1 AI step)"
                      : `Regenerate ${stagedReplace.size} staged bullet${stagedReplace.size === 1 ? "" : "s"}`}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void acceptReplacePreview()}
                      disabled={isReplacing}
                      className={PRIMARY_BUTTON}
                      data-testid="bullet-replace-accept"
                    >
                      {isReplacing ? "Saving…" : "Accept replacements"}
                    </button>
                    <button
                      type="button"
                      onClick={rejectReplacePreview}
                      disabled={isReplacing}
                      className={GHOST_BUTTON}
                      data-testid="bullet-replace-reject"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStagedReplace(new Map());
                    setReplacePreview(null);
                    setReplaceError(null);
                  }}
                  disabled={isReplacing}
                  className={GHOST_BUTTON}
                >
                  Clear staging
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Skills */}
      {content.skills.groups.length > 0 || editingSection === "skills" ? (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className={SECTION_HEADING_CLASS}>Skills</h3>
            {editingSection !== "skills" ? (
              <button
                type="button"
                onClick={() => openSection("skills")}
                disabled={docDisabled}
                className={SECTION_EDIT_LINK_CLASS}
                data-testid="section-edit-skills"
              >
                Edit
              </button>
            ) : null}
          </div>
          {editingSection === "skills" && sectionDraft ? (
            <div className="mt-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4 space-y-2.5">
              {sectionDraft.skills.groups.map((group, groupIdx) => (
                <div key={groupIdx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={group.label}
                      onChange={(e) =>
                        patchSection((c) => ({
                          ...c,
                          skills: {
                            ...c.skills,
                            groups: c.skills.groups.map((g, i) =>
                              i === groupIdx ? { ...g, label: e.target.value } : g,
                            ),
                          },
                        }))
                      }
                      placeholder="Group label"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={group.items.join(", ")}
                      onChange={(e) =>
                        patchSection((c) => ({
                          ...c,
                          skills: {
                            ...c.skills,
                            groups: c.skills.groups.map((g, i) =>
                              i === groupIdx
                                ? { ...g, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                                : g,
                            ),
                          },
                        }))
                      }
                      placeholder="Item 1, Item 2"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchSection((c) => ({
                        ...c,
                        skills: { ...c.skills, groups: c.skills.groups.filter((_, i) => i !== groupIdx) },
                      }))
                    }
                    className={`mt-1 ${REMOVE_BULLET_CLASS}`}
                    aria-label="Remove skill group"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchSection((c) => ({
                    ...c,
                    skills: { ...c.skills, groups: [...c.skills.groups, { label: "", items: [] }] },
                  }))
                }
                className={ADD_BULLET_CLASS}
              >
                + Add skill group
              </button>
              <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
            </div>
          ) : (
            <dl className="mt-3 space-y-1.5">
              {content.skills.groups.map((group) => (
                <div key={group.label} className="flex gap-2 text-[13px]">
                  <dt className="font-semibold">{group.label}:</dt>
                  <dd className="text-folio-on-surface-variant">{group.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : null}

      {/* Education */}
      {content.education.length > 0 ? (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className={SECTION_HEADING_CLASS}>Education</h3>
            {editingSection !== "education" ? (
              <button
                type="button"
                onClick={() => openSection("education")}
                disabled={docDisabled}
                className={SECTION_EDIT_LINK_CLASS}
                data-testid="section-edit-education"
              >
                Edit
              </button>
            ) : null}
          </div>
          {editingSection === "education" && sectionDraft ? (
            <div className="mt-3 space-y-4">
              {sectionDraft.education.map((edu, eduIdx) => (
                <div key={eduIdx} className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>Institution</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) =>
                          patchSection((c) => ({
                            ...c,
                            education: c.education.map((ed, i) =>
                              i === eduIdx ? { ...ed, institution: e.target.value } : ed,
                            ),
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Location</label>
                      <input
                        type="text"
                        value={edu.location ?? ""}
                        onChange={(e) =>
                          patchSection((c) => ({
                            ...c,
                            education: c.education.map((ed, i) =>
                              i === eduIdx ? { ...ed, location: e.target.value } : ed,
                            ),
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Date range</label>
                      <input
                        type="text"
                        value={edu.dateRange ?? ""}
                        onChange={(e) =>
                          patchSection((c) => ({
                            ...c,
                            education: c.education.map((ed, i) =>
                              i === eduIdx ? { ...ed, dateRange: e.target.value } : ed,
                            ),
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {content.education.map((edu, i) => {
                const meta = [edu.location, edu.dateRange].filter(Boolean).join(" · ");
                return (
                  <div key={`${edu.institution}-${i}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-semibold">{edu.institution}</p>
                      {meta ? <p className="text-xs text-folio-outline">{meta}</p> : null}
                    </div>
                    {edu.programmes.length > 0 ? (
                      <p className="text-[13px] text-folio-on-surface-variant">{edu.programmes.join(", ")}</p>
                    ) : null}
                    {edu.bullets.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {edu.bullets.map((b, bi) => (
                          <li key={bi} className="flex gap-2 text-[13px] leading-relaxed">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-folio-outline" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Additional experience */}
      {content.additionalExperience.length > 0 || editingSection === "additional" ? (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className={SECTION_HEADING_CLASS}>Additional experience</h3>
            {editingSection !== "additional" ? (
              <button
                type="button"
                onClick={() => openSection("additional")}
                disabled={docDisabled}
                className={SECTION_EDIT_LINK_CLASS}
                data-testid="section-edit-additional"
              >
                Edit
              </button>
            ) : null}
          </div>
          {editingSection === "additional" && sectionDraft ? (
            <div className="mt-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4 space-y-2.5">
              {sectionDraft.additionalExperience.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={item.category ?? ""}
                      onChange={(e) =>
                        patchSection((c) => ({
                          ...c,
                          additionalExperience: c.additionalExperience.map((it, i) =>
                            i === idx ? { ...it, category: e.target.value } : it,
                          ),
                        }))
                      }
                      placeholder="Category (optional)"
                      className={INPUT_CLASS}
                    />
                    <textarea
                      value={item.text}
                      onChange={(e) =>
                        patchSection((c) => ({
                          ...c,
                          additionalExperience: c.additionalExperience.map((it, i) =>
                            i === idx ? { ...it, text: e.target.value } : it,
                          ),
                        }))
                      }
                      rows={2}
                      placeholder="Description"
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchSection((c) => ({
                        ...c,
                        additionalExperience: c.additionalExperience.filter((_, i) => i !== idx),
                      }))
                    }
                    className={`mt-1 ${REMOVE_BULLET_CLASS}`}
                    aria-label="Remove additional experience item"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchSection((c) => ({
                    ...c,
                    additionalExperience: [
                      ...c.additionalExperience,
                      { category: "", text: "", riskFlags: [] },
                    ],
                  }))
                }
                className={ADD_BULLET_CLASS}
              >
                + Add item
              </button>
              <SectionEditActions onSave={() => void saveSection()} onCancel={closeSection} saving={isSavingSection} />
            </div>
          ) : (
            <ul className="mt-3 space-y-1">
              {content.additionalExperience.map((item, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-folio-outline" />
                  <span>
                    {item.category ? <span className="font-semibold">{item.category}: </span> : null}
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function SectionEditActions({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={PRIMARY_BUTTON}
        data-testid="section-edit-save"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} disabled={saving} className={GHOST_BUTTON}>
        Cancel
      </button>
    </div>
  );
}

// ── Shared form-field styles (used by inline section editors) ─────────────────

const INPUT_CLASS =
  "w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none resize-none";

const LABEL_CLASS = "block text-[12px] font-medium text-folio-outline mb-1";

const ADD_BULLET_CLASS =
  "mt-1.5 text-[12px] font-medium text-folio-primary-container hover:underline focus:outline-none";

const REMOVE_BULLET_CLASS =
  "ml-2 shrink-0 text-[11px] text-folio-outline hover:text-folio-error focus:outline-none";


// ── Revision queue (Folio-native) ─────────────────────────────────────────────

const MODEL_TIER_LABELS: Record<ModelTier, string> = {
  standard: "Standard",
  enhanced: "Enhanced",
  premium: "Premium",
};

function createQueueItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type ResumeRevisionQueueProps = {
  draft: GeneratedResumeDraftRecord;
  linkedJob: StoredJobDescription | null;
  onAccepted: (updatedContent: ResumeDraftContent, warnings: string[]) => Promise<void>;
};

function ResumeRevisionQueue({ draft, linkedJob, onAccepted }: ResumeRevisionQueueProps) {
  const [scope, setScope] = useState<"professional_summary" | "selected_role">("selected_role");
  const [roleIndex, setRoleIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [queue, setQueue] = useState<ResumeRevisionQueueItem[]>([]);
  const [isRevising, setIsRevising] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [pendingContent, setPendingContent] = useState<ResumeDraftContent | null>(null);
  const [pendingWarnings, setPendingWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<ModelTier>(() =>
    resolveResumeModelTierForDraft({ draftTier: draft.inputSnapshot?.resumeModelTier }),
  );

  const hasJob = Boolean(linkedJob?.rawText?.trim());
  const summaryAvailable = Boolean(draft.content.professionalSummary.text?.trim());
  const summaryQueued = queue.some((q) => q.scope === "professional_summary");

  const canAdd =
    instruction.trim().length > 0 &&
    hasJob &&
    (scope === "selected_role"
      ? draft.content.experience.length > 0
      : summaryAvailable && !summaryQueued);

  const canRevise = queue.length > 0 && hasJob;

  function handleAdd() {
    if (!canAdd) return;
    const item: ResumeRevisionQueueItem =
      scope === "professional_summary"
        ? { id: createQueueItemId(), scope, customInstruction: instruction.trim() }
        : { id: createQueueItemId(), scope, roleIndex, customInstruction: instruction.trim() };
    setQueue((prev) => [...prev, item]);
    setInstruction("");
    setPendingContent(null);
    setSavedFeedback(null);
    setError(null);
  }

  function handleRemove(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
    setPendingContent(null);
  }

  async function handleRevise() {
    if (!canRevise || isRevising || !linkedJob) return;
    setIsRevising(true);
    setError(null);
    setPendingContent(null);
    setPendingWarnings([]);
    setSavedFeedback(null);
    try {
      const response = await requestResumeBatchRevision({
        draftId: draft.id,
        queue,
        content: draft.content,
        jobDescription: {
          id: linkedJob.id,
          rawText: linkedJob.rawText,
          companyName: linkedJob.companyName,
          roleTitle: linkedJob.roleTitle,
        },
        resumeModelTier: modelTier,
        persist: false,
      });

      const candidate = applyResumeBatchRevision(draft.content, {
        summaryText: response.summaryCandidate?.text,
        roleUpdates: response.roleCandidates.map((c) => ({
          roleIndex: c.roleIndex,
          bullets: c.bullets,
        })),
        warnings: response.warnings,
      });
      setPendingContent(candidate);
      setPendingWarnings(response.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setIsRevising(false);
    }
  }

  async function handleAccept() {
    if (!pendingContent || isAccepting) return;
    setIsAccepting(true);
    setError(null);
    try {
      await onAccepted(pendingContent, pendingWarnings);
      setSavedFeedback("Revision saved.");
      setPendingContent(null);
      setPendingWarnings([]);
      setQueue([]);
      setInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save revision.");
    } finally {
      setIsAccepting(false);
    }
  }

  function handleReject() {
    setPendingContent(null);
    setPendingWarnings([]);
    setSavedFeedback(null);
  }

  // Compute preview diff for display
  const previewSummaryChanged =
    pendingContent &&
    pendingContent.professionalSummary.text !== draft.content.professionalSummary.text;

  const previewRoleChanges =
    pendingContent?.experience
          .map((role, idx) => {
            const prior = draft.content.experience[idx];
            if (!prior || JSON.stringify(prior.bullets) === JSON.stringify(role.bullets)) return null;
            return { idx, role, prior };
          })
          .filter((e): e is NonNullable<typeof e> => e !== null) ?? [];

  return (
    <div data-testid="resume-revision-queue-panel">
      {/* Model tier selector */}
      <div className="mb-3">
        <label className="block text-[12px] font-medium text-folio-outline mb-1">
          AI model
        </label>
        <select
          value={modelTier}
          onChange={(e) => {
            const tier = e.target.value as ModelTier;
            setModelTier(tier);
            writeStoredResumeModelTier(tier);
          }}
          className="w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface focus:border-folio-primary-container focus:outline-none"
          data-testid="revision-queue-model-tier"
        >
          {(Object.entries(MODEL_TIER_LABELS) as [ModelTier, string][]).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Scope + role selectors */}
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div>
          <label className="block text-[12px] font-medium text-folio-outline mb-1">
            Scope
          </label>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as "professional_summary" | "selected_role");
              setPendingContent(null);
            }}
            className="w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface focus:border-folio-primary-container focus:outline-none"
            data-testid="revision-queue-scope"
          >
            {summaryAvailable ? (
              <option value="professional_summary">Professional summary</option>
            ) : null}
            <option value="selected_role">Selected role</option>
          </select>
          {scope === "professional_summary" && summaryQueued ? (
            <p className="mt-1 text-[11px] text-folio-outline">
              Summary already queued — remove it first to re-queue.
            </p>
          ) : null}
        </div>

        {scope === "selected_role" ? (
          <div>
            <label className="block text-[12px] font-medium text-folio-outline mb-1">
              Role
            </label>
            <select
              value={roleIndex}
              onChange={(e) => {
                setRoleIndex(Number(e.target.value));
                setPendingContent(null);
              }}
              className="w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface focus:border-folio-primary-container focus:outline-none"
              data-testid="revision-queue-role"
            >
              {draft.content.experience.map((exp, i) => (
                <option key={i} value={i}>
                  {exp.role} · {exp.company}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Instruction textarea */}
      <div className="mb-3">
        <label className="block text-[12px] font-medium text-folio-outline mb-1">
          Instructions
        </label>
        <textarea
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value);
            setPendingContent(null);
          }}
          rows={3}
          placeholder='e.g. "Make bullets more metrics-focused."'
          className="w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none resize-none"
          data-testid="revision-queue-instruction"
        />
        <p className="mt-1 text-[11px] text-folio-outline">
          Staging never calls AI — only &ldquo;Revise selected sections&rdquo; does.
        </p>
      </div>

      {!hasJob ? (
        <p className="mb-3 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[13px] text-folio-cta-secondary">
          Job description required for scoped revision.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canAdd}
        onClick={handleAdd}
        className={GHOST_BUTTON}
        data-testid="revision-queue-add"
      >
        Add to queue
      </button>

      {/* Queue list */}
      {queue.length > 0 ? (
        <div
          className="mt-3 rounded-xl border border-folio-sage-border bg-white p-3"
          data-testid="revision-queue-list"
        >
          <p className="text-[12px] font-medium uppercase tracking-wide text-folio-outline">
            Revision queue ({queue.length})
          </p>
          <ul className="mt-2 space-y-2">
            {queue.map((item) => {
              const label =
                item.scope === "professional_summary"
                  ? "Professional summary"
                  : `${draft.content.experience[item.roleIndex]?.role ?? ""} · ${draft.content.experience[item.roleIndex]?.company ?? ""}`;
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-folio-sage-border bg-folio-surface-container-low px-3 py-2 text-[13px]"
                  data-testid="revision-queue-item"
                >
                  <div>
                    <p className="font-medium text-folio-on-surface">{label}</p>
                    <p className="mt-0.5 text-folio-outline">{item.customInstruction}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 text-[11px] text-folio-outline hover:text-folio-error focus:outline-none"
                    data-testid="revision-queue-remove"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canRevise || isRevising}
        onClick={() => void handleRevise()}
        aria-busy={isRevising}
        className={`mt-3 w-full ${PRIMARY_BUTTON}`}
        data-testid="revision-queue-revise"
      >
        {isRevising ? "Revising… (1 AI step)" : "Revise selected sections"}
      </button>
      <p className="mt-1 text-[11px] text-folio-outline">
        Runs 1 AI step. Preview before accepting.
      </p>

      {/* Pending revision preview */}
      {pendingContent ? (
        <div
          className="mt-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4"
          data-testid="revision-queue-preview"
        >
          <p className="text-[13px] font-medium text-folio-on-surface">Revised draft preview</p>
          <p className="mt-0.5 text-[12px] text-folio-outline">
            Accept all saves the proposed changes. Reject all keeps the current version.
          </p>
          <div className="mt-3 max-h-60 space-y-3 overflow-y-auto rounded-lg border border-folio-sage-border bg-white p-3 text-[13px]">
            {previewSummaryChanged ? (
              <div data-testid="revision-preview-summary">
                <p className="font-medium text-folio-on-surface">Professional summary</p>
                <p className="mt-1 whitespace-pre-wrap text-folio-on-surface-variant">
                  {pendingContent.professionalSummary.text}
                </p>
              </div>
            ) : null}
            {previewRoleChanges.map((change) => (
              <div key={change.idx} data-testid="revision-preview-role">
                <p className="font-medium text-folio-on-surface">
                  {change.role.role} · {change.role.company}
                </p>
                <ul className="mt-1.5 space-y-1 pl-3">
                  {change.role.bullets.map((b, bi) => (
                    <li key={bi} className="flex gap-2 text-folio-on-surface-variant">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-folio-outline" />
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!previewSummaryChanged && previewRoleChanges.length === 0 ? (
              <p className="text-folio-outline">No visible changes proposed.</p>
            ) : null}
          </div>

          {pendingWarnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[12px] text-folio-cta-secondary">
              {pendingWarnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}

          {isApprovedDraftStatus(draft.status) ? (
            <p className="mt-3 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary">
              Accepting will require re-approval before export.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={isAccepting}
              className={PRIMARY_BUTTON}
              data-testid="revision-queue-accept"
            >
              {isAccepting ? "Saving…" : "Accept all"}
            </button>
            <button
              type="button"
              onClick={handleReject}
              className={GHOST_BUTTON}
              data-testid="revision-queue-reject"
            >
              Reject all
            </button>
          </div>
        </div>
      ) : null}

      {savedFeedback ? (
        <p
          className="mt-3 text-[13px] text-folio-primary-container"
          role="status"
          data-testid="revision-queue-saved"
        >
          {savedFeedback}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-[13px] text-folio-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const GHOST_BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-folio-sage-border bg-white px-3.5 py-2 text-sm font-medium text-folio-on-surface transition hover:bg-folio-surface-container-low disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-folio-primary-container px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** Rationale chips for one included experience, derived from generated bullet metadata. */
function chipsForExperience(exp: ResumeDraftExperienceSection): string[] {
  const order: Record<ResumeDraftConfidence, number> = { high: 3, medium: 2, low: 1 };
  let best: ResumeDraftConfidence = "low";
  let alignment: string | undefined;
  for (const bullet of exp.bullets) {
    if (order[bullet.confidence] > order[best]) best = bullet.confidence;
    if (!alignment && bullet.jdAlignmentReason?.trim()) {
      alignment = bullet.jdAlignmentReason.trim();
    }
  }
  const chips = [relevanceLabel(best)];
  if (alignment) {
    const words = alignment.split(/\s+/).slice(0, 3).join(" ");
    chips.push(words.length < alignment.length ? `${words}…` : words);
  }
  return chips;
}

// ── Cover letter tab ──────────────────────────────────────────────────────────

type ToneOption = "formal" | "balanced" | "conversational";

const TONE_SEGMENTS: { key: ToneOption; label: string }[] = [
  { key: "formal", label: "Formal" },
  { key: "balanced", label: "Balanced" },
  { key: "conversational", label: "Conversational" },
];

const QUICK_ACTIONS: { action: CoverLetterRevisionAction; label: string }[] = [
  { action: "shorten", label: "Shorten" },
  { action: "more_formal", label: "More formal" },
  { action: "more_conversational", label: "More conversational" },
  { action: "warmer", label: "Warmer" },
  { action: "remove_ai_phrases", label: "Remove AI phrases" },
];

type CoverLetterTabProps = {
  resumeDraft: GeneratedResumeDraftRecord;
  companyContext: CompanyContext | null;
  inventory: ReturnType<typeof useWorkspace>["inventory"];
  jobDescriptions: StoredJobDescription[];
};

function CoverLetterTab({
  resumeDraft,
  companyContext,
  inventory,
  jobDescriptions,
}: CoverLetterTabProps) {
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<CoverLetterRevisionAction | null>(null);
  const [tone, setTone] = useState<ToneOption>("balanced");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCl, setIsSavingCl] = useState(false);
  const [clIsEditMode, setClIsEditMode] = useState(false);
  const [pendingEvidenceControls, setPendingEvidenceControls] =
    useState<CoverLetterEvidenceControls>({ forcedEvidenceIds: [], excludedEvidenceIds: [] });
  const [showEvidenceStaging, setShowEvidenceStaging] = useState(false);
  const originalCoverLetterBodyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      setError(null);
      try {
        const record = await findCoverLetterDraftByResumeDraftId(resumeDraft.id);
        if (cancelled) return;
        setCoverLetter(record);
        const loadedBody = record?.body ?? "";
        setBody(loadedBody);
        if (originalCoverLetterBodyRef.current === null) {
          originalCoverLetterBodyRef.current = loadedBody;
        }
      } catch (loadError) {
        if (cancelled) return;
        setCoverLetter(null);
        setLoadError(
          loadError instanceof Error ? loadError.message : "Failed to load cover letter.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [resumeDraft.id, loadAttempt]);

  const linkedJob = useMemo<StoredJobDescription | null>(() => {
    const jobId = coverLetter?.jobDescriptionId ?? resumeDraft.jobDescriptionId;
    if (!jobId) return null;
    return jobDescriptions.find((job) => job.id === jobId) ?? null;
  }, [coverLetter, resumeDraft.jobDescriptionId, jobDescriptions]);

  const clIsDirty = coverLetter !== null && body !== coverLetter.body;

  // beforeunload guard while user has unsaved CL edits
  useEffect(() => {
    if (!clIsDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [clIsDirty]);

  const wordCount = countWords(body);
  const overLimit = isOverWordLimit(wordCount);
  const bannedPhrases = detectBannedPhrases(body);
  const exportBlocked = overLimit || bannedPhrases.length > 0;
  const isBusy = busyAction !== null || isRegenerating || isGenerating || isSavingCl;

  // Pending-only evidence rows — rebuilt when job, inventory, or pending controls change.
  // Never calls AI; never auto-saves. Applied on Regenerate only.
  const evidenceRows = useMemo(() => {
    if (!linkedJob) return [];
    const collated = buildActiveCollatedInventory(inventory);
    const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(inventory.enrichment);
    const companyCtx = buildCompanyContext({
      companyName: linkedJob.companyName ?? "Company",
      country: coverLetter?.country ?? "Singapore",
      jobDescriptionText: linkedJob.rawText,
      roleTitle: linkedJob.roleTitle,
    });
    const spine = buildEvidenceSpine({
      collated,
      enrichment: inventory.enrichment,
      jdText: linkedJob.rawText,
      roleTitle: linkedJob.roleTitle ?? resumeDraft.content.targetRoleTitle,
      maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
      regenerationControls: resumeDraft.inputSnapshot?.regenerationControls,
      companyContext: companyCtx,
      acceptedWordingByBulletKey,
    });
    return buildCoverLetterProofEvidenceList(spine, pendingEvidenceControls);
  }, [linkedJob, inventory, resumeDraft, pendingEvidenceControls, coverLetter]);

  function toggleForceEvidence(id: string) {
    setPendingEvidenceControls((prev) => {
      const norm = normalizeCoverLetterEvidenceControls(prev);
      const isForced = norm.forcedEvidenceIds.includes(id);
      return normalizeCoverLetterEvidenceControls({
        forcedEvidenceIds: isForced
          ? norm.forcedEvidenceIds.filter((x) => x !== id)
          : [...norm.forcedEvidenceIds, id],
        excludedEvidenceIds: norm.excludedEvidenceIds.filter((x) => x !== id),
      });
    });
  }

  function toggleExcludeEvidence(id: string) {
    setPendingEvidenceControls((prev) => {
      const norm = normalizeCoverLetterEvidenceControls(prev);
      const isExcluded = norm.excludedEvidenceIds.includes(id);
      return normalizeCoverLetterEvidenceControls({
        forcedEvidenceIds: norm.forcedEvidenceIds.filter((x) => x !== id),
        excludedEvidenceIds: isExcluded
          ? norm.excludedEvidenceIds.filter((x) => x !== id)
          : [...norm.excludedEvidenceIds, id],
      });
    });
  }

  async function handleSaveCoverLetter() {
    if (!coverLetter || isSavingCl) return;
    setIsSavingCl(true);
    setError(null);
    try {
      const updated = await updateGeneratedCoverLetterDraftInCloud(coverLetter.id, { body });
      setCoverLetter(updated);
      setClIsEditMode(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save cover letter.");
    } finally {
      setIsSavingCl(false);
    }
  }

  async function applyRevision(action: CoverLetterRevisionAction) {
    if (!coverLetter || isBusy || !body.trim()) return;
    setBusyAction(action);
    setError(null);
    try {
      const response = await requestCoverLetterRevision({
        draftId: coverLetter.id,
        currentBody: body,
        action,
        persist: true,
      });
      setBody(response.body);
      setCoverLetter((prev) => (prev ? { ...prev, body: response.body } : prev));
    } catch (revisionError) {
      setError(
        revisionError instanceof Error
          ? revisionError.message
          : "Cover letter revision failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSelectTone(next: ToneOption) {
    if (isBusy || next === tone) return;
    setTone(next);
    if (next === "formal") {
      await applyRevision("more_formal");
    } else if (next === "conversational") {
      await applyRevision("more_conversational");
    } else if (next === "balanced" && originalCoverLetterBodyRef.current !== null && coverLetter) {
      const original = originalCoverLetterBodyRef.current;
      setBody(original);
      setCoverLetter((prev) => (prev ? { ...prev, body: original } : prev));
      setError(null);
      try {
        await updateGeneratedCoverLetterDraftInCloud(coverLetter.id, { body: original });
      } catch (restoreError) {
        setError(
          restoreError instanceof Error ? restoreError.message : "Failed to restore original text.",
        );
      }
    }
  }

  async function handleRegenerate() {
    if (!coverLetter || isBusy) return;
    if (!linkedJob) {
      setError("Saved job description is required to regenerate the cover letter.");
      return;
    }
    if (!window.confirm(REGENERATE_COVER_LETTER_CONFIRM)) return;

    setIsRegenerating(true);
    setError(null);
    try {
      const updated = await generateAndSaveCoverLetterDraft({
        ...buildCoverLetterGenerationOptions({
          job: linkedJob,
          resumeDraft,
          inventory,
          applicationId: coverLetter.applicationId ?? resumeDraft.applicationId,
          fields: {
            country: coverLetter.country,
            companyWebsite: coverLetter.companyWebsite,
            additionalInstructions: coverLetter.additionalInstructions,
          },
          savedCompanyContext: companyContext ?? coverLetter.companyContext,
        }),
        existingCoverLetterId: coverLetter.id,
        // Pending-only evidence staging — applied on regenerate only, never persisted.
        evidenceControls: normalizeCoverLetterEvidenceControls(pendingEvidenceControls),
      });
      setCoverLetter(updated);
      setBody(updated.body);
      originalCoverLetterBodyRef.current = updated.body;
      setTone("balanced");
      // Clear staged evidence after regeneration (staging is single-use).
      setPendingEvidenceControls({ forcedEvidenceIds: [], excludedEvidenceIds: [] });
    } catch (regenError) {
      setError(
        regenError instanceof Error ? regenError.message : "Cover letter regeneration failed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleGenerate() {
    if (isBusy) return;
    if (!linkedJob) {
      setError("Saved job description is required to generate a cover letter.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const created = await generateAndSaveCoverLetterDraft(
        buildCoverLetterGenerationOptions({
          job: linkedJob,
          resumeDraft,
          inventory,
          applicationId: resumeDraft.applicationId,
          fields: {},
          savedCompanyContext: companyContext ?? undefined,
        }),
      );
      setCoverLetter(created);
      setBody(created.body);
    } catch (genError) {
      setError(
        genError instanceof Error ? genError.message : "Cover letter generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-5 rounded-xl border border-folio-sage-border bg-white px-6 py-16 text-center">
        <p className="text-sm text-folio-outline">Loading cover letter…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-5 flex flex-col items-center rounded-xl border border-[#f3c0bd] bg-[#fdeceb] px-6 py-16 text-center">
        <p className="text-sm font-medium text-[#ba1a1a]">Cover letter unavailable</p>
        <p className="mt-2 max-w-lg text-sm text-[#ba1a1a]">
          We could not verify whether a cover letter is already saved. No new draft was created.
        </p>
        <p className="mt-2 max-w-lg text-xs text-[#ba1a1a]">{loadError}</p>
        <button
          type="button"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          className={`mt-4 ${GHOST_BUTTON}`}
        >
          Retry loading
        </button>
      </div>
    );
  }

  if (!coverLetter) {
    return (
      <div className="mt-5 flex flex-col items-center rounded-xl border border-folio-sage-border bg-white px-6 py-16 text-center">
        <p className="text-sm text-folio-outline">
          No cover letter has been generated for this application yet.
        </p>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !linkedJob}
          className="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 bg-folio-primary-container"
        >
          {isGenerating ? "Generating…" : "Generate cover letter"}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-folio-error">{error}</p>
        ) : null}
        {!linkedJob ? (
          <p className="mt-2 text-xs text-folio-outline">
            This draft is not linked to a saved job description.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-5">
      {/* Body — togglable between read-only paragraph view and editable textarea */}
      <div className="rounded-xl border border-folio-sage-border bg-white p-6">
        {clIsEditMode ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${TEXTAREA_CLASS} min-h-[320px] font-serif text-[15px] leading-7`}
            data-testid="cl-edit-textarea"
          />
        ) : (
          <div className="space-y-4 font-serif text-[15px] leading-7 text-folio-on-surface">
            {splitCoverLetterParagraphs(body).map((paragraph, index) => (
              <p key={index} className="m-0">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Edit / save / cancel controls */}
      <div className="mt-3 flex items-center gap-3">
        {!clIsEditMode ? (
          <button
            type="button"
            onClick={() => setClIsEditMode(true)}
            disabled={isBusy}
            className={GHOST_BUTTON}
            data-testid="cl-edit-toggle"
          >
            Edit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleSaveCoverLetter()}
              disabled={isSavingCl || !clIsDirty}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 bg-folio-primary-container"
              data-testid="cl-save-button"
            >
              {isSavingCl ? "Saving…" : "Save cover letter"}
            </button>
            <button
              type="button"
              onClick={() => {
                setBody(coverLetter.body);
                setClIsEditMode(false);
              }}
              disabled={isSavingCl}
              className={GHOST_BUTTON}
              data-testid="cl-edit-cancel"
            >
              Cancel
            </button>
          </>
        )}
        {clIsDirty && !clIsEditMode ? (
          <span className="text-xs text-folio-outline" data-testid="cl-dirty-indicator">
            Unsaved changes
          </span>
        ) : null}
      </div>

      {/* Quick-action chips — disabled while in manual-edit mode to prevent overwriting unsaved edits */}
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            type="button"
            onClick={() => void applyRevision(action)}
            disabled={isBusy || clIsEditMode}
            className={GHOST_BUTTON}
            aria-busy={busyAction === action}
          >
            {busyAction === action ? "Revising…" : label}
          </button>
        ))}
      </div>

      {/* Tone selector — disabled while in manual-edit mode */}
      <div className="mt-5">
        <p className="text-[13px] font-medium text-folio-outline">Tone</p>
        <div className="mt-2 inline-flex rounded-lg border border-folio-sage-border bg-white p-0.5">
          {TONE_SEGMENTS.map((segment) => {
            const active = tone === segment.key;
            return (
              <button
                key={segment.key}
                type="button"
                onClick={() => void handleSelectTone(segment.key)}
                disabled={isBusy || clIsEditMode}
                aria-pressed={active}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active ? "bg-folio-primary-container text-white" : "text-folio-outline hover:text-folio-on-surface"
                }`}
              >
                {segment.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Evidence staging — pending-only; applied on Regenerate only, never auto-saved */}
      {linkedJob ? (
        <div className="mt-5" data-testid="cl-evidence-staging">
          <button
            type="button"
            onClick={() => setShowEvidenceStaging((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-folio-sage-border bg-white px-4 py-2.5 text-sm font-medium text-folio-on-surface hover:bg-folio-surface-container-low"
            data-testid="cl-evidence-staging-toggle"
          >
            <span>Stage evidence for regeneration</span>
            <span className="flex items-center gap-2">
              {hasCoverLetterEvidenceControls(pendingEvidenceControls) ? (
                <span className="inline-flex items-center rounded-full bg-folio-mint-surface px-2 py-0.5 text-[11px] font-medium text-folio-olive-text">
                  {pendingEvidenceControls.forcedEvidenceIds.length +
                    pendingEvidenceControls.excludedEvidenceIds.length}{" "}
                  staged
                </span>
              ) : null}
              <ChevronIcon open={showEvidenceStaging} />
            </span>
          </button>

          {showEvidenceStaging ? (
            <div className="mt-2 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4">
              <p className="text-[12px] text-folio-outline">
                Work, Additional Experience, and Education only. Staging never calls AI — only
                Regenerate cover letter does (1 AI step). Choices are cleared after regeneration.
              </p>

              {evidenceRows.length === 0 ? (
                <p className="mt-3 text-sm text-folio-outline">
                  No ranked proof evidence available for this application.
                </p>
              ) : (
                <ul
                  className="mt-3 max-h-72 space-y-2 overflow-y-auto"
                  data-testid="cl-evidence-rows"
                >
                  {evidenceRows.map((row) => {
                    const isForced = row.stagedAs === "force";
                    const isExcluded = row.stagedAs === "exclude";
                    return (
                      <li
                        key={row.id}
                        className="rounded-lg border border-folio-sage-border bg-white p-3"
                        data-evidence-category={row.categoryLabel}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-folio-mint-surface px-2 py-0.5 text-[11px] font-medium text-folio-olive-text">
                            {row.categoryLabel}
                          </span>
                          <span className="text-[13px] font-medium text-folio-on-surface">
                            {row.displayLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] text-folio-on-surface">{row.evidenceText}</p>
                        <p className="mt-0.5 text-[12px] text-folio-outline">{row.rationale}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => toggleForceEvidence(row.id)}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isForced
                                ? "bg-folio-primary-container text-white"
                                : "border border-folio-sage-border bg-white text-folio-on-surface hover:bg-folio-surface-container-low"
                            }`}
                            data-action="stage-cl-force-evidence"
                          >
                            {isForced ? "Staged: use" : "Use in cover letter"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => toggleExcludeEvidence(row.id)}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isExcluded
                                ? "bg-folio-primary-container text-white"
                                : "border border-folio-sage-border bg-white text-folio-on-surface hover:bg-folio-surface-container-low"
                            }`}
                            data-action="stage-cl-exclude-evidence"
                          >
                            {isExcluded ? "Staged: avoid" : "Avoid in cover letter"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {hasCoverLetterEvidenceControls(pendingEvidenceControls) ? (
                <div
                  className="mt-3 rounded-lg border border-folio-mint-surface bg-folio-mint-surface px-3 py-3 text-[13px] text-folio-olive-text"
                  data-testid="cl-evidence-queue-summary"
                >
                  <p className="font-medium">Pending evidence</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                    {pendingEvidenceControls.forcedEvidenceIds.length > 0 ? (
                      <li>
                        Use {pendingEvidenceControls.forcedEvidenceIds.length} item
                        {pendingEvidenceControls.forcedEvidenceIds.length === 1 ? "" : "s"} in proof stories
                      </li>
                    ) : null}
                    {pendingEvidenceControls.excludedEvidenceIds.length > 0 ? (
                      <li>
                        Avoid {pendingEvidenceControls.excludedEvidenceIds.length} item
                        {pendingEvidenceControls.excludedEvidenceIds.length === 1 ? "" : "s"} in proof stories
                      </li>
                    ) : null}
                  </ul>
                  <p className="mt-1.5 text-[11px]">Staging never calls AI — applied on next Regenerate only.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Regenerate */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={isBusy || !linkedJob}
          className={`w-full ${GHOST_BUTTON}`}
        >
          <RefreshIcon />
          {isRegenerating ? "Regenerating cover letter…" : "Regenerate cover letter"}
        </button>
        <p className={`mt-2 text-right text-xs ${overLimit ? "text-folio-error" : "text-folio-outline"}`}>
          {wordCount} / {FORMAL_COVER_LETTER_MAX_WORDS} words
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <DownloadCoverLetterPdfButton draftId={coverLetter.id} disabled={isBusy || !body.trim() || exportBlocked} />
        <DownloadCoverLetterDocxButton draftId={coverLetter.id} disabled={isBusy || !body.trim() || exportBlocked} />
      </div>
      {exportBlocked && body.trim() ? (
        <p className="mt-2 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-folio-error">
          {overLimit
            ? `Export blocked — cover letter exceeds ${FORMAL_COVER_LETTER_MAX_WORDS} words. Shorten it to unlock download.`
            : `Export blocked — remove banned phrasing before downloading: ${bannedPhrases.join(", ")}.`}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-folio-error">
          {error}
        </p>
      ) : null}

      {/* Other formats — precomputed copy-paste outreach versions (no AI) */}
      <SecondaryCommunicationsPanel rationale={coverLetter.rationale} />
    </div>
  );
}

// ── Layout sliders (Folio-native, PDF view only) ──────────────────────────────
// Ported from the legacy preview layout controls, restyled to DESIGN.md. Each change
// rebuilds the document model → live ResumePdfPreview re-render.

const SLIDER_CLASS = "mt-1 block w-full accent-folio-primary-container";
const SLIDER_LABEL_CLASS = "block text-[12px] font-medium text-folio-outline";

function LayoutSliders({
  settings,
  onChange,
  optimizationNote,
  disabled,
}: {
  settings: ResumeLayoutSettings;
  onChange: (next: ResumeLayoutSettings) => void;
  optimizationNote?: string;
  disabled: boolean;
}) {
  const bodyFontSteps = Math.round(
    (PREVIEW_BODY_FONT_MAX_PX - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX,
  );
  function update(patch: Partial<ResumeLayoutSettings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div
      className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4"
      data-testid="output-layout-sliders"
    >
      <p className="text-[13px] font-medium text-folio-on-surface">Layout</p>
      <p className="mt-0.5 text-[12px] text-folio-outline">
        Adjust spacing and margins to fit one page. The server one-page check stays the export gate.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className={SLIDER_LABEL_CLASS}>
          Body font ({settings.bodyFontPx}px)
          <input
            type="range"
            min={0}
            max={bodyFontSteps}
            step={1}
            disabled={disabled}
            value={Math.round((settings.bodyFontPx - PREVIEW_BODY_FONT_MIN_PX) / PREVIEW_BODY_FONT_STEP_PX)}
            onChange={(e) =>
              update({
                bodyFontPx: clampPreviewBodyFontPx(
                  PREVIEW_BODY_FONT_MIN_PX + Number(e.target.value) * PREVIEW_BODY_FONT_STEP_PX,
                ),
              })
            }
            className={SLIDER_CLASS}
          />
        </label>
        <label className={SLIDER_LABEL_CLASS}>
          Side margins ({settings.marginMm}mm)
          <input
            type="range"
            min={PREVIEW_MARGIN_MIN_MM}
            max={PREVIEW_MARGIN_MAX_MM}
            disabled={disabled}
            value={settings.marginMm}
            onChange={(e) => update({ marginMm: Number(e.target.value) })}
            className={SLIDER_CLASS}
          />
        </label>
        <label className={SLIDER_LABEL_CLASS}>
          Top margin ({settings.marginTopMm}mm)
          <input
            type="range"
            min={PREVIEW_MARGIN_TOP_MIN_MM}
            max={PREVIEW_MARGIN_TOP_MAX_MM}
            disabled={disabled}
            value={settings.marginTopMm}
            onChange={(e) => update({ marginTopMm: Number(e.target.value) })}
            className={SLIDER_CLASS}
          />
        </label>
        <label className={SLIDER_LABEL_CLASS}>
          Line spacing ({settings.lineSpacing.toFixed(2)})
          <input
            type="range"
            min={Math.round(PREVIEW_LINE_SPACING_MIN * 100)}
            max={Math.round(PREVIEW_LINE_SPACING_MAX * 100)}
            disabled={disabled}
            value={Math.round(settings.lineSpacing * 100)}
            onChange={(e) => update({ lineSpacing: Number(e.target.value) / 100 })}
            className={SLIDER_CLASS}
          />
        </label>
        <label className={SLIDER_LABEL_CLASS}>
          Section spacing ({settings.sectionSpacing.toFixed(2)}rem)
          <input
            type="range"
            min={Math.round(PREVIEW_SECTION_SPACING_MIN * 100)}
            max={Math.round(PREVIEW_SECTION_SPACING_MAX * 100)}
            disabled={disabled}
            value={Math.round(settings.sectionSpacing * 100)}
            onChange={(e) => update({ sectionSpacing: Number(e.target.value) / 100 })}
            className={SLIDER_CLASS}
          />
        </label>
      </div>
      {optimizationNote ? (
        <p
          className="mt-3 rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-[12px] text-folio-outline"
          data-testid="output-layout-optimizer-note"
        >
          {optimizationNote}
        </p>
      ) : null}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function OutputEditorPageClient({ draftId }: OutputEditorPageClientProps) {
  const { inventory, jobDescriptions } = useWorkspace();

  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [activeTab, setActiveTab] = useState<OutputTab>("resume");
  // Document column view — Text (default, editable) or PDF (A4 truth + layout sliders).
  const [documentView, setDocumentView] = useState<"text" | "pdf">("text");
  const [showExcluded, setShowExcluded] = useState(false);
  const [showRevisionQueue, setShowRevisionQueue] = useState(false);

  // Approval state
  const [isApproving, setIsApproving] = useState(false);
  const [validationFailure, setValidationFailure] = useState<{
    pageCount: number;
    message: string;
    suggestedActions: string[];
    overflowMm?: number;
  } | null>(null);

  // Experience toggle intent
  const [excludedDraftKeys, setExcludedDraftKeys] = useState<Set<string>>(new Set());
  const [includedExtraKeys, setIncludedExtraKeys] = useState<Set<string>>(new Set());

  // Line-level bullet controls — staged for next Regenerate, not applied live.
  // These shape AI evidence input for the next full Regenerate (NOT the current document).
  const [lineLevelExcludedBulletKeys, setLineLevelExcludedBulletKeys] = useState<Set<string>>(new Set());
  const [lineLevelForcedBulletKeys, setLineLevelForcedBulletKeys] = useState<Set<string>>(new Set());
  const [showBulletControls, setShowBulletControls] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Manual layout overrides (PDF-view sliders) — null = use optimizer/stored defaults.
  const [manualSettings, setManualSettings] = useState<
    (ResumeLayoutSettings & { draftId: string }) | null
  >(null);
  const layoutChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (layoutChangeTimerRef.current) {
        clearTimeout(layoutChangeTimerRef.current);
      }
    };
  }, []);

  // ── Draft load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoading(true);
      setError(null);
      setLoadFailed(false);
      setNotFound(false);

      let record: GeneratedResumeDraftRecord | null;
      try {
        record = await getGeneratedResumeDraftFromCloud(draftId);
      } catch (loadError) {
        if (cancelled) return;
        setLoadFailed(true);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load resume draft.",
        );
        return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      if (cancelled) return;
      if (!record) {
        setNotFound(true);
        setDraft(null);
        return;
      }
      setDraft(record);

      // Seed manual layout overrides from any stored export layout settings so the
      // PDF-view sliders reflect the validated layout on reload.
      const storedLayout = record.content.exportLayoutSettings;
      if (storedLayout) {
        setManualSettings({
          draftId: record.id,
          ...storedLayout,
          itemLineSpacing: storedLayout.itemLineSpacing ?? PREVIEW_ITEM_LINE_SPACING_DEFAULT,
        });
      }

      if (!record.applicationId) {
        setCompanyContext(null);
        return;
      }
      try {
        const application = await getApplicationRecordFromCloud(record.applicationId);
        if (!cancelled) {
          setCompanyContext(application?.companyContext ?? null);
        }
      } catch {
        if (!cancelled) setCompanyContext(null);
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId, loadAttempt]);

  const linkedJob = useMemo(() => {
    if (!draft?.jobDescriptionId) return null;
    return jobDescriptions.find((job) => job.id === draft.jobDescriptionId) ?? null;
  }, [draft, jobDescriptions]);

  const displayCompany = formatCompanyNameForDisplay({
    rawName: linkedJob?.companyName,
    website: companyContext?.website,
    savedDisplayName: companyContext?.displayName,
  });

  const roleTitle = linkedJob?.roleTitle ?? draft?.content.targetRoleTitle ?? "Resume";

  const includedExperiences = useMemo(
    () => draft?.content.experience ?? [],
    [draft],
  );
  const includedKeys = useMemo(
    () => new Set(includedExperiences.map((e) => experienceKey(e.company, e.role))),
    [includedExperiences],
  );

  const excludedExperiences = useMemo<CollatedExperience[]>(() => {
    const active = buildActiveCollatedInventory(inventory);
    return active.experiences.filter(
      (exp) => !includedKeys.has(experienceKey(exp.company, exp.role)),
    );
  }, [inventory, includedKeys]);

  // Deterministic fit assessment (NO page-load AI). Passing fitAssessment alongside
  // rationale is what surfaces the numeric NN/100 score in the banner.
  const fitAssessment = useMemo<ResumeFitAssessment | null>(
    () => (draft ? calculateFitScore(draft.content, draft.rationale) : null),
    [draft],
  );

  const fitSummary = useMemo(
    () => buildPackageFitSummary({ rationale: draft?.rationale, fitAssessment }),
    [draft, fitAssessment],
  );

  // Layout settings: optimizer baseline, overridden by manual slider state when present.
  const autoSettings = useMemo(
    () => (draft ? optimizeResumePreviewSettings(draft.content) : null),
    [draft],
  );
  const layoutOverride = manualSettings?.draftId === draftId ? manualSettings : null;
  const activeLayoutSettings = useMemo<ResumeLayoutSettings>(() => {
    const stored = draft?.content.exportLayoutSettings;
    return {
      bodyFontPx:
        layoutOverride?.bodyFontPx ?? stored?.bodyFontPx ?? autoSettings?.bodyFontPx ??
        DEFAULT_RESUME_LAYOUT_SETTINGS.bodyFontPx,
      marginMm:
        layoutOverride?.marginMm ?? stored?.marginMm ?? autoSettings?.marginMm ??
        DEFAULT_RESUME_LAYOUT_SETTINGS.marginMm,
      marginTopMm:
        layoutOverride?.marginTopMm ?? stored?.marginTopMm ?? autoSettings?.marginTopMm ??
        DEFAULT_RESUME_LAYOUT_SETTINGS.marginTopMm,
      lineSpacing:
        layoutOverride?.lineSpacing ?? stored?.lineSpacing ?? autoSettings?.lineSpacing ??
        DEFAULT_RESUME_LAYOUT_SETTINGS.lineSpacing,
      itemLineSpacing:
        layoutOverride?.itemLineSpacing ?? stored?.itemLineSpacing ?? autoSettings?.itemLineSpacing ??
        PREVIEW_ITEM_LINE_SPACING_DEFAULT,
      sectionSpacing:
        layoutOverride?.sectionSpacing ?? stored?.sectionSpacing ?? autoSettings?.sectionSpacing ??
        DEFAULT_RESUME_LAYOUT_SETTINGS.sectionSpacing,
    };
  }, [layoutOverride, draft, autoSettings]);
  // The auto-optimizer note only applies while the user has not manually overridden layout.
  const optimizationNote =
    layoutOverride === null ? autoSettings?.optimizationNote ?? autoSettings?.warning : undefined;

  const tailoringDiagnostics = useMemo(
    () =>
      draft
        ? buildPackageTailoringDiagnostics({ resumeDraft: draft, jobDescription: linkedJob })
        : null,
    [draft, linkedJob],
  );

  function toggleDraftExperience(key: string) {
    setExcludedDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExtraExperience(key: string) {
    setIncludedExtraKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function buildMergedControls() {
    const saved = draft?.inputSnapshot?.regenerationControls;

    const excludedBulletKeys = new Set<string>(saved?.excludedBulletKeys ?? []);
    for (const exp of includedExperiences) {
      const key = experienceKey(exp.company, exp.role);
      if (!excludedDraftKeys.has(key)) continue;
      for (const bullet of exp.bullets) {
        for (const ref of bullet.sourceRefs) {
          if (ref.bulletKey) excludedBulletKeys.add(ref.bulletKey);
        }
      }
    }

    const forcedBulletKeys = new Set<string>(saved?.forcedBulletKeys ?? []);
    for (const exp of excludedExperiences) {
      const key = experienceKey(exp.company, exp.role);
      if (!includedExtraKeys.has(key)) continue;
      for (const bullet of exp.bullets) {
        if (bullet.inventoryBulletKey) forcedBulletKeys.add(bullet.inventoryBulletKey);
      }
    }

    // Merge line-level staged controls set by the user in the bullet controls panel
    for (const k of lineLevelExcludedBulletKeys) excludedBulletKeys.add(k);
    for (const k of lineLevelForcedBulletKeys) forcedBulletKeys.add(k);

    return normalizeRegenerationControls({
      forcedBulletKeys: [...forcedBulletKeys],
      excludedBulletKeys: [...excludedBulletKeys],
      forcedEvidenceIds: saved?.forcedEvidenceIds,
      excludedEvidenceIds: saved?.excludedEvidenceIds,
    });
  }

  // ── Shared content-edit persistence (M5a invalidation path) ───────────────────
  // Every in-document content mutation (bullet Edit/Remove/Replace, section edit) and
  // the revision-queue accept route through here. resolveDraftStatusAfterContentEdit
  // downgrades approved/layout_changed → layout_changed and clears serverPdfValidation,
  // which automatically updates the exportReady derivation and re-approve notice.
  async function applyContentEdit(updatedContent: ResumeDraftContent) {
    if (!draft) return;
    const newStatus = resolveDraftStatusAfterContentEdit(draft.status);
    const saved = await updateGeneratedResumeDraftInCloud(draft.id, {
      content: { ...updatedContent, serverPdfValidation: undefined },
      status: newStatus,
    });
    setDraft(saved);
    setValidationFailure(null);
  }

  async function handleRevisionQueueAccepted(updatedContent: ResumeDraftContent) {
    await applyContentEdit(updatedContent);
  }

  // ── Layout sliders (PDF view) → live document model + approval invalidation ────
  // Mirrors ResumePreviewPageClient: a layout change after approval downgrades the
  // draft to layout_changed (debounced) and clears the validated PDF result.
  async function markLayoutChangedAfterApproval(next: ResumeLayoutSettings) {
    if (!draft || !isApprovedDraftStatus(draft.status)) return;
    if (areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, next)) return;
    try {
      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: { ...draft.content, serverPdfValidation: undefined },
        status: RESUME_DRAFT_STATUS_LAYOUT_CHANGED,
      });
      setDraft(updated);
      setValidationFailure(null);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Failed to mark layout change after approval.",
      );
    }
  }

  function updateLayoutSettings(next: ResumeLayoutSettings) {
    if (!draftId) return;
    setManualSettings({ draftId, ...next });
    setValidationFailure(null);
    if (layoutChangeTimerRef.current) {
      clearTimeout(layoutChangeTimerRef.current);
    }
    layoutChangeTimerRef.current = setTimeout(() => {
      void markLayoutChangedAfterApproval(next);
    }, 300);
  }

  async function handleRegenerate() {
    if (!draft || isRegenerating) return;
    if (!linkedJob || !draft.referenceResumeId) {
      setError("Saved job description or base resume is missing for this draft.");
      return;
    }

    setIsRegenerating(true);
    setError(null);
    setValidationFailure(null);

    try {
      const mergedControls = buildMergedControls();
      const { generationInput, inputSnapshot } = buildResumeDraftPayloadFromInventory({
        inventory,
        jobDescription: linkedJob,
        referenceResumeId: draft.referenceResumeId,
        regenerationControls: mergedControls,
      });

      const response = await requestResumeDraftGeneration({
        ...generationInput,
        inputSnapshot,
      });

      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: response.content,
        rationale: response.rationale,
        inputSnapshot: response.inputSnapshot,
        status: response.draftStatus ?? "generated",
        modelName: response.modelName,
      });

      setDraft(updated);
      setExcludedDraftKeys(new Set());
      setIncludedExtraKeys(new Set());
    } catch (regenError) {
      setError(
        regenError instanceof Error ? regenError.message : "Resume regeneration failed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleApprove() {
    if (!draft || isApproving) return;
    setIsApproving(true);
    setError(null);
    setValidationFailure(null);
    try {
      const result = await approveResumeDraftForExport({
        draftId: draft.id,
        layoutSettings: activeLayoutSettings,
      });
      setDraft(result.draft);
      setExportMessage(null);
    } catch (approveError) {
      if (approveError instanceof ResumePdfOnePageBlockedError) {
        setValidationFailure({
          pageCount: approveError.pageCount,
          message: formatOnePageBlockedMessage(approveError),
          suggestedActions: approveError.suggestedActions,
          overflowMm: approveError.overflowMm,
        });
      } else {
        setError(
          approveError instanceof Error
            ? approveError.message
            : "Failed to approve draft for export.",
        );
      }
    } finally {
      setIsApproving(false);
    }
  }

  async function handleExportPdf() {
    if (!draft || isExportingPdf) return;
    setIsExportingPdf(true);
    setExportMessage(null);
    try {
      const result = await exportResumePdfFromApi({
        draftId: draft.id,
        layoutSettings: activeLayoutSettings,
      });
      if (!result.downloadUrl) throw new Error("Export did not return a download URL.");
      const delivery = await deliverExportedFile(result.fileName, result.downloadUrl, "pdf");
      if (delivery.mobileHint) setExportMessage(delivery.mobileHint);
    } catch (exportError) {
      setExportMessage(
        exportError instanceof Error ? exportError.message : "Failed to export resume PDF.",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleExportDocx() {
    if (!draft || isExportingDocx) return;
    setIsExportingDocx(true);
    setExportMessage(null);
    try {
      const result = await exportResumeDocxFromApi({
        draftId: draft.id,
        layoutSettings: activeLayoutSettings,
      });
      if (!result.downloadUrl) throw new Error("Export did not return a download URL.");
      const delivery = await deliverExportedFile(result.fileName, result.downloadUrl, "docx");
      if (delivery.mobileHint) setExportMessage(delivery.mobileHint);
    } catch (exportError) {
      setExportMessage(
        exportError instanceof Error ? exportError.message : "Failed to export resume DOCX.",
      );
    } finally {
      setIsExportingDocx(false);
    }
  }

  // ── Early render states ───────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-sm text-folio-outline">Loading output editor…</p>;
  }

  if (loadFailed && !draft) {
    return (
      <div
        data-testid="output-load-failed"
        className="max-w-[640px] rounded-xl border border-[#f3c0bd] bg-[#fdeceb] p-4"
      >
        <h1 className="text-[18px] font-medium text-[#ba1a1a]">Could not load this draft</h1>
        <p className="mt-2 max-w-lg text-sm text-[#ba1a1a]">
          We could not load this draft right now. This does not mean it is missing — please try
          again.
        </p>
        {error ? <p className="mt-2 text-xs text-[#ba1a1a]">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className={GHOST_BUTTON}
          >
            Retry loading
          </button>
          <Link href="/generate" className={GHOST_BUTTON}>
            Back to new application
          </Link>
        </div>
      </div>
    );
  }

  if (notFound && !draft) {
    return (
      <div className="max-w-[640px] rounded-xl border border-folio-sage-border bg-white p-4">
        <h1 className="text-[18px] font-medium text-folio-on-surface">Resume draft not found</h1>
        <p className="mt-2 text-sm text-folio-outline">
          This draft does not exist or has been removed.
        </p>
        <Link href="/generate" className={`mt-4 ${GHOST_BUTTON}`}>
          Back to new application
        </Link>
      </div>
    );
  }

  if (!draft) return null;

  // ── Approval / export trust state ─────────────────────────────────────────────
  // exportReady compares the validated stored layout against the active layout; a
  // slider change after approval makes them differ → exportReady false (re-approve).
  const exportReady = Boolean(
    isApprovedDraftStatus(draft.status) &&
      draft.content.serverPdfValidation?.pageCount === 1 &&
      areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, activeLayoutSettings),
  );
  const layoutChangedAfterApproval = isLayoutChangedAfterApprovalStatus(draft.status);
  const needsReview = draft.status === RESUME_DRAFT_STATUS_NEEDS_REVIEW;
  const approveLabel = isApproving
    ? "Validating server PDF…"
    : layoutChangedAfterApproval || isApprovedDraftStatus(draft.status)
      ? "Re-approve for export"
      : "Approve for export";

  // ── PDF preview document model ────────────────────────────────────────────────
  // Built on demand whenever the PDF view is active — NO approval required. Uses the
  // active layout (manual slider override or optimizer/stored baseline) so the A4
  // iframe re-renders live as the sliders change.
  const pdfDocumentModel =
    documentView === "pdf"
      ? buildExportResumeDocumentModel({
          draft,
          jobDescription: linkedJob,
          companyContext,
          referenceResume: findReferenceResumeInInventory(
            inventory.resumes,
            draft.referenceResumeId,
          ),
          layoutSettings: activeLayoutSettings,
        })
      : null;

  const fitScore = fitAssessment ? fitAssessment.fitScore : null;
  const fitVerdict = fitScore !== null ? fitScoreToVerdict(fitScore) : null;

  return (
    <div className="max-w-[1100px]">
      {/* ── Header (title + status only — export lives in the bottom card) ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            {roleTitle} · {displayCompany}
          </h1>
          <span className="rounded-full border border-folio-olive-border bg-folio-mint-surface px-2.5 py-0.5 text-[11px] font-medium text-folio-olive-text">
            Generated
          </span>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-[#ba1a1a]">
          {error}
        </p>
      ) : null}

      {/* ── Fit summary banner (full width, under header) ──────────────────── */}
      <section
        data-testid="output-fit-summary-banner"
        className="mt-5 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-5"
      >
        <div className="flex flex-wrap items-start gap-4">
          {fitScore !== null ? (
            <div
              data-testid="output-fit-score-chip"
              className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-folio-olive-border bg-folio-mint-surface px-4 py-3 text-center"
            >
              <span className="text-2xl font-semibold leading-none text-folio-olive-text">
                {fitScore}
                <span className="text-sm font-normal">/100</span>
              </span>
              {fitVerdict ? (
                <span className="mt-1 text-[12px] font-medium text-folio-olive-text">{fitVerdict}</span>
              ) : null}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-folio-outline">
              Fit summary
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-folio-on-surface">
              {fitSummary ?? PACKAGE_FIT_SUMMARY_UNAVAILABLE}
            </p>
          </div>
        </div>
      </section>

      {/* ── needs_review trust banner — stays at the top, near the fit read ── */}
      {needsReview ? (
        <div
          data-testid="output-needs-review-banner"
          className="mt-4 rounded-xl border border-folio-warning-border bg-folio-warning-surface px-4 py-3 text-sm text-folio-cta-secondary"
        >
          <p className="font-medium">Resume needs a structure review</p>
          <p className="mt-1 leading-relaxed">
            Automatic repair flagged possible structure issues. Regenerate the resume below to re-run
            automatic repair before you approve for export.
          </p>
        </div>
      ) : null}

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="mt-5 flex border-b border-folio-sage-border">
        {([
          { key: "resume", label: "Resume" },
          { key: "cover-letter", label: "Cover letter" },
        ] as const).map((tab) => {
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

      {/* ── Resume tab ─────────────────────────────────────────── */}
      {activeTab === "resume" ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* ── Document column — Text | PDF. Goes full width in PDF view ── */}
            {/* (controls live in Text view only; PDF view shows just Layout). */}
            <div className={documentView === "pdf" ? "lg:w-full" : "lg:w-3/5"}>
              <div
                className="mb-3 inline-flex rounded-lg border border-folio-sage-border bg-white p-0.5"
                data-testid="document-view-toggle"
                role="tablist"
                aria-label="Document view"
              >
                {([
                  { key: "text", label: "Text" },
                  { key: "pdf", label: "PDF" },
                ] as const).map((seg) => {
                  const active = documentView === seg.key;
                  return (
                    <button
                      key={seg.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setDocumentView(seg.key)}
                      data-testid={`document-view-${seg.key}`}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-folio-primary-container text-white"
                          : "text-folio-outline hover:text-folio-on-surface"
                      }`}
                    >
                      {seg.label}
                    </button>
                  );
                })}
              </div>

              {documentView === "pdf" && pdfDocumentModel ? (
                <div className="space-y-3">
                  {/* Layout sliders — PDF view only; live re-render */}
                  <LayoutSliders
                    settings={activeLayoutSettings}
                    onChange={updateLayoutSettings}
                    optimizationNote={optimizationNote}
                    disabled={isRegenerating || isApproving}
                  />
                  <ResumePdfPreview documentModel={pdfDocumentModel} data-testid="output-pdf-preview" />
                </div>
              ) : (
                <div className="rounded-xl border border-folio-sage-border bg-white p-6">
                  <ResumeTextDocument
                    draft={draft}
                    linkedJob={linkedJob}
                    onApplyContentEdit={applyContentEdit}
                    disabled={isRegenerating || isApproving}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={isRegenerating || !linkedJob || !draft.referenceResumeId}
                className={`mt-4 w-full ${GHOST_BUTTON}`}
              >
                <RefreshIcon />
                {isRegenerating ? "Regenerating resume…" : "Regenerate resume"}
              </button>
            </div>

            {/* ── Controls column (≈38%) — Text view only. PDF view shows only Layout. ── */}
            {documentView !== "pdf" ? (
            <div className="lg:w-2/5">
              <p className="text-[13px] font-medium uppercase tracking-wide text-folio-outline">
                Included experience
              </p>
              <div className="mt-3 space-y-2.5">
                {includedExperiences.length === 0 ? (
                  <p className="text-sm text-folio-outline">No experience in this draft yet.</p>
                ) : (
                  includedExperiences.map((exp, i) => {
                    const key = experienceKey(exp.company, exp.role);
                    return (
                      <ExperienceToggleCard
                        key={`${key}-${i}`}
                        company={exp.company}
                        role={exp.role}
                        chips={chipsForExperience(exp)}
                        on={!excludedDraftKeys.has(key)}
                        onToggle={() => toggleDraftExperience(key)}
                      />
                    );
                  })
                )}
              </div>

              <div className="my-5 border-t border-folio-sage-border" />

              <button
                type="button"
                onClick={() => setShowExcluded((v) => !v)}
                className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                aria-expanded={showExcluded}
              >
                <span>Available but excluded ({excludedExperiences.length})</span>
                <ChevronIcon open={showExcluded} />
              </button>

              {showExcluded ? (
                <div className="mt-3 space-y-2.5">
                  {excludedExperiences.length === 0 ? (
                    <p className="text-sm text-folio-outline">
                      Every vault experience is already included.
                    </p>
                  ) : (
                    excludedExperiences.map((exp) => {
                      const key = experienceKey(exp.company, exp.role);
                      const meta = exp.dateRange ? [exp.dateRange] : [];
                      return (
                        <ExperienceToggleCard
                          key={key}
                          company={exp.company}
                          role={exp.role}
                          chips={meta}
                          on={includedExtraKeys.has(key)}
                          onToggle={() => toggleExtraExperience(key)}
                        />
                      );
                    })
                  )}
                </div>
              ) : null}

              <p className="mt-4 text-xs text-folio-outline">
                Selected experiences will be prioritised for the next regeneration.
              </p>

              {/* ── Custom AI revision (collapsed disclosure) ─────── */}
              <div className="mt-5 border-t border-folio-sage-border pt-5">
                <button
                  type="button"
                  onClick={() => setShowRevisionQueue((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                  aria-expanded={showRevisionQueue}
                  data-testid="revision-queue-toggle"
                >
                  <span>Custom AI revision</span>
                  <ChevronIcon open={showRevisionQueue} />
                </button>

                {showRevisionQueue ? (
                  <div className="mt-4">
                    <ResumeRevisionQueue
                      draft={draft}
                      linkedJob={linkedJob}
                      onAccepted={handleRevisionQueueAccepted}
                    />
                  </div>
                ) : null}
              </div>

              {/* ── Shape next regeneration (collapsed disclosure) ── */}
              {/* Line-level force/exclude that shapes AI evidence input for the NEXT */}
              {/* full Regenerate — NOT the current document. Merged in buildMergedControls. */}
              <div className="mt-5 border-t border-folio-sage-border pt-5">
                <button
                  type="button"
                  onClick={() => setShowBulletControls((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                  aria-expanded={showBulletControls}
                  data-testid="shape-next-regeneration-toggle"
                >
                  <span>Shape next regeneration</span>
                  <ChevronIcon open={showBulletControls} />
                </button>

                {showBulletControls ? (
                  <div className="mt-3 space-y-4">
                    <p className="rounded-lg border border-folio-sage-border bg-folio-surface-container-low px-3 py-2 text-[11px] text-folio-outline">
                      Affects regeneration, not the current document. Force or exclude evidence for the
                      next full Regenerate.
                    </p>
                    {includedExperiences.map((exp, i) => {
                      const expKey = experienceKey(exp.company, exp.role);
                      const bulletsWithKey = exp.bullets.filter(
                        (b) => b.sourceRefs[0]?.bulletKey,
                      );
                      if (bulletsWithKey.length === 0) return null;
                      return (
                        <div key={`${expKey}-${i}`}>
                          <p className="text-[11px] font-semibold text-folio-on-surface">
                            {exp.company} — {exp.role}
                          </p>
                          <div className="mt-1.5 space-y-1.5">
                            {bulletsWithKey.map((bullet) => {
                              const bulletKey = bullet.sourceRefs[0]!.bulletKey!;
                              const isExcluded = lineLevelExcludedBulletKeys.has(bulletKey);
                              return (
                                <label
                                  key={bulletKey}
                                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-folio-sage-border bg-white px-3 py-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!isExcluded}
                                    onChange={() => {
                                      setLineLevelExcludedBulletKeys((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(bulletKey)) next.delete(bulletKey);
                                        else next.add(bulletKey);
                                        return next;
                                      });
                                    }}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-folio-primary-container"
                                  />
                                  <span
                                    className={`text-[12px] leading-relaxed ${isExcluded ? "text-folio-outline line-through" : "text-folio-on-surface"}`}
                                  >
                                    {bullet.text}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {excludedExperiences.some((exp) =>
                      exp.bullets.some((b) => b.inventoryBulletKey),
                    ) ? (
                      <div>
                        <p className="text-[11px] font-semibold text-folio-outline">
                          Force from excluded experiences
                        </p>
                        <p className="mt-0.5 text-[10px] text-folio-outline">
                          Checked bullets will be forced into the next regeneration.
                        </p>
                        {excludedExperiences.map((exp) => {
                          const expKey = experienceKey(exp.company, exp.role);
                          const bulletsWithKey = exp.bullets.filter((b) => b.inventoryBulletKey);
                          if (bulletsWithKey.length === 0) return null;
                          return (
                            <div key={expKey} className="mt-2">
                              <p className="text-[11px] text-folio-outline">
                                {exp.company} — {exp.role}
                              </p>
                              <div className="mt-1.5 space-y-1.5">
                                {bulletsWithKey.map((bullet) => {
                                  const bulletKey = bullet.inventoryBulletKey!;
                                  const isForced = lineLevelForcedBulletKeys.has(bulletKey);
                                  return (
                                    <label
                                      key={bulletKey}
                                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-folio-sage-border bg-white px-3 py-2"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isForced}
                                        onChange={() => {
                                          setLineLevelForcedBulletKeys((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(bulletKey)) next.delete(bulletKey);
                                            else next.add(bulletKey);
                                            return next;
                                          });
                                        }}
                                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-folio-primary-container"
                                      />
                                      <span
                                        className={`text-[12px] leading-relaxed ${isForced ? "text-folio-on-surface" : "text-folio-outline"}`}
                                      >
                                        {bullet.description}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {lineLevelExcludedBulletKeys.size > 0 ||
                    lineLevelForcedBulletKeys.size > 0 ? (
                      <p className="text-xs text-folio-outline">
                        Changes take effect on next Regenerate.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* ── Tailoring diagnostics (collapsed disclosure) ────── */}
              <div className="mt-5 border-t border-folio-sage-border pt-5">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                  aria-expanded={showDiagnostics}
                  data-testid="tailoring-diagnostics-toggle"
                >
                  <span>Tailoring diagnostics</span>
                  <ChevronIcon open={showDiagnostics} />
                </button>

                {showDiagnostics ? (
                  tailoringDiagnostics ? (
                    <div className="mt-3 space-y-4">
                      {tailoringDiagnostics.selectedEvidence.length > 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-folio-on-surface">
                            Strongest evidence selected
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {tailoringDiagnostics.selectedEvidence.map((line) => (
                              <li key={line.id} className="text-xs text-folio-on-surface">
                                {line.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {tailoringDiagnostics.omittedEvidence.length > 0 ? (
                        <div data-testid="tailoring-omitted-evidence">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-folio-outline">
                            Omitted evidence
                          </p>
                          <p className="mt-0.5 text-[10px] text-folio-outline">
                            Advisory only — not a defect.
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {tailoringDiagnostics.omittedEvidence.map((line) => (
                              <li key={line.id} className="text-xs text-folio-outline">
                                {line.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {tailoringDiagnostics.warnings.length > 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-folio-cta-secondary">
                            Warnings
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {tailoringDiagnostics.warnings.map((line) => (
                              <li key={line.id} className="text-xs text-folio-cta-secondary">
                                {line.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {tailoringDiagnostics.selectedEvidence.length === 0 &&
                      tailoringDiagnostics.omittedEvidence.length === 0 &&
                      tailoringDiagnostics.warnings.length === 0 ? (
                        <p className="text-sm text-folio-outline">
                          No diagnostics available — regenerate with a job description to see
                          tailoring signals.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-folio-outline">
                      No diagnostics available for this draft.
                    </p>
                  )
                ) : null}
              </div>
            </div>
            ) : null}
          </div>

          {/* ── Export & delivery (full width, bottom) ───────────── */}
          <section
            data-testid="output-approve-export"
            className="rounded-xl border border-folio-sage-border bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.01em] text-folio-on-surface">
                  Export and delivery
                </h2>
                <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-folio-outline">
                  {exportReady
                    ? "Approved for export. The server confirmed this resume fits one page."
                    : "Approve runs a server one-page check. Export unlocks only after it passes."}
                </p>
              </div>
              {exportReady ? (
                <span className="rounded-full border border-folio-olive-border bg-folio-mint-surface px-2.5 py-0.5 text-[11px] font-medium text-folio-olive-text">
                  Approved for export
                </span>
              ) : null}
            </div>

            {validationFailure ? (
              <div
                data-testid="output-one-page-block"
                className="mt-4 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2.5 text-sm text-[#ba1a1a]"
              >
                <p className="font-medium">
                  Export blocked — server PDF is {validationFailure.pageCount} pages
                </p>
                <p className="mt-1 leading-relaxed">{validationFailure.message}</p>
                {validationFailure.suggestedActions.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationFailure.suggestedActions.slice(0, 4).map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {layoutChangedAfterApproval ? (
              <div className="mt-4 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2.5 text-sm text-folio-cta-secondary">
                Layout or content changed after approval. Re-approve for export before downloading.
              </div>
            ) : null}

            {exportMessage ? (
              <p className="mt-4 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-sm text-folio-cta-secondary">
                {exportMessage}
              </p>
            ) : null}

            {exportReady ? (
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-folio-outline">
                  Export
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={isExportingPdf}
                    className={PRIMARY_BUTTON}
                  >
                    {isExportingPdf ? "Exporting…" : "Export PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportDocx()}
                    disabled={isExportingDocx}
                    className={GHOST_BUTTON}
                  >
                    {isExportingDocx ? "Exporting…" : "Export DOCX"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={isApproving}
                    data-action="reapprove-for-export"
                    className={GHOST_BUTTON}
                  >
                    {isApproving ? "Validating server PDF…" : "Re-approve for export"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-folio-outline">
                    Step 1 — Approve
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={isApproving}
                    data-action="approve-for-export"
                    className={`mt-2 w-full ${PRIMARY_BUTTON}`}
                  >
                    {approveLabel}
                  </button>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-folio-outline/70">
                    Step 2 — Export (after approval)
                  </p>
                  <p className="mt-1 text-xs text-folio-outline">Approve first to enable export.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled className={PRIMARY_BUTTON}>
                      Export PDF
                    </button>
                    <button type="button" disabled className={GHOST_BUTTON}>
                      Export DOCX
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* ── Cover letter tab ─────────────────────────────────── */
        <CoverLetterTab
          resumeDraft={draft}
          companyContext={companyContext}
          inventory={inventory}
          jobDescriptions={jobDescriptions}
        />
      )}
    </div>
  );
}
