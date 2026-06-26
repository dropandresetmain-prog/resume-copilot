"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { formatCompanyNameForDisplay } from "@/lib/cover-letter/company-name";
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
import { getApplicationRecordFromCloud, updateApplicationRecordInCloud } from "@/lib/supabase/application-records";
import {
  getGeneratedResumeDraftFromCloud,
  updateGeneratedResumeDraftInCloud,
} from "@/lib/supabase/generated-resume-drafts";
import type { CollatedExperience } from "@/types/collated";
import type { CompanyContext } from "@/types/company-context";
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
        on ? "bg-[#2A7A5E]" : "bg-[#bec9c2]"
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
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: "#EAF3DE", color: "#3B6D11" }}
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
    <div className="flex items-start gap-3 rounded-xl border border-[#D8ECC8] bg-white p-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
        style={{ backgroundColor: "#EAF3DE", color: "#085041" }}
      >
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#1c1c1a]">
          <span className="text-[#6f7973]">{company}</span> · {role}
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
    <div className="text-[#1c1c1a]">
      {/* Header */}
      <header className="text-center">
        {header.fullName ? (
          <h2 className="text-2xl font-semibold tracking-tight">{header.fullName}</h2>
        ) : null}
        {contactLine ? (
          <p className="mt-1.5 text-xs text-[#6f7973]">{contactLine}</p>
        ) : null}
      </header>

      {/* Experience */}
      {content.experience.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-[#D8ECC8] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#085041]">
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
                      <span className="font-normal text-[#3f4944]"> · {exp.company}</span>
                    </p>
                    {meta ? <p className="text-xs text-[#6f7973]">{meta}</p> : null}
                  </div>
                  {exp.bullets.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.map((b, bi) => (
                        <li key={bi} className="flex gap-2 text-[13px] leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#6f7973]" />
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
          <h3 className="border-b border-[#D8ECC8] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#085041]">
            Skills
          </h3>
          <dl className="mt-3 space-y-1.5">
            {content.skills.groups.map((group) => (
              <div key={group.label} className="flex gap-2 text-[13px]">
                <dt className="font-semibold">{group.label}:</dt>
                <dd className="text-[#3f4944]">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Education */}
      {content.education.length > 0 ? (
        <section className="mt-6">
          <h3 className="border-b border-[#D8ECC8] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#085041]">
            Education
          </h3>
          <div className="mt-3 space-y-3">
            {content.education.map((edu, i) => {
              const meta = [edu.location, edu.dateRange].filter(Boolean).join(" · ");
              return (
                <div key={`${edu.institution}-${i}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold">{edu.institution}</p>
                    {meta ? <p className="text-xs text-[#6f7973]">{meta}</p> : null}
                  </div>
                  {edu.programmes.length > 0 ? (
                    <p className="text-[13px] text-[#3f4944]">{edu.programmes.join(", ")}</p>
                  ) : null}
                  {edu.bullets.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {edu.bullets.map((b, bi) => (
                        <li key={bi} className="flex gap-2 text-[13px] leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#6f7973]" />
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
          <h3 className="border-b border-[#D8ECC8] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#085041]">
            Additional experience
          </h3>
          <ul className="mt-3 space-y-1">
            {content.additionalExperience.map((item, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#6f7973]" />
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
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D8ECC8] bg-white px-3.5 py-2 text-sm font-medium text-[#1c1c1a] transition hover:bg-[#f6f3ef] disabled:cursor-not-allowed disabled:opacity-50";

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

export function OutputEditorPageClient({ draftId }: OutputEditorPageClientProps) {
  const { inventory, jobDescriptions } = useWorkspace();

  const [draft, setDraft] = useState<GeneratedResumeDraftRecord | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<OutputTab>("resume");
  const [showExcluded, setShowExcluded] = useState(false);

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
      try {
        const record = await getGeneratedResumeDraftFromCloud(draftId);
        if (cancelled) return;
        if (!record) {
          setError("Resume draft not found.");
          setDraft(null);
          return;
        }
        setDraft(record);
        if (record.applicationId) {
          const application = await getApplicationRecordFromCloud(record.applicationId);
          if (!cancelled) {
            setCompanyContext(application?.companyContext ?? null);
            setMarkedSent(application?.status === "applied");
          }
        } else if (!cancelled) {
          setCompanyContext(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load resume draft.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

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

  async function handleExportPdf() {
    if (!draft || isExportingPdf) return;
    setIsExportingPdf(true);
    setExportMessage(null);
    try {
      const result = await exportResumePdfFromApi({
        draftId: draft.id,
        layoutSettings: draft.content.exportLayoutSettings,
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
        layoutSettings: draft.content.exportLayoutSettings,
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
    return <p className="text-sm text-[#6f7973]">Loading output editor…</p>;
  }

  if (error && !draft) {
    return (
      <div className="max-w-[640px] rounded-xl border border-[#D8ECC8] bg-white p-4">
        <h1 className="text-[18px] font-medium text-[#1c1c1a]">Output editor unavailable</h1>
        <p className="mt-2 text-sm text-[#ba1a1a]">{error}</p>
        <Link
          href="/generate"
          className={`mt-4 ${GHOST_BUTTON}`}
        >
          Back to new application
        </Link>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="max-w-[1100px]">
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-[#1c1c1a]">
            {roleTitle} · {displayCompany}
          </h1>
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: "#EAF3DE", color: "#3B6D11", borderColor: "#C0DD97" }}
          >
            Generated
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={isExportingPdf}
            className={GHOST_BUTTON}
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
            onClick={() => void handleMarkSent()}
            disabled={isMarkingSent || markedSent || !draft.applicationId}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#B85C38" }}
          >
            {markedSent ? "Marked as sent" : isMarkingSent ? "Marking…" : "Mark as sent"}
          </button>
        </div>
      </div>

      {exportMessage ? (
        <p className="mt-3 rounded-lg border border-[#f5d9b0] bg-[#fdf4e6] px-3 py-2 text-sm text-[#9a4523]">
          {exportMessage}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-[#f3c0bd] bg-[#fdeceb] px-3 py-2 text-sm text-[#ba1a1a]">
          {error}
        </p>
      ) : null}

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="mt-5 flex border-b border-[#D8ECC8]">
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
                  ? "border-b-2 border-[#2A7A5E] text-[#2A7A5E]"
                  : "text-[#6f7973] hover:text-[#1c1c1a]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Resume tab ─────────────────────────────────────────── */}
      {activeTab === "resume" ? (
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left panel — rendered preview (60%) */}
          <div className="lg:w-3/5">
            <div className="rounded-xl border border-[#D8ECC8] bg-white p-6">
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
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#6f7973]">
              Included experience
            </p>
            <div className="mt-3 space-y-2.5">
              {includedExperiences.length === 0 ? (
                <p className="text-sm text-[#6f7973]">No experience in this draft yet.</p>
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

            <div className="my-5 border-t border-[#D8ECC8]" />

            <button
              type="button"
              onClick={() => setShowExcluded((v) => !v)}
              className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-wide text-[#6f7973] transition hover:text-[#1c1c1a]"
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
                  <p className="text-sm text-[#6f7973]">
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

            <p className="mt-4 text-xs text-[#6f7973]">
              Selected experiences will be prioritised for generation
            </p>
          </div>
        </div>
      ) : (
        /* ── Cover letter tab — placeholder (Pass B) ──────────── */
        <div className="mt-5 flex items-center justify-center rounded-xl border border-dashed border-[#D8ECC8] bg-white py-20">
          <p className="text-sm text-[#6f7973]">Coming in next pass</p>
        </div>
      )}
    </div>
  );
}
