import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";

/** Browser layout preview spacing (slider tuning UI). */
export const RESUME_LAYOUT_SPACING = {
  headerBottomRem: 0.15,
  sectionBodyTopRem: 0.375,
  entryGapRem: 0.625,
  bulletListTopRem: 0.125,
  bulletGapRem: 0.125,
  bulletPaddingLeftRem: 1.25,
  rowGapRem: 0.75,
  compactLineGapRem: 0.125,
} as const;

/**
 * Canonical print/PDF spacing — used by `renderResumePdfHtml()` only.
 * Tighter and deterministic for Puppeteer; do not inherit Tailwind/browser defaults.
 */
export const RESUME_PRINT_LAYOUT_SPACING = {
  headerBottomRem: 0.12,
  sectionBodyTopRem: 0.28,
  entryGapRem: 0.42,
  bulletListTopRem: 0.06,
  bulletGapRem: 0.05,
  bulletPaddingLeftRem: 1.1,
  rowGapRem: 0.45,
  compactLineGapRem: 0.06,
  sectionHeadingPaddingBottomRem: 0.04,
} as const;

export const RESUME_PDF_HTML_A4_MARKER = "resume-pdf-a4-page";

/** Render/export-time only — does not mutate stored profile data. */
export function formatCandidateDisplayName(fullName: string): string {
  return fullName.trim().toLocaleUpperCase("en-US");
}

export type ResumeLayoutCssInput = {
  fontFamily: string;
  bodyPx: number;
  headerPx: number;
  lineSpacing: number;
  sectionSpacingRem: number;
  marginTopMm: number;
  marginMm: number;
  pageMarkerClass?: string;
};

/** Stylesheet for canonical print/PDF HTML (`renderResumePdfHtml`). */
export function buildResumeLayoutStylesheet(input: ResumeLayoutCssInput): string {
  const pageMarkerClass = input.pageMarkerClass ?? RESUME_PDF_HTML_A4_MARKER;
  const spacing = RESUME_PRINT_LAYOUT_SPACING;

  return `
    @page {
      size: A4;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
    }

    html {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    p, h1, h2, ul, ol, li, header, section, div {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: ${input.fontFamily};
      font-size: ${input.bodyPx}px;
      line-height: ${input.lineSpacing};
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .${pageMarkerClass} {
      width: ${A4_WIDTH_MM}mm;
      min-height: ${A4_HEIGHT_MM}mm;
      max-width: ${A4_WIDTH_MM}mm;
      padding: ${input.marginTopMm}mm ${input.marginMm}mm ${input.marginMm}mm;
      line-height: ${input.lineSpacing};
      overflow: hidden;
    }

    .resume-header {
      margin-bottom: ${spacing.headerBottomRem}rem;
    }

    .candidate-name {
      margin: 0 0 ${spacing.headerBottomRem}rem;
      font-size: ${input.headerPx}px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: ${input.lineSpacing};
    }

    .contact-line {
      font-size: ${input.bodyPx}px;
      line-height: ${input.lineSpacing};
    }

    .resume-section {
      margin-top: ${input.sectionSpacingRem}rem;
    }

    .resume-section:first-of-type {
      margin-top: ${input.sectionSpacingRem}rem;
    }

    .section-heading {
      padding-bottom: ${spacing.sectionHeadingPaddingBottomRem}rem;
      border-bottom: 1px solid #94a3b8;
      font-size: ${input.headerPx}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      line-height: ${input.lineSpacing};
    }

    .section-body {
      margin-top: ${spacing.sectionBodyTopRem}rem;
      display: flex;
      flex-direction: column;
      gap: ${spacing.entryGapRem}rem;
      line-height: ${input.lineSpacing};
    }

    .section-body.compact-lines {
      gap: ${spacing.compactLineGapRem}rem;
    }

    .section-body.plain-text {
      display: block;
    }

    .two-col-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: ${spacing.rowGapRem}rem;
      line-height: ${input.lineSpacing};
    }

    .two-col-row + .two-col-row {
      margin-top: 0;
    }

    .two-col-row + ul {
      margin-top: ${spacing.bulletListTopRem}rem;
    }

    .row-left {
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .row-right {
      flex: 0 0 auto;
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .company-name {
      font-weight: 700;
    }

    .company-descriptor {
      font-weight: 400;
    }

    .role-line,
    .degree-line {
      font-style: italic;
    }

    .institution-line {
      font-weight: 700;
    }

    ul {
      list-style-type: disc;
      list-style-position: outside;
      padding-left: ${spacing.bulletPaddingLeftRem}rem;
    }

    li {
      line-height: ${input.lineSpacing};
    }

    li + li {
      margin-top: ${spacing.bulletGapRem}rem;
    }

    .keyword {
      text-decoration: underline;
    }

    .compact-line {
      line-height: ${input.lineSpacing};
    }
  `.trim();
}

export function buildResumeLayoutCssFromModel(model: ResumeDocumentModel): ResumeLayoutCssInput {
  const marginTopMm = model.pageFit.marginTopMm ?? model.pageFit.marginMm;
  return {
    fontFamily: model.fontFamily,
    bodyPx: model.fontSizes.bodyPx,
    headerPx: model.fontSizes.sectionPx,
    lineSpacing: model.layoutSettings.lineSpacing,
    sectionSpacingRem: model.layoutSettings.sectionSpacing,
    marginTopMm,
    marginMm: model.pageFit.marginMm,
  };
}
