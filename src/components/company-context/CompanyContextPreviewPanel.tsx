"use client";

import { useState } from "react";

import {
  formFieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/setup/ui";
import { validateCompanyContextForSave } from "@/lib/company-context/parse";
import { saveApplicationCompanyContextInCloud } from "@/lib/supabase/application-records";
import type { CompanyContext } from "@/types/company-context";

type CompanyContextPreviewPanelProps = {
  context: CompanyContext;
  applicationId?: string;
  onSaved?: (context: CompanyContext) => void;
};

export function CompanyContextPreviewPanel({
  context,
  applicationId,
  onSaved,
}: CompanyContextPreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(context);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <details
      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
      open={isOpen}
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-medium text-slate-900">
        Company context used ({context.displayName || context.companyName})
      </summary>

      <p className="mt-2 text-xs text-slate-600">
        Gemini-generated context based on JD and company fields. Review before using.
      </p>

      <div className="mt-4">
        <label htmlFor="cover-letter-company-context-summary" className={labelClassName}>
          Company summary
        </label>
        <textarea
          id="cover-letter-company-context-summary"
          value={draft.companySummary}
          onChange={(event) =>
            setDraft((current) => ({ ...current, companySummary: event.target.value }))
          }
          rows={5}
          className={formFieldClassName}
        />
      </div>

      {draft.suggestedNarrativeAngles.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {draft.suggestedNarrativeAngles.map((angle) => (
            <li key={angle.angle} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="font-medium">{angle.angle}</p>
              <p className="mt-1">{angle.relevance}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {applicationId ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSaving}
            className={primaryButtonClassName}
            onClick={() => {
              void (async () => {
                const validationError = validateCompanyContextForSave(draft);
                if (validationError) {
                  setError(validationError);
                  return;
                }
                setIsSaving(true);
                setError(null);
                setMessage(null);
                try {
                  const saved = await saveApplicationCompanyContextInCloud(applicationId, draft);
                  const next = saved.companyContext ?? draft;
                  setDraft(next);
                  onSaved?.(next);
                  setMessage("Company context saved to application.");
                } catch (saveError) {
                  setError(
                    saveError instanceof Error
                      ? saveError.message
                      : "Failed to save company context.",
                  );
                } finally {
                  setIsSaving(false);
                }
              })();
            }}
          >
            {isSaving ? "Saving…" : "Save company context"}
          </button>
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => setDraft(context)}
            disabled={isSaving}
          >
            Reset edits
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </details>
  );
}
