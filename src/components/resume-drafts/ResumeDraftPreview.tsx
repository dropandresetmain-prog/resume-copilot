"use client";

import {
  formatRiskFlagLabel,
  hasSourceRefs,
} from "@/lib/resume-draft/preview-helpers";
import type { ResumeDraftContent } from "@/types/resume-draft";

type ResumeDraftPreviewProps = {
  content: ResumeDraftContent;
  className?: string;
};

function RiskFlagList({ flags, className = "" }: { flags: string[]; className?: string }) {
  if (flags.length === 0) {
    return null;
  }

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {flags.map((flag) => (
        <li
          key={flag}
          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900"
        >
          {formatRiskFlagLabel(flag)}
        </li>
      ))}
    </ul>
  );
}

export function ResumeDraftPreview({ content, className = "" }: ResumeDraftPreviewProps) {
  const header = content.header;

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-800 shadow-sm ${className}`}
    >
      {content.globalRiskFlags.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Draft-wide flags
          </p>
          <RiskFlagList flags={content.globalRiskFlags} className="mt-2" />
        </div>
      ) : null}

      {header.includeHeader ? (
        <header className="border-b border-slate-200 pb-4">
          {header.fullName ? (
            <h2 className="text-2xl font-semibold text-slate-900">{header.fullName}</h2>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            {header.location ? <span>{header.location}</span> : null}
            {header.email ? <span>{header.email}</span> : null}
            {header.phone ? <span>{header.phone}</span> : null}
            {header.linkedin ? <span>{header.linkedin}</span> : null}
          </div>
          {header.notes ? <p className="mt-2 text-xs text-slate-500">{header.notes}</p> : null}
        </header>
      ) : null}

      {content.targetRoleTitle ? (
        <p className="mt-4 text-sm font-medium text-slate-700">
          Target role: {content.targetRoleTitle}
        </p>
      ) : null}

      {content.professionalSummary.text ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Professional summary
          </h3>
          <p className="mt-2 leading-relaxed text-slate-800">
            {content.professionalSummary.text}
          </p>
          <RiskFlagList flags={content.professionalSummary.riskFlags} className="mt-2" />
        </section>
      ) : null}

      {content.skills.groups.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</h3>
          <div className="mt-2 space-y-2">
            {content.skills.groups.map((group) => (
              <div key={`${group.label}-${group.items.join("|")}`}>
                <p className="font-medium text-slate-900">{group.label}</p>
                <p className="text-slate-700">{group.items.join(" · ")}</p>
              </div>
            ))}
          </div>
          <RiskFlagList flags={content.skills.riskFlags} className="mt-2" />
        </section>
      ) : null}

      {content.experience.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Work experience
          </h3>
          <div className="mt-2 space-y-4">
            {content.experience.map((experience) => (
              <div key={`${experience.company}-${experience.role}-${experience.dateRange ?? ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {experience.role} · {experience.company}
                  </p>
                  {experience.dateRange ? (
                    <p className="text-xs text-slate-500">{experience.dateRange}</p>
                  ) : null}
                </div>
                {experience.location ? (
                  <p className="text-xs text-slate-500">{experience.location}</p>
                ) : null}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                  {experience.bullets.map((bullet) => (
                    <li key={bullet.text}>{bullet.text}</li>
                  ))}
                </ul>
                <RiskFlagList flags={experience.riskFlags} className="mt-2" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.education.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Education
          </h3>
          <div className="mt-2 space-y-3">
            {content.education.map((item) => (
              <div key={`${item.institution}-${item.dateRange ?? ""}`}>
                <p className="font-semibold text-slate-900">{item.institution}</p>
                {item.programmes.length > 0 ? (
                  <p className="text-slate-700">{item.programmes.join(" · ")}</p>
                ) : null}
                {item.dateRange ? (
                  <p className="text-xs text-slate-500">{item.dateRange}</p>
                ) : null}
                {item.bullets.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                <RiskFlagList flags={item.riskFlags} className="mt-2" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.additionalExperience.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Additional experience
          </h3>
          <ul className="mt-2 space-y-2 text-slate-700">
            {content.additionalExperience.map((item) => (
              <li key={item.text}>
                {item.category ? (
                  <span className="font-medium text-slate-900">{item.category}: </span>
                ) : null}
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export { hasSourceRefs };
