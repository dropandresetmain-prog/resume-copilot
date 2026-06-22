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
  defaultOpen?: boolean;
  onSaved?: (context: CompanyContext) => void;
};

function formatTimestamp(value?: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function CompanyContextPreviewPanel({
  context,
  applicationId,
  defaultOpen = false,
  onSaved,
}: CompanyContextPreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState(context);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const researchTimestamp = formatTimestamp(context.generatedAt);

  return (
    <details
      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
      open={isOpen}
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-medium text-slate-900">
        Company research — {context.displayName || context.companyName}
      </summary>

      <p className="mt-2 text-xs text-slate-600">
        {context.sourceType === "website_research"
          ? "Website-backed research via Firecrawl + Gemini."
          : "JD-based context — no website scrape."}
        {researchTimestamp ? ` · Researched ${researchTimestamp}` : null}
      </p>

      {context.website ? (
        <p className="mt-2 text-xs text-slate-600">
          Source website:{" "}
          <a href={context.website} className="underline" target="_blank" rel="noreferrer">
            {context.website}
          </a>
        </p>
      ) : null}

      {context.sources && context.sources.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {context.sources.map((source, index) => (
            <li key={`${source.type}-${source.url ?? index}`}>
              {source.type}
              {source.url ? `: ${source.url}` : ""}
              {source.success ? " (success)" : source.error ? ` (${source.error})` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="company-research-summary-preview" className={labelClassName}>
            Company summary
          </label>
          <textarea
            id="company-research-summary-preview"
            value={draft.companySummary}
            onChange={(event) =>
              setDraft((current) => ({ ...current, companySummary: event.target.value }))
            }
            rows={5}
            className={formFieldClassName}
          />
        </div>

        {draft.industry ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Industry:</span> {draft.industry}
          </p>
        ) : null}

        {draft.businessModel ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Business model:</span> {draft.businessModel}
          </p>
        ) : null}

        {draft.productsAndServices.length > 0 ? (
          <div>
            <p className={labelClassName}>Products &amp; services</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
              {draft.productsAndServices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.customers && draft.customers.length > 0 ? (
          <div>
            <p className={labelClassName}>Customers</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
              {draft.customers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.likelyHiringPriorities.length > 0 ? (
          <div>
            <p className={labelClassName}>Likely hiring priorities</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
              {draft.likelyHiringPriorities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.mission ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Mission:</span> {draft.mission}
          </p>
        ) : null}

        {draft.vision ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Vision:</span> {draft.vision}
          </p>
        ) : null}

        {draft.coreValues && draft.coreValues.length > 0 ? (
          <div>
            <p className={labelClassName}>Core values</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
              {draft.coreValues.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.suggestedNarrativeAngles.length > 0 ? (
          <div>
            <p className={labelClassName}>Suggested narrative angles</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {draft.suggestedNarrativeAngles.map((angle) => (
                <li key={angle.angle} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="font-medium">{angle.angle}</p>
                  <p className="mt-1">{angle.relevance}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.limitations.length > 0 ? (
          <div>
            <p className={labelClassName}>Limitations</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
              {draft.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

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
                  setMessage("Company research saved to application.");
                } catch (saveError) {
                  setError(
                    saveError instanceof Error
                      ? saveError.message
                      : "Failed to save company research.",
                  );
                } finally {
                  setIsSaving(false);
                }
              })();
            }}
          >
            {isSaving ? "Saving…" : "Save edits"}
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
