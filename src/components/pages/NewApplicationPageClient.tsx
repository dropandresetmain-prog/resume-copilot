"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { GenerateTailoredResumeSection } from "@/components/setup/GenerateTailoredResumeSection";
import {
  extractJobMetadataFromText,
  mergeExtractedJobMetadata,
} from "@/lib/jd/extract-metadata";
import { findDuplicateJobDescription } from "@/lib/jd/persistence";
import { normalizeJobDescriptionInput } from "@/lib/generate/save-job-for-generation";
import type { JobDescriptionInput } from "@/types/jd";

const EMPTY_FORM: JobDescriptionInput = {
  rawText: "",
  companyName: "",
  roleTitle: "",
  jobUrl: "",
};

// ── Reusable micro-components ─────────────────────────────────────────────────

function StepCircle({ n }: { n: number }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-folio-sidebar text-[11px] font-semibold text-white">
      {n}
    </div>
  );
}

function CompanyInitials({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold bg-folio-mint-surface text-folio-sidebar"
    >
      {initials || "?"}
    </div>
  );
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ${
        on ? "bg-folio-primary-container" : "bg-folio-surface-dim"
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

// ── Page component ─────────────────────────────────────────────────────────────

type NewApplicationPageClientProps = {
  initialJobId?: string;
};

export function NewApplicationPageClient({
  initialJobId,
}: NewApplicationPageClientProps = {}) {
  const {
    inventory,
    collated,
    jobDescriptions,
    isSignedIn,
    cloudEnabled,
    handleSaveJobDescription,
  } = useWorkspace();

  const prefilledJob = useMemo(
    () => (initialJobId ? jobDescriptions.find((j) => j.id === initialJobId) : undefined),
    [initialJobId, jobDescriptions],
  );

  const [jobForm, setJobForm] = useState<JobDescriptionInput>(() =>
    prefilledJob
      ? {
          rawText: prefilledJob.rawText,
          companyName: prefilledJob.companyName ?? "",
          roleTitle: prefilledJob.roleTitle ?? "",
          jobUrl: prefilledJob.jobUrl ?? "",
        }
      : EMPTY_FORM,
  );
  const [editingJobId, setEditingJobId] = useState<string | null>(initialJobId ?? null);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [disabledExperienceIds, setDisabledExperienceIds] = useState<Set<string>>(
    new Set(),
  );
  // Tracks which saved-job match the user has dismissed ("Start fresh") — resets per matched job id.
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);

  const companyTouchedRef = useRef(false);
  const roleTouchedRef = useRef(false);

  const normalizedForm = useMemo(() => normalizeJobDescriptionInput(jobForm), [jobForm]);

  // Detect duplicate saved job for the live form. Only active when not already editing a saved job.
  const matchingJob = useMemo(
    () =>
      normalizedForm.rawText && !editingJobId
        ? findDuplicateJobDescription(jobDescriptions, normalizedForm) ?? null
        : null,
    [jobDescriptions, normalizedForm, editingJobId],
  );

  const disabled = cloudEnabled && !isSignedIn;

  function handleRawTextChange(rawText: string) {
    const extracted = extractJobMetadataFromText(rawText);
    const next = mergeExtractedJobMetadata(
      { ...jobForm, rawText },
      {
        companyName: companyTouchedRef.current ? undefined : extracted.companyName,
        roleTitle: roleTouchedRef.current ? undefined : extracted.roleTitle,
      },
    );
    setJobForm(next);
  }

  function handleGenerationFinished() {
    setJobForm(EMPTY_FORM);
    setEditingJobId(null);
    companyTouchedRef.current = false;
    roleTouchedRef.current = false;
  }

  function toggleExperience(id: string) {
    setDisabledExperienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const fieldClass =
    "w-full rounded-lg border border-folio-outline-variant bg-white px-3 py-2 text-sm text-folio-on-surface placeholder:text-folio-outline focus:border-folio-primary-container focus:outline-none";

  return (
    <div className="max-w-[640px] space-y-4">
      {/* ── Step 1 — Job description ─────────────────────────────── */}
      <div className="rounded-xl border border-folio-sage-border bg-white p-4">
        <div className="flex items-center gap-2.5">
          <StepCircle n={1} />
          <h2 className="text-[18px] font-medium text-folio-on-surface">Job description</h2>
        </div>

        <div className="mt-4 space-y-4">
          <textarea
            value={jobForm.rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            disabled={disabled}
            placeholder="Paste the job description here…"
            rows={8}
            className={`${fieldClass} min-h-[200px] resize-y leading-relaxed`}
          />

          <div>
            <label
              htmlFor="new-app-company-website"
              className="mb-1.5 block text-sm font-medium text-folio-on-surface"
            >
              Company website{" "}
              <span className="font-normal text-folio-outline">(optional)</span>
            </label>
            <input
              id="new-app-company-website"
              type="url"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              disabled={disabled}
              placeholder="https://company.com"
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs text-folio-outline">
              We&apos;ll research the company to strengthen your cover letter
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 2 — Confirm role ─────────────────────────────────── */}
      <div className="rounded-xl border border-folio-sage-border bg-white p-4">
        <div className="flex items-center gap-2.5">
          <StepCircle n={2} />
          <h2 className="text-[18px] font-medium text-folio-on-surface">Confirm role</h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-app-role"
              className="mb-1.5 block text-sm font-medium text-folio-on-surface"
            >
              Role title
            </label>
            <input
              id="new-app-role"
              type="text"
              value={jobForm.roleTitle ?? ""}
              onChange={(e) => {
                roleTouchedRef.current = true;
                setJobForm((f) => ({ ...f, roleTitle: e.target.value }));
              }}
              disabled={disabled}
              placeholder="e.g. Product Manager"
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-app-company"
              className="mb-1.5 block text-sm font-medium text-folio-on-surface"
            >
              Company name
            </label>
            <input
              id="new-app-company"
              type="text"
              value={jobForm.companyName ?? ""}
              onChange={(e) => {
                companyTouchedRef.current = true;
                setJobForm((f) => ({ ...f, companyName: e.target.value }));
              }}
              disabled={disabled}
              placeholder="e.g. Acme Corp"
              className={fieldClass}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-folio-outline">
          Extracted from the job description — edit if needed
        </p>
      </div>

      {/* ── Step 3 — Vault match ──────────────────────────────────── */}
      <div className="rounded-xl border border-folio-sage-border bg-white p-4">
        <div className="flex items-center gap-2.5">
          <StepCircle n={3} />
          <h2 className="text-[18px] font-medium text-folio-on-surface">Vault match</h2>
        </div>

        <div className="mt-4">
          {collated.experiences.length === 0 ? (
            <p className="text-sm text-folio-outline">
              No experience in vault yet.{" "}
              <Link
                href="/inventory"
                className="underline underline-offset-2 hover:text-folio-on-surface"
              >
                Add experience in Career Vault
              </Link>{" "}
              first.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[14px] font-medium text-folio-on-surface">
                Relevant experience found
              </p>
              <ul className="divide-y divide-folio-surface-container">
                {collated.experiences.map((exp) => {
                  const on = !disabledExperienceIds.has(exp.id);
                  return (
                    <li
                      key={exp.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <CompanyInitials name={exp.company} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-folio-on-surface">
                          {exp.role}
                          <span className="text-folio-outline"> · {exp.company}</span>
                          {exp.dateRange ? (
                            <span className="text-folio-outline"> · {exp.dateRange}</span>
                          ) : null}
                        </p>
                      </div>
                      <ToggleSwitch on={on} onToggle={() => toggleExperience(exp.id)} />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-folio-outline">
                Selected experiences will be prioritised for generation
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Saved job matched notice ─────────────────────────────────
          When the live form matches an existing saved job (same company+role
          or same raw text), surface it so the user can reuse or start fresh.
          The generate engine reuses automatically, but this makes it visible.
      ───────────────────────────────────────────────────────────────── */}
      {matchingJob && matchingJob.id !== dismissedJobId ? (
        <div
          className="rounded-xl border border-folio-sage-border bg-folio-surface-container-low p-4"
          data-testid="generate-saved-job-match"
        >
          <div className="flex items-center gap-3">
            <CompanyInitials name={matchingJob.companyName ?? "?"} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-folio-on-surface">Saved job matched</p>
              <p className="mt-0.5 text-xs text-folio-outline">
                {[matchingJob.companyName, matchingJob.roleTitle].filter(Boolean).join(" · ")}
                {" — "}will be reused on Generate
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setJobForm({
                  rawText: matchingJob.rawText,
                  companyName: matchingJob.companyName ?? "",
                  roleTitle: matchingJob.roleTitle ?? "",
                  jobUrl: matchingJob.jobUrl ?? "",
                });
                setEditingJobId(matchingJob.id);
                companyTouchedRef.current = true;
                roleTouchedRef.current = true;
              }}
              className="rounded-lg border border-folio-outline-variant bg-white px-3 py-1.5 text-sm font-medium text-folio-on-surface transition hover:bg-folio-surface-container"
            >
              Reuse saved job
            </button>
            <button
              type="button"
              onClick={() => setDismissedJobId(matchingJob.id)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-folio-outline transition hover:text-folio-on-surface"
            >
              Start fresh
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Generate section ─────────────────────────────────────────
          Embedded mode strips verbose secondary UI and renders only the
          readiness strip + context policy + generate CTA + progress +
          error recovery.
      ───────────────────────────────────────────────────────────────── */}
      <GenerateTailoredResumeSection
        inventory={inventory}
        jobDescriptions={jobDescriptions}
        jobForm={jobForm}
        editingJobId={editingJobId}
        isSignedIn={isSignedIn}
        disabled={disabled}
        companyWebsiteInput={companyWebsite}
        onCompanyWebsiteChange={setCompanyWebsite}
        onClearForm={() => {
          setJobForm(EMPTY_FORM);
          setEditingJobId(null);
          companyTouchedRef.current = false;
          roleTouchedRef.current = false;
        }}
        onSaveJob={handleSaveJobDescription}
        onGenerationFinished={handleGenerationFinished}
        embeddedMode
      />
    </div>
  );
}
