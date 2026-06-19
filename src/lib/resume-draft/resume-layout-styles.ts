import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";

/** Shared spacing constants — preview and PDF HTML must stay in sync. */
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

/** Stylesheet for PDF HTML export — mirrors browser preview spacing. */
export function buildResumeLayoutStylesheet(input: ResumeLayoutCssInput): string {
  const pageMarkerClass = input.pageMarkerClass ?? RESUME_PDF_HTML_A4_MARKER;
  const spacing = RESUME_LAYOUT_SPACING;

  return `
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
    }

    p, h1, h2, ul, li {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: ${input.fontFamily};
      font-size: ${input.bodyPx}px;
      line-height: ${input.lineSpacing};
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .${pageMarkerClass} {
      width: ${A4_WIDTH_MM}mm;
      min-height: ${A4_HEIGHT_MM}mm;
      padding: ${input.marginTopMm}mm ${input.marginMm}mm ${input.marginMm}mm;
      line-height: ${input.lineSpacing};
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
    }

    .contact-line {
      font-size: ${input.bodyPx}px;
      line-height: ${input.lineSpacing};
    }

    .resume-section {
      margin-top: ${input.sectionSpacingRem}rem;
    }

    .section-heading {
      padding-bottom: 0;
      border-bottom: 1px solid #94a3b8;
      font-size: ${input.headerPx}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
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
      gap: unset;
    }

    .two-col-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: ${spacing.rowGapRem}rem;
      line-height: ${input.lineSpacing};
    }

    .row-left {
      flex: 1 1 auto;
      min-width: 0;
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
      margin-top: ${spacing.bulletListTopRem}rem;
      padding-left: ${spacing.bulletPaddingLeftRem}rem;
    }

    li + li {
      margin-top: ${spacing.bulletGapRem}rem;
    }

    li {
      line-height: ${input.lineSpacing};
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
