import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDocumentModel } from "../src/lib/resume-draft/document-model";
import {
  parseStoredExportLayoutSettings,
  sanitizeExportLayoutSettings,
} from "../src/lib/resume-draft/export-layout-settings";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import { renderResumePdfHtml } from "../src/lib/resume-draft/pdf-html";
import {
  PREVIEW_HEADER_OFFSET_PX,
  PREVIEW_LINE_SPACING_DEFAULT,
  PREVIEW_SECTION_SPACING_DEFAULT,
  resolvePreviewFontSizes,
} from "../src/lib/resume-draft/preview-settings";
import {
  buildResumeLayoutCssFromModel,
  buildResumeLayoutStylesheet,
  formatCandidateDisplayName,
  RESUME_LAYOUT_SPACING,
  RESUME_PRINT_LAYOUT_SPACING,
  RESUME_PDF_HTML_A4_MARKER,
} from "../src/lib/resume-draft/resume-layout-styles";
import {
  mapPreviewBodyPxToDocxHalfPoints,
  mapPreviewHeaderPxToDocxHalfPoints,
  resolveDocxFontSizes,
} from "../src/lib/resume-draft/docx-font";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-parity-1",
  rawText: "Product Manager role.",
  companyName: "Pave Bank",
  roleTitle: "Product Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        profile: {
          fullName: "Hset Min Htet",
          email: "name@example.com",
          phone: "+65 0000 0000",
          rawText: "Hset Min Htet",
          parseWarnings: [],
        },
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme",
            descriptor: "Global fintech",
            location: "Singapore",
            role: "Product Manager",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "bullet-1",
                parentId: "exp-1",
                keyword: "Strategy",
                description: "Supported market entry initiatives",
                rawBulletText: "Strategy: Supported market entry initiatives",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: ["Python"],
          interests: ["Running"],
          other: [],
          rawText: "",
          parseWarnings: [],
        },
        unparsedSections: [],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
  };
}

function main() {
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const draft = generateMockResumeDraft(generationInput);
  const storedSettings = {
    bodyFontPx: 10,
    marginMm: 11,
    marginTopMm: 8,
    lineSpacing: 1.08,
    sectionSpacing: 0.5,
  };
  const contentWithSettings = {
    ...draft.content,
    exportLayoutSettings: storedSettings,
  };

  const liveOverride = {
    bodyFontPx: 11,
    marginMm: 12,
    marginTopMm: 9,
    lineSpacing: 1.05,
    sectionSpacing: 0.6,
  };

  const modelFromStored = buildResumeDocumentModel({
    draftId: "draft-parity-1",
    draftStatus: "approved",
    content: contentWithSettings,
    fullName: "Hset Min Htet",
    companyName: sampleJd.companyName,
    roleTitle: sampleJd.roleTitle,
  });

  const modelFromOverride = buildResumeDocumentModel({
    draftId: "draft-parity-1",
    draftStatus: "approved",
    content: contentWithSettings,
    layoutSettings: liveOverride,
    fullName: "Hset Min Htet",
  });

  const pdfHtml = renderResumePdfHtml(modelFromOverride);
  const stylesheet = buildResumeLayoutStylesheet(buildResumeLayoutCssFromModel(modelFromOverride));
  const fontSizes = resolvePreviewFontSizes(liveOverride.bodyFontPx);
  const docxSizes = resolveDocxFontSizes(liveOverride.bodyFontPx);

  const checks: [string, boolean][] = [
    [
      "uppercase display name helper",
      formatCandidateDisplayName("Hset Min Htet") === "HSET MIN HTET",
    ],
    [
      "pdf html renders uppercase name",
      pdfHtml.includes("HSET MIN HTET") && !pdfHtml.includes(">Hset Min Htet<"),
    ],
    [
      "stored settings used when no override",
      modelFromStored.layoutSettings.bodyFontPx === storedSettings.bodyFontPx &&
        modelFromStored.layoutSettings.lineSpacing === storedSettings.lineSpacing,
    ],
    [
      "live override wins over stored settings",
      modelFromOverride.layoutSettings.bodyFontPx === liveOverride.bodyFontPx &&
        modelFromOverride.layoutSettings.sectionSpacing === liveOverride.sectionSpacing,
    ],
    [
      "shared section body top spacing constant",
      RESUME_LAYOUT_SPACING.sectionBodyTopRem === 0.375,
    ],
    [
      "print layout uses tighter entry gap than browser preview",
      RESUME_PRINT_LAYOUT_SPACING.entryGapRem < RESUME_LAYOUT_SPACING.entryGapRem,
    ],
    [
      "pdf html line-height uses layout setting",
      pdfHtml.includes(`line-height: ${liveOverride.lineSpacing}`),
    ],
    [
      "pdf html section spacing uses layout setting",
      pdfHtml.includes(`margin-top: ${liveOverride.sectionSpacing}rem`),
    ],
    [
      "pdf html resets paragraph margins",
      stylesheet.includes("p, h1, h2, ul, ol, li, header, section, div") &&
        stylesheet.includes("margin: 0"),
    ],
    [
      "pdf html compact bullet spacing",
      stylesheet.includes("li + li") &&
        stylesheet.includes("calc(") &&
        stylesheet.includes(`padding-left: ${RESUME_PRINT_LAYOUT_SPACING.bulletPaddingLeftRem}rem`),
    ],
    [
      "preview header offset is 1px",
      fontSizes.sectionPx === fontSizes.bodyPx + PREVIEW_HEADER_OFFSET_PX,
    ],
    [
      "docx header is body + 1pt",
      docxSizes.headerPt === docxSizes.bodyPt + 1,
    ],
    [
      "docx header half points +2 above body",
      mapPreviewHeaderPxToDocxHalfPoints(11) === mapPreviewBodyPxToDocxHalfPoints(11) + 2,
    ],
    [
      "sanitize export layout settings",
      sanitizeExportLayoutSettings({
        bodyFontPx: 11,
        marginMm: 12,
        marginTopMm: 9,
        lineSpacing: PREVIEW_LINE_SPACING_DEFAULT,
        sectionSpacing: PREVIEW_SECTION_SPACING_DEFAULT,
      })?.bodyFontPx === 11,
    ],
    [
      "parse stored export layout settings",
      parseStoredExportLayoutSettings(storedSettings)?.sectionSpacing === 0.5,
    ],
    [
      "pdf html uses a4 marker class",
      pdfHtml.includes(RESUME_PDF_HTML_A4_MARKER),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume layout parity checks passed.");
}

main();
