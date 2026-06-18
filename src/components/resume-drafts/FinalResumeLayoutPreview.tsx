"use client";

import type { FinalResumeLayout, PageFitEstimate } from "@/lib/resume-draft/layout";

type FinalResumeLayoutPreviewProps = {
  layout: FinalResumeLayout;
  pageFit: PageFitEstimate;
  className?: string;
};

export function FinalResumeLayoutPreview({
  layout,
  pageFit,
  className = "",
}: FinalResumeLayoutPreviewProps) {
  return (
    <div className={className}>
      {pageFit.exceedsOnePage ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This draft is estimated to exceed one page ({pageFit.estimatedLines} lines vs{" "}
          {pageFit.maxLinesOnePage} target).
        </p>
      ) : null}

      <div
        className="mx-auto bg-white text-slate-900 shadow-lg"
        style={{
          width: "210mm",
          minHeight: "297mm",
          maxWidth: "100%",
          padding: `${pageFit.marginMm}mm`,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "10.5pt",
          lineHeight: pageFit.lineSpacing,
        }}
      >
        <header className="text-center">
          {layout.header.fullName ? (
            <h1 className="text-[16pt] font-bold tracking-wide">{layout.header.fullName}</h1>
          ) : null}
          {layout.header.contactLine ? (
            <p className="mt-1 text-[10pt]">{layout.header.contactLine}</p>
          ) : null}
        </header>

        {layout.workExperience.length > 0 ? (
          <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
            <h2 className="border-b border-slate-400 text-[11pt] font-bold uppercase tracking-wider">
              Work Experience
            </h2>
            <div className="mt-2 space-y-3">
              {layout.workExperience.map((experience) => (
                <div key={`${experience.company}-${experience.role}-${experience.dateRange ?? ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">
                      {experience.role} · {experience.company}
                    </p>
                    {experience.dateRange ? (
                      <p className="shrink-0 text-[9.5pt]">{experience.dateRange}</p>
                    ) : null}
                  </div>
                  {experience.location ? (
                    <p className="text-[9.5pt] italic text-slate-700">{experience.location}</p>
                  ) : null}
                  <div className="mt-1 space-y-1">
                    {experience.bullets.map((bullet) => (
                      <p key={bullet.rawText} className="text-[10pt] leading-snug">
                        <span className="font-semibold">{bullet.keyword}:</span> {bullet.statement}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {layout.education.length > 0 ? (
          <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
            <h2 className="border-b border-slate-400 text-[11pt] font-bold uppercase tracking-wider">
              Education
            </h2>
            <div className="mt-2 space-y-2">
              {layout.education.map((item) => (
                <div key={`${item.institution}-${item.dateRange ?? ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">{item.institution}</p>
                    {item.dateRange ? (
                      <p className="shrink-0 text-[9.5pt]">{item.dateRange}</p>
                    ) : null}
                  </div>
                  {item.programmesLine ? (
                    <p className="text-[10pt]">{item.programmesLine}</p>
                  ) : null}
                  {item.bullets.map((bullet) => (
                    <p key={bullet} className="text-[10pt] leading-snug">
                      {bullet}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {layout.additionalExperienceLine ? (
          <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
            <h2 className="border-b border-slate-400 text-[11pt] font-bold uppercase tracking-wider">
              Additional Experience
            </h2>
            <p className="mt-2 text-[10pt] leading-snug">{layout.additionalExperienceLine}</p>
          </section>
        ) : null}

        {layout.skillsLine || layout.interestsLine ? (
          <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
            <h2 className="border-b border-slate-400 text-[11pt] font-bold uppercase tracking-wider">
              Skills &amp; Interests
            </h2>
            {layout.skillsLine ? (
              <p className="mt-2 text-[10pt] leading-snug">
                <span className="font-bold">Skills</span>
                <br />
                {layout.skillsLine}
              </p>
            ) : null}
            {layout.interestsLine ? (
              <p className="mt-2 text-[10pt] leading-snug">
                <span className="font-bold">Interests</span>
                <br />
                {layout.interestsLine}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
