"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";
import { ResumePdfPreview } from "@/components/resume-drafts/ResumePdfPreview";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
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
  deliverExportedFile,
  exportResumeDocxFromApi,
  exportResumePdfFromApi,
} from "@/lib/resume-draft/export-client";
import {
  buildResumeDraftPayloadFromInventory,
  normalizeRegenerationControls,
} from "@/lib/resume-draft/payload";
import { DEFAULT_RESUME_LAYOUT_SETTINGS } from "@/lib/resume-draft/document-model";
import {
  approveResumeDraftForExport,
  formatOnePageBlockedMessage,
  ResumePdfOnePageBlockedError,
} from "@/lib/resume-draft/approve-resume-draft-client";
import { resolveDraftStatusAfterContentEdit } from "@/lib/resume-draft/apply-evidence-changes";
import {
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
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
  PACKAGE_FIT_SUMMARY_UNAVAILABLE,
} from "@/lib/package/fit-summary";
import { buildPackageTailoringDiagnostics } from "@/lib/package/tailoring-diagnostics";
import { getApplicationRecordFromCloud, updateApplicationRecordInCloud } from "@/lib/supabase/application-records";
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

// ── Rendered resume document (read-only, left panel) ──────────────────────────

function RenderedResume({ draft }: { draft: GeneratedResumeDraftRecord }) {
  const { content } = draft;
  const header = content.header;
  const contactLine = [header.location, header.email, header.phone, header.linkedin]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="text-folio-on-surface">
      {/* Header */}
      <header className="text-center">
        {header.fullName ? (
          <h2 className="text-2xl font-semibold tracking-tight">{header.fullName}</h2>
        ) : null}
        {contactLine ? (
          <p className="mt-1.5 text-xs text-folio-outline">{contactLine}</p>
        ) : null}
      </header>

      {/* Experience */}
      {content.experience.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Experience
          </h3>
          <div className="mt-3 space-y-4">
            {content.experience.map((exp, i) => {
              const meta = [exp.location, exp.dateRange].filter(Boolean).join(" · ");
              return (
                <div key={`${exp.company}-${exp.role}-${i}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold">
                      {exp.role}
                      <span className="font-normal text-folio-on-surface-variant"> · {exp.company}</span>
                    </p>
                    {meta ? <p className="text-xs text-folio-outline">{meta}</p> : null}
                  </div>
                  {exp.bullets.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.map((b, bi) => (
                        <li key={bi} className="flex gap-2 text-[13px] leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-folio-outline" />
                          <span>{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Skills */}
      {content.skills.groups.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Skills
          </h3>
          <dl className="mt-3 space-y-1.5">
            {content.skills.groups.map((group) => (
              <div key={group.label} className="flex gap-2 text-[13px]">
                <dt className="font-semibold">{group.label}:</dt>
                <dd className="text-folio-on-surface-variant">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Education */}
      {content.education.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Education
          </h3>
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
        </section>
      ) : null}

      {/* Additional experience */}
      {content.additionalExperience.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Additional experience
          </h3>
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
        </section>
      ) : null}
    </div>
  );
}

// ── Structured editor ─────────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-folio-sage-border bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none resize-none";

const LABEL_CLASS = "block text-[12px] font-medium text-folio-outline mb-1";

const ADD_BULLET_CLASS =
  "mt-1.5 text-[12px] font-medium text-folio-primary-container hover:underline focus:outline-none";

const REMOVE_BULLET_CLASS =
  "ml-2 shrink-0 text-[11px] text-folio-outline hover:text-folio-error focus:outline-none";

type StructuredResumeEditorProps = {
  content: ResumeDraftContent;
  onChange: (updated: ResumeDraftContent) => void;
};

function StructuredResumeEditor({ content, onChange }: StructuredResumeEditorProps) {
  function setHeader(field: keyof typeof content.header, value: string | boolean) {
    onChange({ ...content, header: { ...content.header, [field]: value } });
  }

  function setSummary(text: string) {
    onChange({ ...content, professionalSummary: { ...content.professionalSummary, text } });
  }

  // ── Experience ──

  function setExpField(
    expIdx: number,
    field: keyof ResumeDraftExperienceSection,
    value: string,
  ) {
    const experience = content.experience.map((exp, i) =>
      i === expIdx ? { ...exp, [field]: value } : exp,
    );
    onChange({ ...content, experience });
  }

  function setExpBullet(expIdx: number, bulletIdx: number, text: string) {
    const experience = content.experience.map((exp, i) => {
      if (i !== expIdx) return exp;
      const bullets = exp.bullets.map((b, bi) =>
        bi === bulletIdx ? { ...b, text } : b,
      );
      return { ...exp, bullets };
    });
    onChange({ ...content, experience });
  }

  function addExpBullet(expIdx: number) {
    const experience = content.experience.map((exp, i) => {
      if (i !== expIdx) return exp;
      return {
        ...exp,
        bullets: [
          ...exp.bullets,
          { text: "", sourceRefs: [], confidence: "medium" as const, riskFlags: [] },
        ],
      };
    });
    onChange({ ...content, experience });
  }

  function removeExpBullet(expIdx: number, bulletIdx: number) {
    const experience = content.experience.map((exp, i) => {
      if (i !== expIdx) return exp;
      return { ...exp, bullets: exp.bullets.filter((_, bi) => bi !== bulletIdx) };
    });
    onChange({ ...content, experience });
  }

  // ── Education ──

  function setEduField(
    eduIdx: number,
    field: "institution" | "location" | "dateRange",
    value: string,
  ) {
    const education = content.education.map((edu, i) =>
      i === eduIdx ? { ...edu, [field]: value } : edu,
    );
    onChange({ ...content, education });
  }

  function setEduBullet(eduIdx: number, bulletIdx: number, text: string) {
    const education = content.education.map((edu, i) => {
      if (i !== eduIdx) return edu;
      const bullets = edu.bullets.map((b, bi) => (bi === bulletIdx ? text : b));
      return { ...edu, bullets };
    });
    onChange({ ...content, education });
  }

  function addEduBullet(eduIdx: number) {
    const education = content.education.map((edu, i) => {
      if (i !== eduIdx) return edu;
      return { ...edu, bullets: [...edu.bullets, ""] };
    });
    onChange({ ...content, education });
  }

  function removeEduBullet(eduIdx: number, bulletIdx: number) {
    const education = content.education.map((edu, i) => {
      if (i !== eduIdx) return edu;
      return { ...edu, bullets: edu.bullets.filter((_, bi) => bi !== bulletIdx) };
    });
    onChange({ ...content, education });
  }

  // ── Skills ──

  function setSkillGroupLabel(groupIdx: number, label: string) {
    const groups = content.skills.groups.map((g, i) => (i === groupIdx ? { ...g, label } : g));
    onChange({ ...content, skills: { ...content.skills, groups } });
  }

  function setSkillGroupItems(groupIdx: number, rawItems: string) {
    const items = rawItems
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const groups = content.skills.groups.map((g, i) =>
      i === groupIdx ? { ...g, items } : g,
    );
    onChange({ ...content, skills: { ...content.skills, groups } });
  }

  function addSkillGroup() {
    const groups = [...content.skills.groups, { label: "", items: [] }];
    onChange({ ...content, skills: { ...content.skills, groups } });
  }

  function removeSkillGroup(groupIdx: number) {
    const groups = content.skills.groups.filter((_, i) => i !== groupIdx);
    onChange({ ...content, skills: { ...content.skills, groups } });
  }

  // ── Additional experience ──

  function setAdditionalItem(
    idx: number,
    field: "category" | "text",
    value: string,
  ) {
    const additionalExperience = content.additionalExperience.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange({ ...content, additionalExperience });
  }

  function addAdditionalItem() {
    onChange({
      ...content,
      additionalExperience: [
        ...content.additionalExperience,
        { category: "", text: "", riskFlags: [] },
      ],
    });
  }

  function removeAdditionalItem(idx: number) {
    onChange({
      ...content,
      additionalExperience: content.additionalExperience.filter((_, i) => i !== idx),
    });
  }

  return (
    <div
      className="space-y-6 text-folio-on-surface"
      data-testid="structured-resume-editor"
    >
      {/* Header / contact */}
      <section>
        <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
          Header
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              { field: "fullName", label: "Full name", placeholder: "Jane Smith" },
              { field: "email", label: "Email", placeholder: "jane@example.com" },
              { field: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
              { field: "location", label: "Location", placeholder: "San Francisco, CA" },
              { field: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/jane" },
            ] as const
          ).map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className={LABEL_CLASS}>{label}</label>
              <input
                type="text"
                value={(content.header[field] as string | undefined) ?? ""}
                onChange={(e) => setHeader(field, e.target.value)}
                placeholder={placeholder}
                className={INPUT_CLASS}
                data-testid={`editor-header-${field}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Professional summary */}
      {content.professionalSummary.text !== undefined ? (
        <section>
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Professional summary
          </h3>
          <div className="mt-3">
            <textarea
              value={content.professionalSummary.text}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className={TEXTAREA_CLASS}
              placeholder="A brief professional summary…"
              data-testid="editor-summary"
            />
          </div>
        </section>
      ) : null}

      {/* Experience */}
      {content.experience.length > 0 ? (
        <section>
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Experience
          </h3>
          <div className="mt-3 space-y-5">
            {content.experience.map((exp, expIdx) => (
              <div
                key={expIdx}
                className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4"
                data-testid="editor-experience-item"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>Role</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => setExpField(expIdx, "role", e.target.value)}
                      className={INPUT_CLASS}
                      data-testid="editor-exp-role"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => setExpField(expIdx, "company", e.target.value)}
                      className={INPUT_CLASS}
                      data-testid="editor-exp-company"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Location</label>
                    <input
                      type="text"
                      value={exp.location ?? ""}
                      onChange={(e) => setExpField(expIdx, "location", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Date range</label>
                    <input
                      type="text"
                      value={exp.dateRange ?? ""}
                      onChange={(e) => setExpField(expIdx, "dateRange", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={LABEL_CLASS}>Bullets</label>
                  <div className="space-y-1.5">
                    {exp.bullets.map((bullet, bulletIdx) => (
                      <div key={bulletIdx} className="flex items-start gap-1.5">
                        <textarea
                          value={bullet.text}
                          onChange={(e) => setExpBullet(expIdx, bulletIdx, e.target.value)}
                          rows={2}
                          className={`${TEXTAREA_CLASS} flex-1`}
                          data-testid="editor-exp-bullet"
                        />
                        <button
                          type="button"
                          onClick={() => removeExpBullet(expIdx, bulletIdx)}
                          className={REMOVE_BULLET_CLASS}
                          aria-label="Remove bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addExpBullet(expIdx)}
                    className={ADD_BULLET_CLASS}
                  >
                    + Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Skills */}
      <section>
        <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
          Skills
        </h3>
        <div className="mt-3 space-y-2.5">
          {content.skills.groups.map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="flex items-start gap-2"
              data-testid="editor-skills-group"
            >
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={group.label}
                  onChange={(e) => setSkillGroupLabel(groupIdx, e.target.value)}
                  placeholder="Group label"
                  className={INPUT_CLASS}
                  data-testid="editor-skills-label"
                />
                <input
                  type="text"
                  value={group.items.join(", ")}
                  onChange={(e) => setSkillGroupItems(groupIdx, e.target.value)}
                  placeholder="Item 1, Item 2, Item 3"
                  className={INPUT_CLASS}
                  data-testid="editor-skills-items"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSkillGroup(groupIdx)}
                className={`mt-1 ${REMOVE_BULLET_CLASS}`}
                aria-label="Remove skill group"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addSkillGroup} className={ADD_BULLET_CLASS}>
            + Add skill group
          </button>
        </div>
      </section>

      {/* Education */}
      {content.education.length > 0 ? (
        <section>
          <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
            Education
          </h3>
          <div className="mt-3 space-y-4">
            {content.education.map((edu, eduIdx) => (
              <div
                key={eduIdx}
                className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4"
                data-testid="editor-education-item"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Institution</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => setEduField(eduIdx, "institution", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Location</label>
                    <input
                      type="text"
                      value={edu.location ?? ""}
                      onChange={(e) => setEduField(eduIdx, "location", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Date range</label>
                    <input
                      type="text"
                      value={edu.dateRange ?? ""}
                      onChange={(e) => setEduField(eduIdx, "dateRange", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={LABEL_CLASS}>Bullets</label>
                  <div className="space-y-1.5">
                    {edu.bullets.map((bullet, bulletIdx) => (
                      <div key={bulletIdx} className="flex items-start gap-1.5">
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => setEduBullet(eduIdx, bulletIdx, e.target.value)}
                          className={`${INPUT_CLASS} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => removeEduBullet(eduIdx, bulletIdx)}
                          className={REMOVE_BULLET_CLASS}
                          aria-label="Remove education bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addEduBullet(eduIdx)}
                    className={ADD_BULLET_CLASS}
                  >
                    + Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Additional experience */}
      <section>
        <h3 className="border-b border-folio-sage-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-folio-sidebar">
          Additional experience
        </h3>
        <div className="mt-3 space-y-2.5">
          {content.additionalExperience.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2"
              data-testid="editor-additional-item"
            >
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={item.category ?? ""}
                  onChange={(e) => setAdditionalItem(idx, "category", e.target.value)}
                  placeholder="Category (optional)"
                  className={INPUT_CLASS}
                />
                <textarea
                  value={item.text}
                  onChange={(e) => setAdditionalItem(idx, "text", e.target.value)}
                  rows={2}
                  placeholder="Description"
                  className={TEXTAREA_CLASS}
                />
              </div>
              <button
                type="button"
                onClick={() => removeAdditionalItem(idx)}
                className={`mt-1 ${REMOVE_BULLET_CLASS}`}
                aria-label="Remove additional experience item"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addAdditionalItem} className={ADD_BULLET_CLASS}>
            + Add item
          </button>
        </div>
      </section>
    </div>
  );
}

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

  const wordCount = countWords(body);
  const overLimit = isOverWordLimit(wordCount);
  const bannedPhrases = detectBannedPhrases(body);
  const exportBlocked = overLimit || bannedPhrases.length > 0;
  const isBusy = busyAction !== null || isRegenerating || isGenerating;

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
      });
      setCoverLetter(updated);
      setBody(updated.body);
      originalCoverLetterBodyRef.current = updated.body;
      setTone("balanced");
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
      <div className="rounded-xl border border-folio-sage-border bg-white p-6">
        <div className="space-y-4 font-serif text-[15px] leading-7 text-folio-on-surface">
          {splitCoverLetterParagraphs(body).map((paragraph, index) => (
            <p key={index} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            type="button"
            onClick={() => void applyRevision(action)}
            disabled={isBusy}
            className={GHOST_BUTTON}
            aria-busy={busyAction === action}
          >
            {busyAction === action ? "Revising…" : label}
          </button>
        ))}
      </div>

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
                disabled={isBusy}
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
  const [showExcluded, setShowExcluded] = useState(false);
  const [showRevisionQueue, setShowRevisionQueue] = useState(false);

  // ── Structured editor state ──────────────────────────────────────────────────
  // isEditMode: true = editable form; false = read-only RenderedResume.
  const [isEditMode, setIsEditMode] = useState(false);
  // editedContent: local working copy while in edit mode (null = not yet opened).
  const [editedContent, setEditedContent] = useState<ResumeDraftContent | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [saveEditsError, setSaveEditsError] = useState<string | null>(null);

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

  // Line-level bullet controls — staged for next Regenerate, not applied live
  const [lineLevelExcludedBulletKeys, setLineLevelExcludedBulletKeys] = useState<Set<string>>(new Set());
  const [lineLevelForcedBulletKeys, setLineLevelForcedBulletKeys] = useState<Set<string>>(new Set());
  const [showBulletControls, setShowBulletControls] = useState(false);
  const [showFitSummary, setShowFitSummary] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [markedSent, setMarkedSent] = useState(false);

  // ── beforeunload guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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

      if (!record.applicationId) {
        setCompanyContext(null);
        return;
      }
      try {
        const application = await getApplicationRecordFromCloud(record.applicationId);
        if (!cancelled) {
          setCompanyContext(application?.companyContext ?? null);
          setMarkedSent(application?.status === "applied");
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

  const fitSummary = useMemo(
    () => buildPackageFitSummary({ rationale: draft?.rationale }),
    [draft],
  );

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

  // ── Enter edit mode ──────────────────────────────────────────────────────────
  function handleEnterEditMode() {
    if (!draft) return;
    setEditedContent(draft.content);
    setIsDirty(false);
    setSaveEditsError(null);
    setIsEditMode(true);
  }

  function handleCancelEdits() {
    setIsEditMode(false);
    setEditedContent(null);
    setIsDirty(false);
    setSaveEditsError(null);
  }

  function handleContentChange(updated: ResumeDraftContent) {
    setEditedContent(updated);
    setIsDirty(true);
  }

  // ── Save structured edits ────────────────────────────────────────────────────
  // Saving after approval downgrades status to layout_changed via
  // resolveDraftStatusAfterContentEdit, which also clears serverPdfValidation.
  // The M4 exportReady derivation and layoutChangedAfterApproval banner then
  // update automatically from the returned draft.
  async function handleSaveStructuredEdits() {
    if (!draft || !editedContent || isSavingEdits) return;
    setIsSavingEdits(true);
    setSaveEditsError(null);
    try {
      const newStatus = resolveDraftStatusAfterContentEdit(draft.status);
      const contentToSave: ResumeDraftContent = {
        ...editedContent,
        // Clear server validation — any content change invalidates the prior result.
        serverPdfValidation: undefined,
      };
      const updated = await updateGeneratedResumeDraftInCloud(draft.id, {
        content: contentToSave,
        status: newStatus,
      });
      setDraft(updated);
      setIsEditMode(false);
      setEditedContent(null);
      setIsDirty(false);
      // Regeneration/approval validation failure is stale after a content save.
      setValidationFailure(null);
    } catch (saveError) {
      setSaveEditsError(
        saveError instanceof Error ? saveError.message : "Failed to save resume edits.",
      );
    } finally {
      setIsSavingEdits(false);
    }
  }

  // ── Revision queue accept ────────────────────────────────────────────────────
  // Same invalidation path as structured edit: resolveDraftStatusAfterContentEdit
  // downgrades approved → layout_changed and strips serverPdfValidation.
  async function handleRevisionQueueAccepted(
    updatedContent: ResumeDraftContent,
    _warnings: string[],
  ) {
    if (!draft) return;
    const newStatus = resolveDraftStatusAfterContentEdit(draft.status);
    const contentToSave: ResumeDraftContent = {
      ...updatedContent,
      serverPdfValidation: undefined,
    };
    const saved = await updateGeneratedResumeDraftInCloud(draft.id, {
      content: contentToSave,
      status: newStatus,
    });
    setDraft(saved);
    setValidationFailure(null);
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
      const layoutSettings = draft.content.exportLayoutSettings ?? DEFAULT_RESUME_LAYOUT_SETTINGS;
      const result = await approveResumeDraftForExport({ draftId: draft.id, layoutSettings });
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
        layoutSettings: draft.content.exportLayoutSettings ?? DEFAULT_RESUME_LAYOUT_SETTINGS,
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
        layoutSettings: draft.content.exportLayoutSettings ?? DEFAULT_RESUME_LAYOUT_SETTINGS,
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

  async function handleMarkSent() {
    if (!draft?.applicationId || isMarkingSent) return;
    setIsMarkingSent(true);
    setError(null);
    try {
      await updateApplicationRecordInCloud(draft.applicationId, { status: "applied" });
      setMarkedSent(true);
    } catch (markError) {
      setError(
        markError instanceof Error ? markError.message : "Failed to mark application as sent.",
      );
    } finally {
      setIsMarkingSent(false);
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
  const resolvedLayoutSettings = draft.content.exportLayoutSettings ?? DEFAULT_RESUME_LAYOUT_SETTINGS;
  const exportReady = Boolean(
    isApprovedDraftStatus(draft.status) &&
      draft.content.serverPdfValidation?.pageCount === 1 &&
      areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, resolvedLayoutSettings),
  );
  const layoutChangedAfterApproval = isLayoutChangedAfterApprovalStatus(draft.status);
  const needsReview = draft.status === RESUME_DRAFT_STATUS_NEEDS_REVIEW;
  const approveLabel = isApproving
    ? "Validating server PDF…"
    : layoutChangedAfterApproval || isApprovedDraftStatus(draft.status)
      ? "Re-approve for export"
      : "Approve for export";

  // ── PDF-on-approve document model ─────────────────────────────────────────────
  // Only built when exportReady — avoids unnecessary work during editing.
  const pdfDocumentModel = exportReady
    ? buildExportResumeDocumentModel({
        draft,
        jobDescription: linkedJob,
        companyContext,
        referenceResume: findReferenceResumeInInventory(
          inventory.resumes,
          draft.referenceResumeId,
        ),
        layoutSettings: resolvedLayoutSettings,
      })
    : null;

  return (
    <div className="max-w-[1100px]">
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            {roleTitle} · {displayCompany}
          </h1>
          <span className="rounded-full border border-folio-olive-border bg-folio-mint-surface px-2.5 py-0.5 text-[11px] font-medium text-folio-olive-text">
            Generated
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={isExportingPdf || !exportReady}
            title={exportReady ? undefined : "Approve for export first"}
            className={GHOST_BUTTON}
          >
            {isExportingPdf ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={() => void handleExportDocx()}
            disabled={isExportingDocx || !exportReady}
            title={exportReady ? undefined : "Approve for export first"}
            className={GHOST_BUTTON}
          >
            {isExportingDocx ? "Exporting…" : "Export DOCX"}
          </button>
          <button
            type="button"
            onClick={() => void handleMarkSent()}
            disabled={isMarkingSent || markedSent || !draft.applicationId}
            className="inline-flex items-center justify-center rounded-lg bg-folio-cta px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markedSent ? "Marked as sent" : isMarkingSent ? "Marking…" : "Mark as sent"}
          </button>
        </div>
      </div>

      {exportMessage ? (
        <p className="mt-3 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-sm text-folio-cta-secondary">
          {exportMessage}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-[#ba1a1a]">
          {error}
        </p>
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
          {/* ── Review & export ──────────────────────────────────── */}
          <section
            data-testid="output-approve-export"
            className="rounded-xl border border-folio-sage-border bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.01em] text-folio-on-surface">
                  Review and export
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

            {needsReview ? (
              <div
                data-testid="output-needs-review-banner"
                className="mt-4 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2.5 text-sm text-folio-cta-secondary"
              >
                <p className="font-medium">Resume needs a structure review</p>
                <p className="mt-1 leading-relaxed">
                  Automatic repair flagged possible structure issues. Regenerate the resume below to
                  re-run automatic repair before you approve for export.
                </p>
              </div>
            ) : null}

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

            {exportReady ? (
              <div className="mt-4 space-y-3">
                <div>
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
                  </div>
                </div>
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

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* ── Left panel — preview or editable form (60%) ─────── */}
            <div className="lg:w-3/5">
              {/* Edit / cancel controls */}
              <div className="mb-3 flex items-center justify-between">
                {isEditMode ? (
                  <span className="text-[13px] font-medium text-folio-on-surface">
                    Editing resume
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-folio-outline">
                    {exportReady ? "PDF preview (approved)" : "Resume preview"}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdits}
                        disabled={isSavingEdits}
                        className={GHOST_BUTTON}
                        data-testid="editor-cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveStructuredEdits()}
                        disabled={isSavingEdits || !isDirty}
                        className={PRIMARY_BUTTON}
                        data-testid="editor-save"
                      >
                        {isSavingEdits ? "Saving…" : "Save edits"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnterEditMode}
                      className={GHOST_BUTTON}
                      data-testid="editor-enter"
                    >
                      Edit resume
                    </button>
                  )}
                </div>
              </div>

              {/* Dirty / unsaved banner */}
              {isDirty && isEditMode ? (
                <div
                  className="mb-3 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2 text-[13px] text-folio-cta-secondary"
                  data-testid="editor-dirty-banner"
                >
                  You have unsaved edits — save or cancel before leaving.
                </div>
              ) : null}

              {saveEditsError ? (
                <p className="mb-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-[13px] text-folio-error">
                  {saveEditsError}
                </p>
              ) : null}

              {/* Content area — edit form / RenderedResume / ResumePdfPreview */}
              <div className="rounded-xl border border-folio-sage-border bg-white p-6">
                {isEditMode && editedContent ? (
                  <StructuredResumeEditor
                    content={editedContent}
                    onChange={handleContentChange}
                  />
                ) : exportReady && pdfDocumentModel ? (
                  /* Two-mode: after approval, show exact Puppeteer HTML in A4 iframe */
                  <ResumePdfPreview
                    documentModel={pdfDocumentModel}
                    data-testid="output-pdf-preview"
                  />
                ) : (
                  <RenderedResume draft={draft} />
                )}
              </div>

              {/* Regenerate — only shown when not in edit mode */}
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => void handleRegenerate()}
                  disabled={isRegenerating || !linkedJob || !draft.referenceResumeId}
                  className={`mt-4 w-full ${GHOST_BUTTON}`}
                >
                  <RefreshIcon />
                  {isRegenerating ? "Regenerating resume…" : "Regenerate resume"}
                </button>
              ) : null}
            </div>

            {/* ── Right panel — experience toggles + revision queue (40%) ── */}
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
                Selected experiences will be prioritised for generation
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

              {/* ── Bullet controls (collapsed disclosure) ─────────── */}
              {/* Exclude individual included bullets or force individual excluded bullets */}
              {/* into the next Regenerate call via lineLevelExcludedBulletKeys / lineLevelForcedBulletKeys. */}
              <div className="mt-5 border-t border-folio-sage-border pt-5">
                <button
                  type="button"
                  onClick={() => setShowBulletControls((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                  aria-expanded={showBulletControls}
                  data-testid="bullet-controls-toggle"
                >
                  <span>Bullet controls</span>
                  <ChevronIcon open={showBulletControls} />
                </button>

                {showBulletControls ? (
                  <div className="mt-3 space-y-4">
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

              {/* ── Fit summary (collapsed disclosure) ─────────────── */}
              <div className="mt-5 border-t border-folio-sage-border pt-5">
                <button
                  type="button"
                  onClick={() => setShowFitSummary((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-folio-outline transition hover:text-folio-on-surface"
                  aria-expanded={showFitSummary}
                  data-testid="fit-summary-toggle"
                >
                  <span>Fit summary</span>
                  <ChevronIcon open={showFitSummary} />
                </button>

                {showFitSummary ? (
                  <div className="mt-3 rounded-lg border border-folio-sage-border bg-folio-surface-container-low px-3 py-3">
                    <p className="text-sm leading-relaxed text-folio-on-surface">
                      {fitSummary ?? PACKAGE_FIT_SUMMARY_UNAVAILABLE}
                    </p>
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
          </div>
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
