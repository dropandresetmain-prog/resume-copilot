"use client";

import type { ReactNode } from "react";

type ResumeDraftSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function ResumeDraftSectionCard({
  title,
  description,
  children,
}: ResumeDraftSectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
