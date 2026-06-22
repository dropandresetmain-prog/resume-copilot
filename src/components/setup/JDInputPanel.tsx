"use client";

import { useRef, useState } from "react";

import {
  EmptyState,
  SetupCard,
  destructiveButtonClassName,
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import {
  extractJobMetadataFromText,
  mergeExtractedJobMetadata,
} from "@/lib/jd/extract-metadata";
import { findDuplicateJobDescription } from "@/lib/jd/persistence";
import type { JobDescriptionInput, StoredJobDescription } from "@/types/jd";

import { SavedJobCard } from "@/components/setup/SavedJobCard";

type JDInputPanelProps = {
  jobDescriptions: StoredJobDescription[];
  onSave: (
    input: JobDescriptionInput,
    editingId: string | null,
    options?: { allowDuplicate?: boolean },
  ) => Promise<StoredJobDescription | void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  title?: string;
  description?: string;
  listTitle?: string;
  /** Primary intake form (Generate). Hidden on Records unless editing. */
  showIntakeForm?: boolean;
  showSavedJobsList?: boolean;
  /** Hide explicit Save Job CTA — used on Generate (job saves on generate). */
  showSaveButton?: boolean;
  /** Controlled intake form (Generate page). */
  form?: JobDescriptionInput;
  onFormChange?: (form: JobDescriptionInput) => void;
  editingId?: string | null;
  onEditingIdChange?: (id: string | null) => void;
  onJobSaved?: (job: StoredJobDescription) => void;
};

const EMPTY_FORM: JobDescriptionInput = {
  rawText: "",
  companyName: "",
  roleTitle: "",
  jobUrl: "",
};

const DEFAULT_INTAKE_TITLE = "Job description";
const DEFAULT_INTAKE_DESCRIPTION =
  "Paste the job description here. Company and role are extracted when possible and saved automatically when you generate.";
const DEFAULT_MANAGE_TITLE = "Manage Saved Jobs";
const DEFAULT_MANAGE_DESCRIPTION =
  "View, edit, or delete jobs you saved while tailoring resumes. Paste new jobs on the Generate page.";

export function JDInputPanel({
  jobDescriptions,
  onSave,
  onDelete,
  onClearAll,
  disabled = false,
  disabledReason,
  title,
  description,
  listTitle,
  showIntakeForm = true,
  showSavedJobsList = true,
  showSaveButton = true,
  form: controlledForm,
  onFormChange,
  editingId: controlledEditingId,
  onEditingIdChange,
  onJobSaved,
}: JDInputPanelProps) {
  const [internalForm, setInternalForm] = useState<JobDescriptionInput>(EMPTY_FORM);
  const [internalEditingId, setInternalEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const companyTouchedRef = useRef(false);
  const roleTouchedRef = useRef(false);

  const isControlled = controlledForm !== undefined && onFormChange !== undefined;
  const form = isControlled ? controlledForm : internalForm;
  const editingId = controlledEditingId !== undefined ? controlledEditingId : internalEditingId;

  function setForm(next: JobDescriptionInput) {
    if (isControlled) {
      onFormChange(next);
    } else {
      setInternalForm(next);
    }
  }

  function setEditingId(id: string | null) {
    if (onEditingIdChange) {
      onEditingIdChange(id);
    } else {
      setInternalEditingId(id);
    }
  }

  const resolvedTitle =
    title ?? (showIntakeForm ? DEFAULT_INTAKE_TITLE : DEFAULT_MANAGE_TITLE);
  const resolvedDescription =
    description ??
    (showIntakeForm ? DEFAULT_INTAKE_DESCRIPTION : DEFAULT_MANAGE_DESCRIPTION);
  const resolvedListTitle = listTitle ?? `Saved Jobs (${jobDescriptions.length})`;
  const showForm = showIntakeForm || editingId !== null;

  function updateField<K extends keyof JobDescriptionInput>(
    field: K,
    value: JobDescriptionInput[K],
  ) {
    if (field === "companyName") companyTouchedRef.current = true;
    if (field === "roleTitle") roleTouchedRef.current = true;
    setForm({ ...form, [field]: value });
    if (validationError) setValidationError(null);
    if (duplicateWarning) setDuplicateWarning(null);
    if (saveError) setSaveError(null);
  }

  function applyExtractedMetadata(
    rawText: string,
    current: JobDescriptionInput,
  ): JobDescriptionInput {
    const extracted = extractJobMetadataFromText(rawText);
    return mergeExtractedJobMetadata(
      {
        ...current,
        rawText,
        companyName: companyTouchedRef.current ? current.companyName : current.companyName,
        roleTitle: roleTouchedRef.current ? current.roleTitle : current.roleTitle,
      },
      {
        companyName: companyTouchedRef.current ? undefined : extracted.companyName,
        roleTitle: roleTouchedRef.current ? undefined : extracted.roleTitle,
      },
    );
  }

  function handleRawTextChange(rawText: string) {
    setForm(applyExtractedMetadata(rawText, form));
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
    companyTouchedRef.current = false;
    roleTouchedRef.current = false;
  }

  function handleEdit(jd: StoredJobDescription) {
    setEditingId(jd.id);
    setForm({
      rawText: jd.rawText,
      companyName: jd.companyName ?? "",
      roleTitle: jd.roleTitle ?? "",
      jobUrl: jd.jobUrl ?? "",
    });
    companyTouchedRef.current = Boolean(jd.companyName?.trim());
    roleTouchedRef.current = Boolean(jd.roleTitle?.trim());
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
        `A similar saved job already exists (${duplicate.companyName ?? duplicate.roleTitle ?? "saved job"}). Save anyway?`,
      );
      if (!proceed) {
        setDuplicateWarning("Save cancelled. A matching saved job already exists.");
        return;
      }
      allowDuplicate = true;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await onSave(
        form,
        editingId,
        allowDuplicate ? { allowDuplicate: true } : undefined,
      );
      if (duplicate) {
        setDuplicateWarning("Saved with duplicate notice.");
      }
      if (saved) {
        onJobSaved?.(saved);
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
    const confirmed = window.confirm("Delete this saved job?");
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
    <SetupCard title={resolvedTitle} description={resolvedDescription}>
      {disabled && disabledReason ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {disabledReason}
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 space-y-4">
          {!showIntakeForm && editingId ? (
            <p className="text-sm text-slate-600">Editing a saved job.</p>
          ) : null}

          <div>
            <label htmlFor="jd-raw-text" className={labelClassName}>
              Job description
            </label>
            <textarea
              id="jd-raw-text"
              value={form.rawText}
              onChange={(event) => handleRawTextChange(event.target.value)}
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
            {showSaveButton ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={disabled || isSaving}
                className={primaryButtonClassName}
              >
                {isSaving ? "Saving…" : editingId ? "Update saved job" : "Save job"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearForm}
              disabled={disabled}
              className={secondaryButtonClassName}
            >
              {editingId && !showIntakeForm ? "Cancel edit" : "Clear form"}
            </button>
          </div>
        </div>
      ) : null}

      {showSavedJobsList ? (
        <div className={showForm ? "mt-8" : "mt-4"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{resolvedListTitle}</h3>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={jobDescriptions.length === 0 || disabled}
              className={destructiveButtonClassName}
            >
              Clear Saved Jobs
            </button>
          </div>

          {jobDescriptions.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No Saved Jobs Yet"
                description={
                  showIntakeForm
                    ? "Saved jobs appear here after you generate a tailored resume."
                    : "Saved jobs from Generate will appear here."
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {jobDescriptions.map((jd) => (
                <SavedJobCard
                  key={jd.id}
                  job={jd}
                  isEditing={editingId === jd.id}
                  disabled={disabled}
                  onEdit={() => handleEdit(jd)}
                  onDelete={() => handleDelete(jd.id)}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </SetupCard>
  );
}

export { EMPTY_FORM as EMPTY_JOB_DESCRIPTION_FORM };
