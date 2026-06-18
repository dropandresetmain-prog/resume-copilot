"use client";

import { useState } from "react";

import { EmptyState, SetupCard, formFieldClassName, labelClassName, primaryButtonClassName, secondaryButtonClassName, destructiveButtonClassName } from "@/components/setup/ui";
import { findDuplicateJobDescription } from "@/lib/jd/persistence";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

type JDInputPanelProps = {
  jobDescriptions: StoredJobDescription[];
  onSave: (
    input: JobDescriptionInput,
    editingId: string | null,
    options?: { allowDuplicate?: boolean },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
};

const EMPTY_FORM: JobDescriptionInput = {
  rawText: "",
  companyName: "",
  roleTitle: "",
  jobUrl: "",
};

function formatLabel(jd: StoredJobDescription): string {
  if (jd.roleTitle && jd.companyName) {
    return `${jd.roleTitle} · ${jd.companyName}`;
  }
  if (jd.roleTitle) return jd.roleTitle;
  if (jd.companyName) return jd.companyName;
  const preview = jd.rawText.trim().split(/\s+/).slice(0, 8).join(" ");
  return preview.length > 60 ? `${preview.slice(0, 60)}…` : preview || "Untitled JD";
}

export function JDInputPanel({
  jobDescriptions,
  onSave,
  onDelete,
  onClearAll,
  disabled = false,
  disabledReason,
}: JDInputPanelProps) {
  const [form, setForm] = useState<JobDescriptionInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateField<K extends keyof JobDescriptionInput>(
    field: K,
    value: JobDescriptionInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    if (validationError) setValidationError(null);
    if (duplicateWarning) setDuplicateWarning(null);
    if (saveError) setSaveError(null);
  }

  function clearForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setValidationError(null);
    setDuplicateWarning(null);
    setSaveError(null);
  }

  function handleEdit(jd: StoredJobDescription) {
    setEditingId(jd.id);
    setForm({
      rawText: jd.rawText,
      companyName: jd.companyName ?? "",
      roleTitle: jd.roleTitle ?? "",
      jobUrl: jd.jobUrl ?? "",
    });
    setValidationError(null);
    setDuplicateWarning(null);
    setSaveError(null);
  }

  async function handleSave() {
    if (disabled) return;

    if (!form.rawText.trim()) {
      setValidationError("Job description text is required.");
      return;
    }

    const duplicate = findDuplicateJobDescription(
      jobDescriptions,
      form,
      editingId ?? undefined,
    );
    let allowDuplicate = false;
    if (duplicate) {
      const proceed = window.confirm(
        `A similar saved job description already exists (${formatLabel(duplicate)}). Save anyway?`,
      );
      if (!proceed) {
        setDuplicateWarning(
          "Save cancelled. A matching saved job description already exists.",
        );
        return;
      }
      allowDuplicate = true;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(form, editingId, allowDuplicate ? { allowDuplicate: true } : undefined);
      if (duplicate) {
        setDuplicateWarning(
          `Saved with duplicate notice: similar to "${formatLabel(duplicate)}".`,
        );
      }
      clearForm();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save job description.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (disabled) return;
    const confirmed = window.confirm("Delete this saved job description?");
    if (!confirmed) return;
    if (editingId === id) {
      clearForm();
    }
    await onDelete(id);
  }

  async function handleClearAll() {
    if (disabled) return;
    await onClearAll();
    clearForm();
  }

  return (
    <SetupCard
      title="Job description intake"
      description="Paste a job description and optional metadata. Raw pasted text is the source of truth. Saved job descriptions sync through Supabase. No matching or generation yet."
    >
      {disabled && disabledReason ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {disabledReason}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="jd-raw-text" className={labelClassName}>
            Job description
          </label>
          <textarea
            id="jd-raw-text"
            value={form.rawText}
            onChange={(event) => updateField("rawText", event.target.value)}
            rows={10}
            disabled={disabled}
            placeholder="Paste the full job description here…"
            className={formFieldClassName}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="jd-company" className={labelClassName}>
              Company name (optional)
            </label>
            <input
              id="jd-company"
              type="text"
              value={form.companyName ?? ""}
              onChange={(event) => updateField("companyName", event.target.value)}
              disabled={disabled}
              className={formFieldClassName}
            />
          </div>
          <div>
            <label htmlFor="jd-role" className={labelClassName}>
              Role title (optional)
            </label>
            <input
              id="jd-role"
              type="text"
              value={form.roleTitle ?? ""}
              onChange={(event) => updateField("roleTitle", event.target.value)}
              disabled={disabled}
              className={formFieldClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="jd-url" className={labelClassName}>
            Job URL (optional)
          </label>
          <input
            id="jd-url"
            type="url"
            value={form.jobUrl ?? ""}
            onChange={(event) => updateField("jobUrl", event.target.value)}
            disabled={disabled}
            placeholder="https://…"
            className={formFieldClassName}
          />
        </div>

        {validationError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {validationError}
          </p>
        ) : null}
        {saveError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {saveError}
          </p>
        ) : null}
        {duplicateWarning ? (
          <p className="text-sm text-amber-800">{duplicateWarning}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || isSaving}
            className={primaryButtonClassName}
          >
            {isSaving
              ? "Saving…"
              : editingId
                ? "Update saved JD"
                : "Save job description"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            disabled={disabled}
            className={secondaryButtonClassName}
          >
            Clear form
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Saved job descriptions ({jobDescriptions.length})
          </h3>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={jobDescriptions.length === 0 || disabled}
            className={destructiveButtonClassName}
          >
            Clear saved job descriptions
          </button>
        </div>

        {jobDescriptions.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No saved job descriptions"
              description="Sign in and paste a job description above to save it to Supabase."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobDescriptions.map((jd) => (
              <li
                key={jd.id}
                className={`rounded-lg border p-4 ${
                  editingId === jd.id
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{formatLabel(jd)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {new Date(jd.createdAt).toLocaleString()} · Updated{" "}
                      {new Date(jd.updatedAt).toLocaleString()}
                    </p>
                    {jd.jobUrl ? (
                      <a
                        href={jd.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-violet-700 hover:underline"
                      >
                        {jd.jobUrl}
                      </a>
                    ) : null}
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {jd.rawText}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(jd)}
                      disabled={disabled}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(jd.id)}
                      disabled={disabled}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SetupCard>
  );
}
