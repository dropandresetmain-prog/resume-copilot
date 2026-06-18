"use client";

import { formatCompanyLine } from "@/lib/resume-draft/layout";
import type { FinalResumeLayout, PageFitEstimate } from "@/lib/resume-draft/layout";

export const A4_PAGE_PREVIEW_TEST_ID = "a4-page-container";

type FinalResumeLayoutPreviewProps = {
  layout: FinalResumeLayout;
  pageFit: PageFitEstimate;
  className?: string;
};

function KeywordBullet({
  keyword,
  statement,
}: {
  keyword: string;
  statement: string;
}) {
  return (
    <li className="text-[10pt] leading-snug">
      <span className="underline">{keyword}:</span> {statement}
    </li>
  );
}

function AchievementBullet({
  prefix,
  underlinePrefix,
  text,
}: {
  prefix?: string;
  underlinePrefix: boolean;
  text: string;
}) {
  return (
    <li className="text-[10pt] leading-snug">
      {prefix ? (
        <>
          <span className={underlinePrefix ? "underline" : undefined}>{prefix}</span> {text}
        </>
      ) : (
        text
      )}
    </li>
  );
}

function LabeledCompactLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10pt] leading-snug">
      <span className="underline">{label}:</span> {value}
    </p>
  );
}

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
          {pageFit.maxLinesOnePage} target). Consider reducing bullets via Edit Resume Details.
        </p>
      ) : null}

      <div className="rounded-xl bg-slate-200/80 p-4 sm:p-6">
        <div
          data-testid={A4_PAGE_PREVIEW_TEST_ID}
          className="relative mx-auto overflow-hidden bg-white shadow-xl ring-1 ring-slate-300"
          style={{
            width: "min(210mm, 100%)",
            aspectRatio: "210 / 297",
            maxWidth: "100%",
          }}
        >
          <div
            className="h-full overflow-hidden text-slate-900"
            style={{
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
                    <div
                      key={`${experience.company}-${experience.role}-${experience.dateRange ?? ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold">
                          {formatCompanyLine(experience.company, experience.companyDescriptor)}
                        </p>
                        {experience.location ? (
                          <p className="shrink-0 text-[9.5pt]">{experience.location}</p>
                        ) : null}
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="italic">{experience.role}</p>
                        {experience.dateRange ? (
                          <p className="shrink-0 text-[9.5pt]">{experience.dateRange}</p>
                        ) : null}
                      </div>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {experience.bullets.map((bullet) => (
                          <KeywordBullet
                            key={bullet.rawText}
                            keyword={bullet.keyword}
                            statement={bullet.statement}
                          />
                        ))}
                      </ul>
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
                <div className="mt-2 space-y-3">
                  {layout.education.map((item, itemIndex) => (
                    <div key={`education-${itemIndex}`}>
                      {item.degreeBlocks.map((block, blockIndex) => (
                        <div
                          key={`${block.titleLine}-${blockIndex}`}
                          className={blockIndex > 0 ? "mt-2" : undefined}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-bold">{block.titleLine}</p>
                            {block.location ? (
                              <p className="shrink-0 text-[9.5pt]">{block.location}</p>
                            ) : null}
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="italic">{block.degreeLine}</p>
                            {block.dateRange ? (
                              <p className="shrink-0 text-[9.5pt]">{block.dateRange}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {item.achievementBullets.length > 0 ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {item.achievementBullets.map((bullet) => (
                            <AchievementBullet
                              key={bullet.rawText}
                              prefix={bullet.prefix}
                              underlinePrefix={bullet.underlinePrefix}
                              text={bullet.text}
                            />
                          ))}
                        </ul>
                      ) : null}
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

            {layout.skillsLine || layout.languagesLine || layout.interestsLine ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2 className="border-b border-slate-400 text-[11pt] font-bold uppercase tracking-wider">
                  Skills &amp; Interests
                </h2>
                <div className="mt-2 space-y-1">
                  {layout.skillsLine ? (
                    <LabeledCompactLine label="Skills" value={layout.skillsLine} />
                  ) : null}
                  {layout.languagesLine ? (
                    <LabeledCompactLine label="Languages" value={layout.languagesLine} />
                  ) : null}
                  {layout.interestsLine ? (
                    <LabeledCompactLine label="Interests" value={layout.interestsLine} />
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-slate-300"
            title="One-page boundary"
          />
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          A4 preview (210 × 297 mm) — dashed line marks one-page boundary
        </p>
      </div>
    </div>
  );
}
