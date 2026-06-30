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
import {
  FORMAL_COVER_LETTER_MAX_WORDS,
  isOverWordLimit,
} from "@/lib/cover-letter/word-limits";
import { buildCoverLetterGenerationOptions } from "@/lib/generate/build-cover-letter-options";
import {
  buildCoverLetterInstructionPolicy,
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
  buildResumeExperienceDisplayEntries,
  isResumeStageTargetCurrent,
  updateResumeSkillGroupItems,
} from "@/lib/resume-draft/editor-display";
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

// ── M11 staging model ─────────────────────────────────────────────────────────
// A spine-ranked alternative bullet the user can pick to replace a bullet.
type AlternativeBullet = {
  id: string;
  text: string;
  label: string;
  score: number;
  roleKey: string;
  bulletKey?: string;
};

// One staged replacement: the picked alternative text + an optional per-bullet
// instruction. Applied via the additive single_bullet revise-resume-scope branch.
type ResumeStageEntry = {
  pickedText: string;
  instruction: string;
  originalText: string;
};
type ResumeStageMap = Map<string, ResumeStageEntry>;

type ResumeTextDocumentProps = {
  draft: GeneratedResumeDraftRecord;
  linkedJob: StoredJobDescription | null;
  /** Persists an edited content with the M5a invalidation path (downgrades approval). */
  onApplyContentEdit: (next: ResumeDraftContent) => Promise<void>;
  /** Page-level busy flag (regenerate/approve) — disables in-document mutations. */
  disabled: boolean;
  // ── Lifted staging bucket (M11) — survives Resume↔Cover-letter view switches.
  /** Spine-ranked alternative bullets (all roles) offered by the Replace picker. */
  alternatives: AlternativeBullet[];
  /** Staged replacements, keyed by bulletStageKey. Owned by the parent. */
  stage: ResumeStageMap;
  setStage: React.Dispatch<React.SetStateAction<ResumeStageMap>>;
  /** Bucket-level custom instruction applied to every staged bullet on Apply. */
  stageInstruction: string;
  setStageInstruction: (value: string) => void;
  /** Relocks layout and approval as soon as a replacement is newly staged. */
  onStageCreated: () => void;
};

function ResumeTextDocument({
  draft,
  linkedJob,
  onApplyContentEdit,
  disabled,
  alternatives,
  stage,
  setStage,
  stageInstruction,
  setStageInstruction,
  onStageCreated,
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

  // Replace = pick-from-spine then tailor (M11). The picker for one bullet is
  // open when pickingForKey matches its stage key. Staged picks live in the
  // parent (props.stage) so they survive Resume↔Cover-letter view switches.
  const [pickingForKey, setPickingForKey] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceWarnings, setReplaceWarnings] = useState<string[]>([]);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const hasJob = Boolean(linkedJob?.rawText?.trim());
  const modelTier = useMemo(
    () => resolveResumeModelTierForDraft({ draftTier: draft.inputSnapshot?.resumeModelTier }),
    [draft.inputSnapshot?.resumeModelTier],
  );
  const displayExperiences = useMemo(
    () => buildResumeExperienceDisplayEntries(content.experience),
    [content.experience],
  );

  function openSection(section: string) {
    if (stage.size > 0) return;
    setSectionDraft(content);
    setEditingSection(section);
    setDocError(null);
  }

  function closeSection() {
    setEditingSection(null);
    setSectionDraft(null);
  }

  async function saveSection() {
    if (!sectionDraft || isSavingSection || stage.size > 0) return;
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
    if (stage.size > 0) return;
    setEditingBulletKey(bulletStageKey(roleIndex, bulletIndex));
    setBulletEditText(currentText);
    setDocError(null);
  }

  async function saveBulletEdit(roleIndex: number, bulletIndex: number) {
    const key = bulletStageKey(roleIndex, bulletIndex);
    if (busyBulletKey || stage.size > 0) return;
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
    if (busyBulletKey || stage.size > 0) return;
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
      setStage((prev) => {
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

  // Open/close the spine-ranked alternatives picker for one bullet.
  function openPicker(roleIndex: number, bulletIndex: number) {
    setPickingForKey(bulletStageKey(roleIndex, bulletIndex));
    setReplaceError(null);
  }

  // Stage a picked alternative as the replacement for the bullet at `key`.
  function pickAlternative(key: string, alternativeText: string, originalText: string) {
    setStage((prev) => {
      const nextMap = new Map(prev);
      const existing = nextMap.get(key);
      nextMap.set(key, {
        pickedText: alternativeText,
        instruction: existing?.instruction ?? "",
        originalText,
      });
      return nextMap;
    });
    closeSection();
    setEditingBulletKey(null);
    onStageCreated();
    setPickingForKey(null);
  }

  function unstageReplace(key: string) {
    setStage((prev) => {
      const nextMap = new Map(prev);
      nextMap.delete(key);
      return nextMap;
    });
  }

  function setEntryInstruction(key: string, instruction: string) {
    setStage((prev) => {
      const nextMap = new Map(prev);
      const existing = nextMap.get(key);
      if (existing) nextMap.set(key, { ...existing, instruction });
      return nextMap;
    });
  }

  // Apply changes to Resume (M11): tailor ONLY the staged (picked) bullets via the
  // additive single_bullet branch and persist. Never re-touches the rest of the
  // resume; never a full regenerate. One-shot — picked text in, tailored text out.
  async function applyResumeStage() {
    if (isReplacing || stage.size === 0 || !linkedJob) return;
    const targets: ResumeSingleBulletRevisionTarget[] = [];
    for (const [key, entry] of stage.entries()) {
      const [ri, bi] = key.split(":").map(Number);
      if (
        !isResumeStageTargetCurrent(content, {
          roleIndex: ri,
          bulletIndex: bi,
          originalText: entry.originalText,
        })
      ) {
        setReplaceError(
          "The resume changed after replacements were staged. Clear staging and pick again.",
        );
        return;
      }
      const instruction = [entry.instruction, stageInstruction]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" ");
      targets.push({
        roleIndex: ri,
        bulletIndex: bi,
        // The picked alternative is the basis the model tailors to JD context.
        currentText: entry.pickedText,
        customInstruction: instruction || undefined,
      });
    }
    if (targets.length === 0) return;

    setIsReplacing(true);
    setReplaceError(null);
    setReplaceWarnings([]);
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
      const next = applyResumeSingleBulletRevisions(content, response.bulletCandidates);
      await onApplyContentEdit(next);
      setReplaceWarnings(response.warnings);
      setStage(new Map());
      setStageInstruction("");
      setSelectedBulletKey(null);
    } catch (err) {
      setReplaceError(err instanceof Error ? err.message : "Failed to apply resume changes.");
    } finally {
      setIsReplacing(false);
    }
  }

  const docDisabled = disabled || isReplacing;
  const structuralEditsLocked = stage.size > 0;
  const structuralEditDisabled = docDisabled || structuralEditsLocked;

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
              disabled={structuralEditDisabled}
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
                disabled={structuralEditDisabled}
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
          {structuralEditsLocked ? (
            <p
              className="mt-2 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary"
              data-testid="resume-structural-edit-lock"
            >
              Apply or clear staged replacements before editing document structure.
            </p>
          ) : null}
          <div className="mt-3 space-y-4">
            {displayExperiences.map(({ experience: exp, originalIndex: roleIndex }) => {
              const meta = [exp.location, exp.dateRange].filter(Boolean).join(" · ");
              const roleKey = experienceKey(exp.company, exp.role);
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
                          disabled={structuralEditDisabled}
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
                        const currentBulletKeys = new Set(
                          b.sourceRefs.flatMap((ref) => (ref.bulletKey ? [ref.bulletKey] : [])),
                        );
                        const roleAlternatives = alternatives.filter(
                          (alternative) =>
                            alternative.roleKey === roleKey &&
                            alternative.text !== b.text &&
                            (!alternative.bulletKey ||
                              !currentBulletKeys.has(alternative.bulletKey)),
                        );
                        const isSelected = selectedBulletKey === key;
                        const isEditing = editingBulletKey === key;
                        const stagedEntry = stage.get(key);
                        const isStaged = stagedEntry !== undefined;
                        const isPicking = pickingForKey === key;
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
                                  <div className="mt-1 pl-3" data-testid="bullet-replace-staged">
                                    <p className="text-[11px] font-medium text-folio-olive-text">
                                      Replacement picked — tailored on Apply:
                                    </p>
                                    <p
                                      className="mt-0.5 rounded-md border border-folio-olive-border bg-white px-2.5 py-1.5 text-[13px] leading-relaxed text-folio-on-surface"
                                      data-testid="bullet-replace-picked"
                                    >
                                      {stagedEntry.pickedText}
                                    </p>
                                  </div>
                                ) : null}

                                {isSelected ? (
                                  <div className="mt-2 flex flex-wrap gap-2 pl-3" data-testid="bullet-actions">
                                    <button
                                      type="button"
                                      onClick={() => startBulletEdit(roleIndex, bulletIndex, b.text)}
                                      disabled={structuralEditDisabled || bulletBusy}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-edit"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        isPicking
                                          ? setPickingForKey(null)
                                          : openPicker(roleIndex, bulletIndex)
                                      }
                                      disabled={docDisabled || bulletBusy || !hasJob}
                                      title={hasJob ? undefined : "Saved job description required to tailor"}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-replace"
                                    >
                                      {isPicking ? "Close" : isStaged ? "Change pick" : "Replace"}
                                    </button>
                                    {isStaged ? (
                                      <button
                                        type="button"
                                        onClick={() => unstageReplace(key)}
                                        disabled={docDisabled || bulletBusy}
                                        className={GHOST_BUTTON}
                                        data-action="bullet-unstage"
                                      >
                                        Unstage
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => void removeBullet(roleIndex, bulletIndex)}
                                      disabled={structuralEditDisabled || bulletBusy}
                                      className={GHOST_BUTTON}
                                      data-action="bullet-remove"
                                    >
                                      {bulletBusy ? "Removing…" : "Remove"}
                                    </button>
                                  </div>
                                ) : null}

                                {/* Spine-ranked alternatives picker (M11): pick → stage → tailor on Apply. */}
                                {isPicking ? (
                                  <div
                                    className="mt-2 rounded-lg border border-folio-sage-border bg-white p-2"
                                    data-testid="bullet-replace-picker"
                                  >
                                    <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-folio-outline">
                                      Pick a spine-ranked alternative
                                    </p>
                                    {roleAlternatives.length === 0 ? (
                                      <p className="px-1 py-2 text-[12px] text-folio-outline">
                                        No alternative bullets available from your vault.
                                      </p>
                                    ) : (
                                      <ul className="max-h-64 space-y-1 overflow-y-auto">
                                        {roleAlternatives.map((alt) => (
                                          <li key={alt.id}>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                pickAlternative(key, alt.text, b.text)
                                              }
                                              className="w-full rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-folio-sage-border hover:bg-folio-surface-container-low"
                                              data-testid="bullet-replace-option"
                                            >
                                              <span className="block text-[12px] leading-relaxed text-folio-on-surface">
                                                {alt.text}
                                              </span>
                                              <span className="mt-0.5 block text-[10px] text-folio-outline">
                                                {alt.label}
                                              </span>
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
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

          {/* Resume staging bucket (M11) — picked replacements + custom instruction.
              "Apply changes to Resume" tailors ONLY these bullets in one AI step. */}
          {stage.size > 0 ? (
            <div
              className="mt-4 rounded-xl border border-folio-olive-border bg-folio-mint-surface p-4"
              data-testid="resume-stage-bar"
            >
              <p className="text-[13px] font-medium text-folio-olive-text">
                {stage.size} bullet{stage.size === 1 ? "" : "s"} staged for the resume
              </p>
              <p className="mt-0.5 text-[12px] text-folio-olive-text">
                Picked replacements are tailored to the job in one AI step. Only these bullets change —
                the rest of the resume is left untouched.
              </p>
              <ul className="mt-3 space-y-2">
                {[...stage.entries()].map(([key, entry]) => {
                  const [ri, bi] = key.split(":").map(Number);
                  const currentText = content.experience[ri]?.bullets[bi]?.text ?? "";
                  return (
                    <li key={key} className="rounded-lg border border-folio-sage-border bg-white p-3">
                      <p className="text-[10px] uppercase tracking-wide text-folio-outline">Replacing</p>
                      <p className="text-[12px] text-folio-on-surface-variant line-through">{currentText}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-folio-outline">
                        With (tailored on apply)
                      </p>
                      <p className="text-[12px] text-folio-on-surface">{entry.pickedText}</p>
                      <input
                        type="text"
                        value={entry.instruction}
                        onChange={(e) => setEntryInstruction(key, e.target.value)}
                        placeholder="Optional instruction for this bullet (e.g. more metrics-focused)"
                        className={`${INPUT_CLASS} mt-2`}
                        data-testid="bullet-replace-instruction"
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3">
                <label className={LABEL_CLASS}>Custom instruction (applies to all staged bullets)</label>
                <input
                  type="text"
                  value={stageInstruction}
                  onChange={(e) => setStageInstruction(e.target.value)}
                  placeholder="e.g. emphasise measurable outcomes"
                  className={INPUT_CLASS}
                  data-testid="resume-custom-instruction"
                />
              </div>

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

              {isApprovedDraftStatus(draft.status) ? (
                <p className="mt-2 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary">
                  Applying will require re-approval before export.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyResumeStage()}
                  disabled={isReplacing || !hasJob}
                  className={PRIMARY_BUTTON}
                  data-testid="apply-resume-changes"
                >
                  {isReplacing ? "Applying… (1 AI step)" : "Apply changes to Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStage(new Map());
                    setStageInstruction("");
                    setReplaceError(null);
                  }}
                  disabled={isReplacing}
                  className={GHOST_BUTTON}
                  data-testid="resume-clear-staging"
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
                disabled={structuralEditDisabled}
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
                        patchSection((c) =>
                          updateResumeSkillGroupItems(
                            c,
                            groupIdx,
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          ),
                        )
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
                disabled={structuralEditDisabled}
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
                disabled={structuralEditDisabled}
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

// ── M11 cover-letter staging bucket ───────────────────────────────────────────
// Tone, quick-action chips, pending evidence use/avoid, and a custom instruction
// are STAGED (no AI on click). They apply only on "Apply changes to Cover Letter",
// which folds them all into one CL regenerate call.
type CoverLetterStageBucket = {
  tone: ToneOption;
  chipActions: CoverLetterRevisionAction[];
  evidenceControls: CoverLetterEvidenceControls;
  customInstruction: string;
};

function createEmptyCoverLetterStage(): CoverLetterStageBucket {
  return {
    tone: "balanced",
    chipActions: [],
    evidenceControls: { forcedEvidenceIds: [], excludedEvidenceIds: [] },
    customInstruction: "",
  };
}

// Natural-language instruction for each staged quick-action chip, folded into the
// CL regenerate prompt via additionalInstructions.
// Only the staged quick-action chips need an instruction; other revision actions
// are not surfaced as chips, hence Partial.
const CHIP_ACTION_INSTRUCTION: Partial<Record<CoverLetterRevisionAction, string>> = {
  shorten: "Make the cover letter more concise.",
  more_formal: "Use a more formal, professional tone.",
  more_conversational: "Use a more conversational, natural tone.",
  warmer: "Make the tone warmer and more personable.",
  remove_ai_phrases: "Remove generic AI-sounding phrases; keep it specific and human.",
};

const TONE_INSTRUCTION: Record<ToneOption, string> = {
  formal: "Write in a formal tone.",
  balanced: "",
  conversational: "Write in a conversational tone.",
};

// Compose prompt-only staged CL changes. Persistent base instructions are joined
// at call time and saved separately so one-shot staging cannot leak into later applies.
function composeStagedCoverLetterInstructions(stage: CoverLetterStageBucket): string {
  const parts = [
    ...stage.chipActions.map((action) => CHIP_ACTION_INSTRUCTION[action]),
    TONE_INSTRUCTION[stage.tone],
    stage.customInstruction.trim(),
  ];
  return parts.filter(Boolean).join(" ").trim();
}

type CoverLetterTabProps = {
  resumeDraft: GeneratedResumeDraftRecord;
  companyContext: CompanyContext | null;
  inventory: ReturnType<typeof useWorkspace>["inventory"];
  jobDescriptions: StoredJobDescription[];
  /** Lifted CL staging bucket (M11) — survives Resume↔Cover-letter view switches. */
  stage: CoverLetterStageBucket;
  setStage: React.Dispatch<React.SetStateAction<CoverLetterStageBucket>>;
};

function CoverLetterTab({
  resumeDraft,
  companyContext,
  inventory,
  jobDescriptions,
  stage,
  setStage,
}: CoverLetterTabProps) {
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetterDraftRecord | null>(null);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCl, setIsSavingCl] = useState(false);
  const [clIsEditMode, setClIsEditMode] = useState(false);
  const [showEvidenceStaging, setShowEvidenceStaging] = useState(false);
  const originalCoverLetterBodyRef = useRef<string | null>(null);
  // Tone and evidence controls now live in the staged bucket (props.stage).
  const tone = stage.tone;
  const pendingEvidenceControls = stage.evidenceControls;

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
  const isBusy = isRegenerating || isGenerating || isSavingCl;
  const hasStagedChanges =
    stage.chipActions.length > 0 ||
    stage.tone !== "balanced" ||
    stage.customInstruction.trim().length > 0 ||
    hasCoverLetterEvidenceControls(stage.evidenceControls);

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

  // Evidence use/avoid is staged (M11) — applied only on "Apply changes to Cover
  // Letter". Toggling never calls AI and never persists on its own.
  function toggleForceEvidence(id: string) {
    setStage((prev) => {
      const norm = normalizeCoverLetterEvidenceControls(prev.evidenceControls);
      const isForced = norm.forcedEvidenceIds.includes(id);
      return {
        ...prev,
        evidenceControls: normalizeCoverLetterEvidenceControls({
          forcedEvidenceIds: isForced
            ? norm.forcedEvidenceIds.filter((x) => x !== id)
            : [...norm.forcedEvidenceIds, id],
          excludedEvidenceIds: norm.excludedEvidenceIds.filter((x) => x !== id),
        }),
      };
    });
  }

  function toggleExcludeEvidence(id: string) {
    setStage((prev) => {
      const norm = normalizeCoverLetterEvidenceControls(prev.evidenceControls);
      const isExcluded = norm.excludedEvidenceIds.includes(id);
      return {
        ...prev,
        evidenceControls: normalizeCoverLetterEvidenceControls({
          forcedEvidenceIds: norm.forcedEvidenceIds.filter((x) => x !== id),
          excludedEvidenceIds: isExcluded
            ? norm.excludedEvidenceIds.filter((x) => x !== id)
            : [...norm.excludedEvidenceIds, id],
        }),
      };
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

  // Quick-action chips are STAGED, not applied immediately (M11). Toggling adds or
  // removes the action from the bucket; it applies on "Apply changes to Cover Letter".
  function toggleChipAction(action: CoverLetterRevisionAction) {
    setStage((prev) => ({
      ...prev,
      chipActions: prev.chipActions.includes(action)
        ? prev.chipActions.filter((a) => a !== action)
        : [...prev.chipActions, action],
    }));
  }

  // Tone is staged (M11) — no immediate AI. It is folded into the regenerate prompt.
  function handleSelectTone(next: ToneOption) {
    setStage((prev) => ({ ...prev, tone: next }));
  }

  async function handleRegenerate() {
    if (!coverLetter || isBusy) return;
    if (clIsEditMode || clIsDirty) {
      setError("Save or Cancel your manual cover letter edits before applying changes.");
      return;
    }
    if (!linkedJob) {
      setError("Saved job description is required to regenerate the cover letter.");
      return;
    }
    if (!window.confirm(REGENERATE_COVER_LETTER_CONFIRM)) return;

    setIsRegenerating(true);
    setError(null);
    try {
      // Fold ALL staged CL changes (tone + chips + custom instruction) into the
      // single regenerate call, alongside the staged evidence controls (M11).
      const stagedInstructions = composeStagedCoverLetterInstructions(stage);
      const instructionPolicy = buildCoverLetterInstructionPolicy(
        coverLetter.additionalInstructions,
        stagedInstructions,
      );
      const updated = await generateAndSaveCoverLetterDraft({
        ...buildCoverLetterGenerationOptions({
          job: linkedJob,
          resumeDraft,
          inventory,
          applicationId: coverLetter.applicationId ?? resumeDraft.applicationId,
          fields: {
            country: coverLetter.country,
            companyWebsite: coverLetter.companyWebsite,
            additionalInstructions: instructionPolicy.promptInstructions,
          },
          savedCompanyContext: companyContext ?? coverLetter.companyContext,
        }),
        existingCoverLetterId: coverLetter.id,
        // One-shot staged guidance affects this prompt only. The saved draft keeps
        // its persistent base instructions so the next Apply starts clean.
        persistentAdditionalInstructions: instructionPolicy.persistentInstructions,
        // Pending-only evidence staging — applied on regenerate only, never persisted.
        evidenceControls: normalizeCoverLetterEvidenceControls(stage.evidenceControls),
      });
      setCoverLetter(updated);
      setBody(updated.body);
      originalCoverLetterBodyRef.current = updated.body;
      // Staging is single-use: clear the whole CL bucket after applying.
      setStage(createEmptyCoverLetterStage());
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

      {/* Quick-action chips (M11) — STAGED, not applied on click. A staged chip is
          highlighted; it applies on "Apply changes to Cover Letter". */}
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ action, label }) => {
          const staged = stage.chipActions.includes(action);
          return (
            <button
              key={action}
              type="button"
              onClick={() => toggleChipAction(action)}
              disabled={clIsEditMode || clIsDirty}
              aria-pressed={staged}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                staged
                  ? "border border-folio-olive-border bg-folio-mint-surface text-folio-olive-text"
                  : "border border-folio-sage-border bg-white text-folio-on-surface hover:bg-folio-surface-container-low"
              }`}
              data-action="stage-cl-chip"
            >
              {staged ? `Staged: ${label}` : label}
            </button>
          );
        })}
      </div>

      {/* Tone selector (M11) — staged, applied on "Apply changes to Cover Letter" */}
      <div className="mt-5">
        <p className="text-[13px] font-medium text-folio-outline">Tone</p>
        <div className="mt-2 inline-flex rounded-lg border border-folio-sage-border bg-white p-0.5">
          {TONE_SEGMENTS.map((segment) => {
            const active = tone === segment.key;
            return (
              <button
                key={segment.key}
                type="button"
                onClick={() => handleSelectTone(segment.key)}
                disabled={clIsEditMode || clIsDirty}
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
            disabled={clIsEditMode || clIsDirty}
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
                            disabled={isBusy || clIsEditMode || clIsDirty}
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
                            disabled={isBusy || clIsEditMode || clIsDirty}
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

      {/* Custom instruction (M11) — staged into the CL bucket; applied on Apply. */}
      <div className="mt-5">
        <label className={LABEL_CLASS}>Custom instruction (optional)</label>
        <textarea
          rows={2}
          value={stage.customInstruction}
          onChange={(e) => setStage((prev) => ({ ...prev, customInstruction: e.target.value }))}
          disabled={clIsEditMode || clIsDirty}
          placeholder="e.g. mention my relocation timeline; lead with the fintech project"
          className={TEXTAREA_CLASS}
          data-testid="cl-custom-instruction"
        />
      </div>

      {/* Apply staged CL changes (M11) — one full regenerate folding tone + chips +
          evidence use/avoid + custom instruction. Separate from the resume Apply. */}
      <div className="mt-5">
        {hasStagedChanges ? (
          <p
            className="mb-2 rounded-lg border border-folio-olive-border bg-folio-mint-surface px-3 py-2 text-[12px] text-folio-olive-text"
            data-testid="cl-staged-summary"
          >
            Staged changes will be folded into one regenerate:
            {stage.tone !== "balanced" ? ` ${stage.tone} tone;` : ""}
            {stage.chipActions.length > 0 ? ` ${stage.chipActions.length} quick action(s);` : ""}
            {hasCoverLetterEvidenceControls(stage.evidenceControls)
              ? ` ${stage.evidenceControls.forcedEvidenceIds.length + stage.evidenceControls.excludedEvidenceIds.length} evidence choice(s);`
              : ""}
            {stage.customInstruction.trim() ? " custom instruction;" : ""}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={isBusy || !linkedJob || clIsEditMode || clIsDirty}
          className={`w-full ${hasStagedChanges ? PRIMARY_BUTTON : GHOST_BUTTON}`}
          data-testid="apply-cover-letter-changes"
        >
          <RefreshIcon />
          {isRegenerating
            ? "Applying… (1 AI step)"
            : hasStagedChanges
              ? "Apply changes to Cover Letter"
              : "Regenerate cover letter"}
        </button>
        {clIsEditMode || clIsDirty ? (
          <p className="mt-2 text-sm text-folio-outline" data-testid="cl-apply-edit-guard">
            Save or Cancel your manual edits before applying staged changes.
          </p>
        ) : null}
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
      className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-3"
      data-testid="output-layout-sliders"
    >
      <p className="text-[13px] font-medium text-folio-on-surface">Layout</p>
      <p className="mt-0.5 text-[11px] leading-snug text-folio-outline">
        Fine-tune the PDF. Server validation remains the export gate.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3">
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

  // ── M11 staging buckets (in-memory; survive Resume↔Cover-letter view switches) ──
  const [resumeStage, setResumeStage] = useState<ResumeStageMap>(new Map());
  const [resumeStageInstruction, setResumeStageInstruction] = useState("");
  const [clStage, setClStage] = useState<CoverLetterStageBucket>(createEmptyCoverLetterStage);
  // Content gate (UI-only): Layout sliders + Approve unlock only once the user
  // confirms content; any new content edit re-locks them. The persisted server
  // one-page 422 gate is unchanged — this lock sits in front of it.
  const [contentConfirmed, setContentConfirmed] = useState(false);

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

      // Only persisted approval proves content confirmation after reload.
      // layout_changed may include a later content edit, so it re-locks.
      setContentConfirmed(isApprovedDraftStatus(record.status));

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

  // Spine-ranked work bullets for the Replace picker (M11). The picker filters
  // this deterministic pool to the selected role before displaying alternatives.
  const bulletAlternatives = useMemo<AlternativeBullet[]>(() => {
    if (!draft || !linkedJob) return [];
    const collated = buildActiveCollatedInventory(inventory);
    const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(inventory.enrichment);
    const companyCtx =
      companyContext ??
      buildCompanyContext({
        companyName: linkedJob.companyName ?? "Company",
        country: "Singapore",
        jobDescriptionText: linkedJob.rawText,
        roleTitle: linkedJob.roleTitle,
      });
    const spine = buildEvidenceSpine({
      collated,
      enrichment: inventory.enrichment,
      jdText: linkedJob.rawText,
      roleTitle: linkedJob.roleTitle ?? draft.content.targetRoleTitle,
      maxWorkBullets: MAX_RESUME_DRAFT_BULLETS,
      regenerationControls: draft.inputSnapshot?.regenerationControls,
      companyContext: companyCtx,
      acceptedWordingByBulletKey,
    });
    return spine.ranked
      .filter((item) => item.sourceType === "work_bullet")
      .map((item) => ({
        id: item.id,
        text: (item.editedText ?? item.originalText).trim(),
        label: item.displayLabel,
        score: item.relevanceScore,
        roleKey: experienceKey(
          item.experience?.company ?? "",
          item.experience?.role ?? "",
        ),
        bulletKey: item.bulletKey,
      }))
      .filter((alt) => alt.text.length > 0 && alt.roleKey !== experienceKey("", ""));
  }, [draft, linkedJob, inventory, companyContext]);

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
    // M11 gate: any new content edit re-locks Layout + Approve until re-confirmed.
    setContentConfirmed(false);
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
    if (!draftId || !contentConfirmed || resumeStage.size > 0) return;
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
    if (!draft || isRegenerating || resumeStage.size > 0) return;
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
      // Full regenerate is new content — re-lock the content gate (M11) and clear
      // any staged resume picks that referenced the previous document.
      setContentConfirmed(false);
      setResumeStage(new Map());
      setResumeStageInstruction("");
    } catch (regenError) {
      setError(
        regenError instanceof Error ? regenError.message : "Resume regeneration failed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleApprove() {
    if (!draft || isApproving || !contentConfirmed || resumeStage.size > 0) return;
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

              {/* ── Content gate (M11, UI-only) — confirm content → unlock layout ── */}
              <div
                className="mb-3 rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-3"
                data-testid="output-content-gate"
              >
                {contentConfirmed ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-folio-olive-text">
                      <span className="rounded-full bg-folio-mint-surface px-2 py-0.5 text-[11px]">
                        Content confirmed
                      </span>
                      Layout and approve are unlocked.
                    </span>
                    <button
                      type="button"
                      onClick={() => setContentConfirmed(false)}
                      className={GHOST_BUTTON}
                      data-testid="output-edit-content-again"
                    >
                      Edit content again
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] text-folio-outline">
                      {resumeStage.size > 0
                        ? "Apply or clear staged changes, then confirm content to unlock layout and approve."
                        : "Confirm content to unlock layout adjustments and approval."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setContentConfirmed(true)}
                      disabled={resumeStage.size > 0 || isRegenerating || isApproving}
                      className={PRIMARY_BUTTON}
                      data-testid="output-confirm-content"
                    >
                      Confirm content
                    </button>
                  </div>
                )}
              </div>

              {documentView === "pdf" && pdfDocumentModel ? (
                <div
                  className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start"
                  data-testid="output-pdf-layout-split"
                >
                  <div className="min-w-0 xl:w-4/5">
                    <ResumePdfPreview
                      documentModel={pdfDocumentModel}
                      data-testid="output-pdf-preview"
                    />
                  </div>
                  <aside className="min-w-0 xl:w-1/5">
                    {!contentConfirmed ? (
                      <p
                        className="mb-3 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary"
                        data-testid="output-layout-locked-note"
                      >
                        Confirm content to adjust layout.
                      </p>
                    ) : null}
                    <LayoutSliders
                      settings={activeLayoutSettings}
                      onChange={updateLayoutSettings}
                      optimizationNote={optimizationNote}
                      disabled={isRegenerating || isApproving || !contentConfirmed}
                    />
                  </aside>
                </div>
              ) : (
                <div className="rounded-xl border border-folio-sage-border bg-white p-6">
                  <ResumeTextDocument
                    draft={draft}
                    linkedJob={linkedJob}
                    onApplyContentEdit={applyContentEdit}
                    disabled={isRegenerating || isApproving}
                    alternatives={bulletAlternatives}
                    stage={resumeStage}
                    setStage={setResumeStage}
                    stageInstruction={resumeStageInstruction}
                    setStageInstruction={setResumeStageInstruction}
                    onStageCreated={() => setContentConfirmed(false)}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={
                  isRegenerating ||
                  resumeStage.size > 0 ||
                  !linkedJob ||
                  !draft.referenceResumeId
                }
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
                    {resumeStage.size > 0 ? (
                      <p className="rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[12px] text-folio-cta-secondary">
                        Apply or clear staged replacements before editing document structure.
                      </p>
                    ) : (
                      <ResumeRevisionQueue
                        draft={draft}
                        linkedJob={linkedJob}
                        onAccepted={handleRevisionQueueAccepted}
                      />
                    )}
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
                    disabled={isApproving || !contentConfirmed}
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
                    disabled={isApproving || !contentConfirmed}
                    data-action="approve-for-export"
                    className={`mt-2 w-full ${PRIMARY_BUTTON}`}
                  >
                    {approveLabel}
                  </button>
                  {!contentConfirmed ? (
                    <p
                      className="mt-1 text-xs text-folio-outline"
                      data-testid="output-approve-locked-note"
                    >
                      Confirm content above to enable approval.
                    </p>
                  ) : null}
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
          stage={clStage}
          setStage={setClStage}
        />
      )}
    </div>
  );
}
