import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { buildCompanyLineSegments } from "@/lib/resume-draft/docx-layout-helpers";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  PREVIEW_HEADER_OFFSET_PX,
} from "@/lib/resume-draft/preview-settings";

export const RESUME_PDF_HTML_A4_MARKER = "resume-pdf-a4-page";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCompanyLineHtml(company: string, companyDescriptor?: string): string {
  return buildCompanyLineSegments(company, companyDescriptor)
    .map((segment) =>
      segment.bold
        ? `<span class="company-name">${escapeHtml(segment.text)}</span>`
        : `<span class="company-descriptor">${escapeHtml(segment.text)}</span>`,
    )
    .join("");
}

function renderTwoColumnRow(leftHtml: string, rightText: string | undefined): string {
  const right = rightText?.trim()
    ? `<span class="row-right">${escapeHtml(rightText.trim())}</span>`
    : "";
  return `<div class="two-col-row"><span class="row-left">${leftHtml}</span>${right}</div>`;
}

function renderKeywordBullet(keyword: string, statement: string): string {
  return `<li><span class="keyword">${escapeHtml(keyword)}:</span> ${escapeHtml(statement)}</li>`;
}

function renderAchievementBullet(
  prefix: string | undefined,
  underlinePrefix: boolean,
  text: string,
): string {
  if (prefix) {
    const prefixClass = underlinePrefix ? ' class="keyword"' : "";
    return `<li><span${prefixClass}>${escapeHtml(prefix)}</span> ${escapeHtml(text)}</li>`;
  }
  return `<li>${escapeHtml(text)}</li>`;
}

function renderLabeledLine(label: string, value: string): string {
  return `<p class="compact-line"><span class="keyword">${escapeHtml(label)}:</span> ${escapeHtml(value)}</p>`;
}

function renderSectionHeading(title: string): string {
  return `<h2 class="section-heading">${escapeHtml(title)}</h2>`;
}

/**
 * Self-contained HTML document for direct HTML→PDF export from the canonical document model.
 */
export function renderResumePdfHtml(model: ResumeDocumentModel): string {
  const { layout, layoutSettings, fontSizes, fontFamily, headerAlignment, pageFit } = model;
  const marginTopMm = pageFit.marginTopMm ?? pageFit.marginMm;
  const headerAlign = headerAlignment === "center" ? "center" : "left";
  const bodyPx = fontSizes.bodyPx;
  const headerPx = fontSizes.sectionPx;

  const sections: string[] = [];

  if (layout.header.fullName || layout.header.contactLine) {
    sections.push(`<header class="resume-header" style="text-align:${headerAlign}">`);
    if (layout.header.fullName) {
      sections.push(`<h1 class="candidate-name">${escapeHtml(layout.header.fullName)}</h1>`);
    }
    if (layout.header.contactLine) {
      sections.push(`<p class="contact-line">${escapeHtml(layout.header.contactLine)}</p>`);
    }
    sections.push("</header>");
  }

  if (layout.workExperience.length > 0) {
    sections.push('<section class="resume-section">');
    sections.push(renderSectionHeading("Work Experience"));
    sections.push('<div class="section-body">');
    for (const experience of layout.workExperience) {
      sections.push('<div class="experience-block">');
      sections.push(
        renderTwoColumnRow(
          renderCompanyLineHtml(experience.company, experience.companyDescriptor),
          experience.location,
        ),
      );
      sections.push(
        renderTwoColumnRow(
          `<span class="role-line">${escapeHtml(experience.role)}</span>`,
          experience.dateRange,
        ),
      );
      if (experience.bullets.length > 0) {
        sections.push("<ul>");
        for (const bullet of experience.bullets) {
          sections.push(renderKeywordBullet(bullet.keyword, bullet.statement));
        }
        sections.push("</ul>");
      }
      sections.push("</div>");
    }
    sections.push("</div></section>");
  }

  if (layout.education.length > 0) {
    sections.push('<section class="resume-section">');
    sections.push(renderSectionHeading("Education"));
    sections.push('<div class="section-body">');
    for (const item of layout.education) {
      sections.push('<div class="education-block">');
      sections.push(
        renderTwoColumnRow(
          `<span class="institution-line">${escapeHtml(item.institutionLine)}</span>`,
          item.location,
        ),
      );
      for (const degree of item.degreeLines) {
        sections.push(
          renderTwoColumnRow(
            `<span class="degree-line">${escapeHtml(degree.text)}</span>`,
            degree.dateRange,
          ),
        );
      }
      if (item.achievementBullets.length > 0) {
        sections.push("<ul>");
        for (const bullet of item.achievementBullets) {
          sections.push(
            renderAchievementBullet(bullet.prefix, bullet.underlinePrefix, bullet.text),
          );
        }
        sections.push("</ul>");
      }
      sections.push("</div>");
    }
    sections.push("</div></section>");
  }

  if (layout.additionalExperienceLine) {
    sections.push('<section class="resume-section">');
    sections.push(renderSectionHeading("Additional Experience"));
    sections.push(
      `<p class="section-body">${escapeHtml(layout.additionalExperienceLine)}</p>`,
    );
    sections.push("</section>");
  }

  if (
    layout.techLine ||
    layout.skillsLine ||
    layout.languagesLine ||
    layout.interestsLine
  ) {
    sections.push('<section class="resume-section">');
    sections.push(renderSectionHeading("Skills & Interests"));
    sections.push('<div class="section-body compact-lines">');
    if (layout.techLine) {
      sections.push(renderLabeledLine("Tech", layout.techLine));
    }
    if (layout.skillsLine) {
      sections.push(renderLabeledLine("Skills", layout.skillsLine));
    }
    if (layout.languagesLine) {
      sections.push(renderLabeledLine("Languages", layout.languagesLine));
    }
    if (layout.interestsLine) {
      sections.push(renderLabeledLine("Interests", layout.interestsLine));
    }
    sections.push("</div></section>");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Resume</title>
  <style>
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

    body {
      font-family: ${fontFamily};
      font-size: ${bodyPx}px;
      line-height: ${layoutSettings.lineSpacing};
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .${RESUME_PDF_HTML_A4_MARKER} {
      width: ${A4_WIDTH_MM}mm;
      min-height: ${A4_HEIGHT_MM}mm;
      padding: ${marginTopMm}mm ${pageFit.marginMm}mm ${pageFit.marginMm}mm;
    }

    .resume-header {
      margin-bottom: 0.15rem;
    }

    .candidate-name {
      margin: 0 0 0.15rem;
      font-size: ${headerPx}px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .contact-line {
      margin: 0;
      font-size: ${bodyPx}px;
    }

    .resume-section {
      margin-top: ${layoutSettings.sectionSpacing}rem;
    }

    .section-heading {
      margin: 0 0 0.35rem;
      padding-bottom: 0.1rem;
      border-bottom: 1px solid #94a3b8;
      font-size: ${headerPx}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .section-body {
      margin-top: 0.35rem;
    }

    .experience-block,
    .education-block {
      margin-bottom: 0.55rem;
    }

    .experience-block:last-child,
    .education-block:last-child {
      margin-bottom: 0;
    }

    .two-col-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
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
      margin: 0.15rem 0 0;
      padding-left: 1.25rem;
    }

    li {
      margin: 0.08rem 0;
    }

    .keyword {
      text-decoration: underline;
    }

    .compact-line {
      margin: 0.08rem 0;
    }

    .compact-lines .compact-line:first-child {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="${RESUME_PDF_HTML_A4_MARKER}">
    ${sections.join("\n    ")}
  </div>
</body>
</html>`;
}

/** Header size offset used in PDF HTML (px), mirrors preview + DOCX +1 hierarchy. */
export function resumePdfHeaderOffsetPx(): number {
  return PREVIEW_HEADER_OFFSET_PX;
}
