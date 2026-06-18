"use client";

import { formatCompanyLine } from "@/lib/resume-draft/layout";
import type { FinalResumeLayout, PageFitEstimate } from "@/lib/resume-draft/layout";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  resolvePreviewFontSizes,
} from "@/lib/resume-draft/preview-settings";

export const A4_PAGE_PREVIEW_TEST_ID = "a4-page-container";
export const A4_PAGE_BOUNDARY_TEST_ID = "a4-page-boundary";
export const RESUME_OVERFLOW_VISIBLE_TEST_ID = "resume-overflow-visible";

type FinalResumeLayoutPreviewProps = {
  layout: FinalResumeLayout;
  pageFit: PageFitEstimate;
  fontFamily?: string;
  bodyFontPx?: number;
  headerAlignment?: "center" | "left";
  className?: string;
};

function KeywordBullet({
  keyword,
  statement,
  bodyPx,
}: {
  keyword: string;
  statement: string;
  bodyPx: number;
}) {
  return (
    <li style={{ fontSize: `${bodyPx}px` }} className="leading-snug">
      <span className="underline">{keyword}:</span> {statement}
    </li>
  );
}

function AchievementBullet({
  prefix,
  underlinePrefix,
  text,
  bodyPx,
}: {
  prefix?: string;
  underlinePrefix: boolean;
  text: string;
  bodyPx: number;
}) {
  return (
    <li style={{ fontSize: `${bodyPx}px` }} className="leading-snug">
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

function LabeledCompactLine({
  label,
  value,
  bodyPx,
}: {
  label: string;
  value: string;
  bodyPx: number;
}) {
  return (
    <p style={{ fontSize: `${bodyPx}px` }} className="leading-snug">
      <span className="underline">{label}:</span> {value}
    </p>
  );
}

export function FinalResumeLayoutPreview({
  layout,
  pageFit,
  fontFamily = DEFAULT_RESUME_FONT_FAMILY,
  bodyFontPx = PREVIEW_BODY_FONT_DEFAULT_PX,
  headerAlignment = "center",
  className = "",
}: FinalResumeLayoutPreviewProps) {
  const sizes = resolvePreviewFontSizes(bodyFontPx);
  const marginTopMm = pageFit.marginTopMm ?? pageFit.marginMm;
  const headerClassName =
    headerAlignment === "center" ? "text-center" : "text-left";

  return (
    <div className={className}>
      {pageFit.exceedsOnePage ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Estimated {pageFit.estimatedLines} lines (~{pageFit.estimatedPages.toFixed(1)} pages) vs{" "}
          {pageFit.maxLinesOnePage}-line one-page target
          {pageFit.overflowLines > 0
            ? ` — ~${pageFit.overflowLines} line(s) overflow.`
            : "."}{" "}
          Adjust font size and spacing, or reduce bullets via Edit Resume Details.
        </p>
      ) : null}

      <div className="flex justify-center rounded-xl bg-slate-200/80 p-4 sm:p-6">
        <div
          data-testid={A4_PAGE_PREVIEW_TEST_ID}
          className="relative w-full max-w-full bg-white shadow-xl ring-1 ring-slate-300"
          style={{
            width: `min(${A4_WIDTH_MM}mm, 100%)`,
            minHeight: `${A4_HEIGHT_MM}mm`,
          }}
        >
          <div
            data-testid={RESUME_OVERFLOW_VISIBLE_TEST_ID}
            className="relative text-slate-900"
            style={{
              padding: `${marginTopMm}mm ${pageFit.marginMm}mm ${pageFit.marginMm}mm`,
              fontFamily,
              fontSize: `${sizes.bodyPx}px`,
              lineHeight: pageFit.lineSpacing,
            }}
          >
            <header className={headerClassName}>
              {layout.header.fullName ? (
                <h1
                  className="font-bold tracking-wide"
                  style={{ fontSize: `${sizes.headerPx}px`, marginBottom: "0.15rem" }}
                >
                  {layout.header.fullName}
                </h1>
              ) : null}
              {layout.header.contactLine ? (
                <p style={{ fontSize: `${sizes.bodyPx}px` }}>{layout.header.contactLine}</p>
              ) : null}
            </header>

            {layout.workExperience.length > 0 ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px` }}
                >
                  Work Experience
                </h2>
                <div className="mt-1.5 space-y-2.5">
                  {layout.workExperience.map((experience) => (
                    <div
                      key={`${experience.company}-${experience.role}-${experience.dateRange ?? ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 flex-1 font-bold">
                          {formatCompanyLine(experience.company, experience.companyDescriptor)}
                        </p>
                        {experience.location ? (
                          <p className="shrink-0 text-right tabular-nums">{experience.location}</p>
                        ) : null}
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 flex-1 italic">{experience.role}</p>
                        {experience.dateRange ? (
                          <p className="shrink-0 text-right tabular-nums">{experience.dateRange}</p>
                        ) : null}
                      </div>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                        {experience.bullets.map((bullet) => (
                          <KeywordBullet
                            key={bullet.rawText}
                            keyword={bullet.keyword}
                            statement={bullet.statement}
                            bodyPx={sizes.bodyPx}
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
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px` }}
                >
                  Education
                </h2>
                <div className="mt-1.5 space-y-2.5">
                  {layout.education.map((item, itemIndex) => (
                    <div key={`education-${itemIndex}`}>
                      {item.degreeBlocks.map((block, blockIndex) => (
                        <div
                          key={`${block.titleLine}-${blockIndex}`}
                          className={blockIndex > 0 ? "mt-1.5" : undefined}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 flex-1 font-bold">{block.titleLine}</p>
                            {block.location ? (
                              <p className="shrink-0 text-right tabular-nums">{block.location}</p>
                            ) : null}
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 flex-1 italic">{block.degreeLine}</p>
                            {block.dateRange ? (
                              <p className="shrink-0 text-right tabular-nums">{block.dateRange}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {item.achievementBullets.length > 0 ? (
                        <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                          {item.achievementBullets.map((bullet) => (
                            <AchievementBullet
                              key={bullet.rawText}
                              prefix={bullet.prefix}
                              underlinePrefix={bullet.underlinePrefix}
                              text={bullet.text}
                              bodyPx={sizes.bodyPx}
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
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px` }}
                >
                  Additional Experience
                </h2>
                <p className="mt-1.5 leading-snug">{layout.additionalExperienceLine}</p>
              </section>
            ) : null}

            {layout.techLine || layout.skillsLine || layout.languagesLine || layout.interestsLine ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px` }}
                >
                  Skills &amp; Interests
                </h2>
                <div className="mt-1.5 space-y-0.5">
                  {layout.techLine ? (
                    <LabeledCompactLine label="Tech" value={layout.techLine} bodyPx={sizes.bodyPx} />
                  ) : null}
                  {layout.skillsLine ? (
                    <LabeledCompactLine label="Skills" value={layout.skillsLine} bodyPx={sizes.bodyPx} />
                  ) : null}
                  {layout.languagesLine ? (
                    <LabeledCompactLine
                      label="Languages"
                      value={layout.languagesLine}
                      bodyPx={sizes.bodyPx}
                    />
                  ) : null}
                  {layout.interestsLine ? (
                    <LabeledCompactLine
                      label="Interests"
                      value={layout.interestsLine}
                      bodyPx={sizes.bodyPx}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div
            data-testid={A4_PAGE_BOUNDARY_TEST_ID}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-amber-400/80"
            style={{ top: `${A4_HEIGHT_MM}mm` }}
            title="One-page boundary"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        A4 preview ({A4_WIDTH_MM} × {A4_HEIGHT_MM} mm) — dashed line marks one-page cutoff; content below
        remains visible
      </p>
    </div>
  );
}
