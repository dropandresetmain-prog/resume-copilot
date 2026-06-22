"use client";

import type { CSSProperties } from "react";

import { buildCompanyLineSegments } from "@/lib/resume-draft/docx-layout-helpers";
import type { FinalResumeLayout, PageFitEstimate } from "@/lib/resume-draft/layout";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_ITEM_LINE_SPACING_DEFAULT,
  resolvePreviewFontSizes,
} from "@/lib/resume-draft/preview-settings";
import {
  formatCandidateDisplayName,
  RESUME_LAYOUT_SPACING,
} from "@/lib/resume-draft/resume-layout-styles";

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

const spacing = RESUME_LAYOUT_SPACING;

function rowStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: `${spacing.rowGapRem}rem`,
  };
}

function KeywordBullet({
  keyword,
  statement,
}: {
  keyword: string;
  statement: string;
}) {
  return (
    <>
      <span className="underline">{keyword}:</span> {statement}
    </>
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
  return prefix ? (
    <>
      <span className={underlinePrefix ? "underline" : undefined}>{prefix}</span> {text}
    </>
  ) : (
    <>{text}</>
  );
}

function LabeledCompactLine({
  label,
  value,
  lineHeight,
  marginTop,
}: {
  label: string;
  value: string;
  lineHeight: number;
  marginTop?: string;
}) {
  return (
    <p style={{ marginTop, lineHeight }}>
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
  const wrappedLineHeight = pageFit.lineSpacing;
  const itemLineSpacing = pageFit.itemLineSpacing ?? PREVIEW_ITEM_LINE_SPACING_DEFAULT;
  const itemGapEm = Math.max(0, itemLineSpacing - wrappedLineHeight);
  const bulletItemGap = `calc(${itemGapEm}em + ${spacing.bulletGapRem}rem)`;
  const compactItemGap = `calc(${itemGapEm}em + ${spacing.compactLineGapRem}rem)`;
  const headerClassName =
    headerAlignment === "center" ? "text-center" : "text-left";

  const bulletListStyle: CSSProperties = {
    marginTop: `${spacing.bulletListTopRem}rem`,
    paddingLeft: `${spacing.bulletPaddingLeftRem}rem`,
    listStyleType: "disc",
    listStylePosition: "outside",
  };

  const sectionBodyStyle: CSSProperties = {
    marginTop: `${spacing.sectionBodyTopRem}rem`,
    display: "flex",
    flexDirection: "column",
    gap: `${spacing.entryGapRem}rem`,
  };

  const compactLinesStyle: CSSProperties = {
    marginTop: `${spacing.sectionBodyTopRem}rem`,
    display: "flex",
    flexDirection: "column",
    gap: 0,
  };

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
              lineHeight: wrappedLineHeight,
            }}
          >
            <header
              className={headerClassName}
              style={{ marginBottom: `${spacing.headerBottomRem}rem` }}
            >
              {layout.header.fullName ? (
                <h1
                  className="font-bold uppercase tracking-wide"
                  style={{
                    fontSize: `${sizes.sectionPx}px`,
                    marginBottom: `${spacing.headerBottomRem}rem`,
                    lineHeight: wrappedLineHeight,
                  }}
                >
                  {formatCandidateDisplayName(layout.header.fullName)}
                </h1>
              ) : null}
              {layout.header.contactLine ? (
                <p style={{ fontSize: `${sizes.bodyPx}px`, lineHeight: wrappedLineHeight }}>
                  {layout.header.contactLine}
                </p>
              ) : null}
            </header>

            {layout.workExperience.length > 0 ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px`, lineHeight: wrappedLineHeight }}
                >
                  Work Experience
                </h2>
                <div style={sectionBodyStyle}>
                  {layout.workExperience.map((experience) => (
                    <div
                      key={`${experience.company}-${experience.role}-${experience.dateRange ?? ""}`}
                    >
                      <div style={rowStyle()}>
                        <p className="min-w-0 flex-1">
                          {buildCompanyLineSegments(
                            experience.company,
                            experience.companyDescriptor,
                          ).map((segment, segmentIndex) => (
                            <span
                              key={`${segment.text}-${segmentIndex}`}
                              className={segment.bold ? "font-bold" : undefined}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </p>
                        {experience.location ? (
                          <p className="shrink-0 text-right tabular-nums">{experience.location}</p>
                        ) : null}
                      </div>
                      <div style={rowStyle()}>
                        <p className="min-w-0 flex-1 italic">{experience.role}</p>
                        {experience.dateRange ? (
                          <p className="shrink-0 text-right tabular-nums">{experience.dateRange}</p>
                        ) : null}
                      </div>
                      <ul style={bulletListStyle}>
                        {experience.bullets.map((bullet, bulletIndex) => (
                          <li
                            key={bullet.rawText}
                            style={
                              bulletIndex > 0
                                ? { marginTop: bulletItemGap, lineHeight: wrappedLineHeight }
                                : { lineHeight: wrappedLineHeight }
                            }
                          >
                            <KeywordBullet keyword={bullet.keyword} statement={bullet.statement} />
                          </li>
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
                  style={{ fontSize: `${sizes.sectionPx}px`, lineHeight: wrappedLineHeight }}
                >
                  Education
                </h2>
                <div style={sectionBodyStyle}>
                  {layout.education.map((item, itemIndex) => (
                    <div key={`education-${itemIndex}`}>
                      <div style={rowStyle()}>
                        <p className="min-w-0 flex-1 font-bold">{item.institutionLine}</p>
                        {item.location ? (
                          <p className="shrink-0 text-right tabular-nums">{item.location}</p>
                        ) : null}
                      </div>
                      {item.degreeLines.map((degree, degreeIndex) => (
                        <div key={`${degree.text}-${degreeIndex}`} style={rowStyle()}>
                          <p className="min-w-0 flex-1 italic">{degree.text}</p>
                          {degree.dateRange ? (
                            <p className="shrink-0 text-right tabular-nums">{degree.dateRange}</p>
                          ) : null}
                        </div>
                      ))}
                      {item.achievementBullets.length > 0 ? (
                        <ul style={bulletListStyle}>
                          {item.achievementBullets.map((bullet, bulletIndex) => (
                            <li
                              key={bullet.rawText}
                              style={
                                bulletIndex > 0
                                  ? { marginTop: bulletItemGap, lineHeight: wrappedLineHeight }
                                  : { lineHeight: wrappedLineHeight }
                              }
                            >
                              <AchievementBullet
                                prefix={bullet.prefix}
                                underlinePrefix={bullet.underlinePrefix}
                                text={bullet.text}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {layout.additionalExperienceEntries.length > 0 ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px`, lineHeight: wrappedLineHeight }}
                >
                  Additional Experience
                </h2>
                <div style={compactLinesStyle}>
                  {layout.additionalExperienceEntries.map((entry, entryIndex) => (
                    <p
                      key={`${entry.title}-${entryIndex}`}
                      style={{
                        marginTop: entryIndex > 0 ? compactItemGap : undefined,
                        lineHeight: wrappedLineHeight,
                      }}
                    >
                      <span className="underline">{entry.title}:</span> {entry.detail}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {layout.skillsLine || layout.languagesLine || layout.interestsLine ? (
              <section style={{ marginTop: `${pageFit.sectionSpacing}rem` }}>
                <h2
                  className="border-b border-slate-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: `${sizes.sectionPx}px`, lineHeight: wrappedLineHeight }}
                >
                  Skills &amp; Interests
                </h2>
                <div style={compactLinesStyle}>
                  {(
                    [
                      layout.skillsLine ? { label: "Skills", value: layout.skillsLine } : null,
                      layout.languagesLine
                        ? { label: "Languages", value: layout.languagesLine }
                        : null,
                      layout.interestsLine
                        ? { label: "Interests", value: layout.interestsLine }
                        : null,
                    ] as const
                  )
                    .filter(Boolean)
                    .map((line, lineIndex) => (
                      <LabeledCompactLine
                        key={line!.label}
                        label={line!.label}
                        value={line!.value}
                        lineHeight={wrappedLineHeight}
                        marginTop={lineIndex > 0 ? compactItemGap : undefined}
                      />
                    ))}
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
