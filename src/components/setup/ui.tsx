import type { ReactNode } from "react";

import type { SourceCitation } from "@/types/collated";

/** Shared light-theme form and button classes — use instead of browser defaults. */
export const labelClassName = "text-sm font-medium text-slate-800";

export const formFieldClassName =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-default disabled:opacity-50";

export const primaryButtonClassName =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";

export const secondaryButtonClassName =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-50";

export const destructiveButtonClassName =
  "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-default disabled:opacity-50";

export function SetupCard({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      )}
      {description && (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-zinc-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span
            aria-hidden
            className="text-zinc-400 transition group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-4 py-4">{children}</div>
    </details>
  );
}

export function RawDetails({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <details className="mt-2 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-zinc-500">
        {label}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{value}</p>
    </details>
  );
}

export function SourceCitationChips({
  citations,
}: {
  citations: SourceCitation[];
}) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((citation) => (
        <span
          key={citation.resumeId}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
          title={citation.filename}
        >
          {citation.filename}
        </span>
      ))}
    </div>
  );
}

export function ViewTabs({
  activeTab,
  onChange,
}: {
  activeTab: "collated" | "edit" | "source";
  onChange: (tab: "collated" | "edit" | "source") => void;
}) {
  const tabs = [
    { id: "collated" as const, label: "Collated Inventory" },
    { id: "edit" as const, label: "Edit Bullets" },
    { id: "source" as const, label: "Source Resumes / Debug" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Inventory views"
      className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === tab.id
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
