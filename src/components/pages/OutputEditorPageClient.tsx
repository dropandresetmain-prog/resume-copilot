"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DownloadCoverLetterDocxButton } from "@/components/cover-letters/DownloadCoverLetterDocxButton";
import { DownloadCoverLetterPdfButton } from "@/components/cover-letters/DownloadCoverLetterPdfButton";

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
import {
  isApprovedDraftStatus,
  isLayoutChangedAfterApprovalStatus,
  RESUME_DRAFT_STATUS_NEEDS_REVIEW,
} from "@/lib/resume-draft/draft-status";
import { areExportLayoutSettingsEqual } from "@/lib/resume-draft/export-layout-settings";
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
  ResumeDraftExperienceSection,
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
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-folio-mint-surface text-folio-olive-text"
    >
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

      {/* Additional experience (rendered when present) */}
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
    // Keep the chip compact — first few words of the alignment reason.
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

// Quick-action buttons → existing CoverLetterRevisionAction enum values.
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
  // Stores the body as it arrived from generation so Balanced can restore it.
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
        // A failed persisted lookup is not proof that no cover letter exists.
        // Keep creation disabled until the read succeeds to avoid duplicate drafts.
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

  /** Run an existing revision action (reviseCoverLetterWithAI via the revision API) and persist. */
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
      {/* Rendered letter — read-only document */}
      <div className="rounded-xl border border-folio-sage-border bg-white p-6">
        <div className="space-y-4 font-serif text-[15px] leading-7 text-folio-on-surface">
          {splitCoverLetterParagraphs(body).map((paragraph, index) => (
            <p key={index} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Quick actions */}
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

      {/* Tone selector */}
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

      {/* Regenerate + word count */}
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
        <p
          className={`mt-2 text-right text-xs ${overLimit ? "text-folio-error" : "text-folio-outline"}`}
        >
          {wordCount} / {FORMAL_COVER_LETTER_MAX_WORDS} words
        </p>
      </div>

      {/* Download */}
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
        /* error/warning surface tints — intentional */
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-folio-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function OutputEditorPageClient({ draftId }: OutputEditorPageClientProps) {
  const { inventory, jobDescriptions } = useWorkspace();

  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A failed persisted read (loadFailed) is never the same as a confirmed-missing
  // draft (notFound). Conflating them would falsely tell the user their draft is gone.
  const [loadFailed, setLoadFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [activeTab, setActiveTab] = useState<OutputTab>("resume");
  const [showExcluded, setShowExcluded] = useState(false);

  // Explicit, persisted approval state lives on the draft (status === "approved"
  // plus a server one-page validation). These drive the two-step Approve → Export flow.
  const [isApproving, setIsApproving] = useState(false);
  const [validationFailure, setValidationFailure] = useState<{
    pageCount: number;
    message: string;
    suggestedActions: string[];
    overflowMm?: number;
  } | null>(null);

  // Toggle intent — wired to forced/excluded bullet regeneration controls.
  const [excludedDraftKeys, setExcludedDraftKeys] = useState<Set<string>>(new Set());
  const [includedExtraKeys, setIncludedExtraKeys] = useState<Set<string>>(new Set());

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [markedSent, setMarkedSent] = useState(false);

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
        // The read itself failed (network/auth/db). Do NOT claim the draft is missing —
        // keep the door open for a retry instead of offering a misleading "not found".
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
        // The read succeeded and returned nothing — this draft genuinely does not exist.
        setNotFound(true);
        setDraft(null);
        return;
      }
      setDraft(record);

      // Company context / sent-state is supplementary — a failure here must not be
      // mistaken for a failed draft load, so it is fetched in its own guarded pass.
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

  // Experiences currently in the generated draft (the "Included" list).
  const includedExperiences = useMemo(
    () => draft?.content.experience ?? [],
    [draft],
  );
  const includedKeys = useMemo(
    () => new Set(includedExperiences.map((e) => experienceKey(e.company, e.role))),
    [includedExperiences],
  );

  // Inventory experiences not represented in the draft (the "Available but excluded" list).
  const excludedExperiences = useMemo<CollatedExperience[]>(() => {
    const active = buildActiveCollatedInventory(inventory);
    return active.experiences.filter(
      (exp) => !includedKeys.has(experienceKey(exp.company, exp.role)),
    );
  }, [inventory, includedKeys]);

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

  /** Build forced/excluded bullet-key regeneration controls from toggle intent. */
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

    return normalizeRegenerationControls({
      forcedBulletKeys: [...forcedBulletKeys],
      excludedBulletKeys: [...excludedBulletKeys],
      forcedEvidenceIds: saved?.forcedEvidenceIds,
      excludedEvidenceIds: saved?.excludedEvidenceIds,
    });
  }

  async function handleRegenerate() {
    if (!draft || isRegenerating) return;
    if (!linkedJob || !draft.referenceResumeId) {
      setError("Saved job description or base resume is missing for this draft.");
      return;
    }

    setIsRegenerating(true);
    setError(null);
    // Regenerating replaces the draft content, so any prior approval no longer applies.
    // Clearing the validation block here keeps the approval state honest after the rewrite.
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

  /**
   * Step 1 of the two-step delivery flow. Calls the server approve route, which re-runs the
   * Puppeteer one-page validation and persists status="approved" + serverPdfValidation.
   * A 422 (resume overflows one page) is surfaced as an actionable hard block, not a silent
   * failure — export stays disabled until a passing approval round-trips back onto the draft.
   */
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

  if (isLoading) {
    return <p className="text-sm text-folio-outline">Loading output editor…</p>;
  }

  // Failed read: we could not load the draft, but that is NOT proof it is missing.
  // Offer a retry; never route the user away as if the draft were gone.
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

  // Confirmed missing: the read succeeded and returned nothing.
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

  // ── Approval / export trust state (explicit + persisted on the draft) ──────────
  // Folio has no layout sliders yet (those land in M5a), so approval validates the
  // draft's stored export layout settings, falling back to the shared defaults.
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

  return (
    <div className="max-w-[1100px]">
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-folio-on-surface">
            {roleTitle} · {displayCompany}
          </h1>
          <span
            className="rounded-full border border-folio-olive-border bg-folio-mint-surface px-2.5 py-0.5 text-[11px] font-medium text-folio-olive-text"
          >
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

      {/* error/warning surface tints — intentional */}
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
          {/* ── Review & export (trust/delivery layer) ───────────── */}
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

            {/* needs_review — visible warning before the approve CTA (banner only) */}
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

            {/* Server one-page hard gate (422) — actionable, never silent */}
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

            {/* Layout changed after approval — re-approve before export */}
            {layoutChangedAfterApproval ? (
              <div className="mt-4 rounded-lg border border-folio-warning-border bg-folio-warning-surface px-3 py-2.5 text-sm text-folio-cta-secondary">
                Layout changed after approval. Re-approve for export before downloading.
              </div>
            ) : null}

            {exportReady ? (
              /* Step 2 active — export is the primary action */
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
              /* Step 1 — approve gates export */
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
            {/* Left panel — rendered preview (60%) */}
          <div className="lg:w-3/5">
            <div className="rounded-xl border border-folio-sage-border bg-white p-6">
              <RenderedResume draft={draft} />
            </div>

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

          {/* Right panel — included / excluded experience (40%) */}
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
                className={`transition-transform duration-150 ${showExcluded ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
