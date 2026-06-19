import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { buildCompanyLineSegments } from "@/lib/resume-draft/docx-layout-helpers";
import {
  buildResumeLayoutCssFromModel,
  buildResumeLayoutStylesheet,
  formatCandidateDisplayName,
  RESUME_PDF_HTML_A4_MARKER,
} from "@/lib/resume-draft/resume-layout-styles";
import { PREVIEW_HEADER_OFFSET_PX } from "@/lib/resume-draft/preview-settings";

export { RESUME_PDF_HTML_A4_MARKER };

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
  const { layout, headerAlignment } = model;
  const cssInput = buildResumeLayoutCssFromModel(model);
  const stylesheet = buildResumeLayoutStylesheet(cssInput);
  const headerAlign = headerAlignment === "center" ? "center" : "left";

  const sections: string[] = [];

  if (layout.header.fullName || layout.header.contactLine) {
    sections.push(`<header class="resume-header" style="text-align:${headerAlign}">`);
    if (layout.header.fullName) {
      sections.push(
        `<h1 class="candidate-name">${escapeHtml(formatCandidateDisplayName(layout.header.fullName))}</h1>`,
      );
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
      sections.push("<div>");
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
      sections.push("<div>");
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
      `<p class="section-body plain-text">${escapeHtml(layout.additionalExperienceLine)}</p>`,
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
${stylesheet}
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
