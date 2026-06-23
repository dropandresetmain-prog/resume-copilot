import type { ReactNode } from "react";

import type { SourceCitation } from "@/types/collated";

/** Shared light-theme form and button classes — use instead of browser defaults. */
export const labelClassName = "text-sm font-medium text-slate-800";

export const formFieldClassName =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-100 disabled:cursor-default disabled:opacity-50";

export const primaryButtonClassName =
  "rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";

export const secondaryButtonClassName =
  "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-default disabled:opacity-50";

export const destructiveButtonClassName =
  "rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-default disabled:opacity-50";

export function WorkspaceBand({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-900/10 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase text-cyan-800">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SetupCard({
  title,
  description,
  children,
  className = "",
  variant = "secondary",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "muted";
}) {
  const variantClassName =
    variant === "primary"
      ? "border-slate-900/15 bg-white shadow-md"
      : variant === "muted"
        ? "border-slate-200 bg-slate-50/70 shadow-none"
        : "border-slate-200 bg-white shadow-sm";

  return (
    <section
      className={`rounded-lg border p-4 text-slate-900 sm:p-5 ${variantClassName} ${className}`}
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
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
      className="group rounded-lg border border-slate-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span
            aria-hidden
            className="text-slate-400 transition group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">{children}</div>
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
    <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-slate-500">
        {label}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
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
          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
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
    { id: "collated" as const, label: "Overview" },
    { id: "edit" as const, label: "Edit Bullets" },
    { id: "source" as const, label: "Source / Debug" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Inventory views"
      className="flex w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === tab.id
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
