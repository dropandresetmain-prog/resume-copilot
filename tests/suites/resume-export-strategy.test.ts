import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDocumentModel } from "../../src/lib/resume-draft/document-model";
import {
  isMobileExportClient,
  MOBILE_EXPORT_OPEN_HINT,
  PRIMARY_FINAL_EXPORT_FORMAT,
  resolveExportDownloadBehavior,
  SECONDARY_EDITABLE_EXPORT_FORMAT,
} from "../../src/lib/resume-draft/export-client";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { renderResumePdfHtml } from "../../src/lib/resume-draft/pdf-html";
import {
  buildResumeLayoutCssFromModel,
  buildResumeLayoutStylesheet,
  RESUME_PRINT_LAYOUT_SPACING,
  RESUME_PDF_HTML_A4_MARKER,
} from "../../src/lib/resume-draft/resume-layout-styles";
import { RESUME_PDF_PREVIEW_TEST_ID, RESUME_PDF_PREVIEW_FRAME_TEST_ID, RESUME_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID } from "../../src/components/resume-drafts/ResumePdfPreview";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sampleJd: StoredJobDescription = {
  id: "jd-strategy-1",
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
        profile: { fullName: "Alex Tan", rawText: "", parseWarnings: [] },
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme",
            descriptor: "",
            location: "SG",
            role: "PM",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "b1",
                parentId: "exp-1",
                keyword: "Strategy",
                description: "Led initiatives",
                rawBulletText: "Strategy: Led initiatives",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "a1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "s1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: [],
          interests: [],
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
  const model = buildResumeDocumentModel({
    draftId: "export-strategy-1",
    draftStatus: "approved",
    content: draft.content,
    layoutSettings: {
      bodyFontPx: 11,
      marginMm: 12,
      marginTopMm: 9,
      lineSpacing: 1.05,
      sectionSpacing: 0.6,
    },
    fullName: "Alex Tan",
    companyName: sampleJd.companyName,
    roleTitle: sampleJd.roleTitle,
  });

  const pdfHtml = renderResumePdfHtml(model);
  const stylesheet = buildResumeLayoutStylesheet(buildResumeLayoutCssFromModel(model));
  const pdfPreviewPath = join(
    process.cwd(),
    "src/components/resume-drafts/ResumePdfPreview.tsx",
  );
  const pdfPreviewSource = existsSync(pdfPreviewPath)
    ? readFileSync(pdfPreviewPath, "utf8")
    : "";

  const checks: [string, boolean][] = [
    [
      "desktop pdf download uses anchor-download behavior",
      resolveExportDownloadBehavior("pdf", { mobile: false }) === "anchor-download",
    ],
    [
      "mobile pdf download uses same-tab navigation",
      resolveExportDownloadBehavior("pdf", { mobile: true }) === "same-tab-navigate",
    ],
    [
      "desktop docx download uses anchor-download behavior",
      resolveExportDownloadBehavior("docx", { mobile: false }) === "anchor-download",
    ],
    [
      "mobile docx download uses same-tab navigation",
      resolveExportDownloadBehavior("docx", { mobile: true }) === "same-tab-navigate",
    ],
    [
      "mobile export hint defined",
      MOBILE_EXPORT_OPEN_HINT.length > 0,
    ],
    [
      "iphone detected as mobile export client",
      isMobileExportClient("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)") === true,
    ],
    [
      "pdf is primary final export format",
      PRIMARY_FINAL_EXPORT_FORMAT === "pdf",
    ],
    [
      "docx is secondary editable export format",
      SECONDARY_EDITABLE_EXPORT_FORMAT === "docx",
    ],
    [
      "pdf preview component uses renderResumePdfHtml",
      pdfPreviewSource.includes("renderResumePdfHtml") &&
        pdfPreviewSource.includes("srcDoc={html}"),
    ],
    [
      "pdf preview uses a4 scale-to-fit frame",
      pdfPreviewSource.includes(RESUME_PDF_PREVIEW_FRAME_TEST_ID) &&
        pdfPreviewSource.includes("ResizeObserver"),
    ],
    [
      "pdf preview test id exported",
      pdfPreviewSource.includes(RESUME_PDF_PREVIEW_TEST_ID),
    ],
    [
      "pdf preview detects and surfaces overflow",
      pdfPreviewSource.includes("measureResumePdfPreviewOverflow") &&
        pdfPreviewSource.includes(RESUME_PDF_PREVIEW_OVERFLOW_BADGE_TEST_ID),
    ],
    [
      "pdf preview copy notes server rendering differences",
      pdfPreviewSource.includes("rendered on the server"),
    ],
    [
      "pdf html includes @page a4",
      pdfHtml.includes("@page") && pdfHtml.includes("size: A4"),
    ],
    [
      "pdf html uses layout line-height setting",
      pdfHtml.includes("line-height: 1.05"),
    ],
    [
      "pdf html uses layout section spacing setting",
      pdfHtml.includes("margin-top: 0.6rem"),
    ],
    [
      "pdf html resets default margins",
      stylesheet.includes("p, h1, h2, ul, ol, li, header, section, div") &&
        stylesheet.includes("margin: 0"),
    ],
    [
      "pdf html uses print spacing constants",
      stylesheet.includes(`gap: ${RESUME_PRINT_LAYOUT_SPACING.entryGapRem}rem`),
    ],
    [
      "pdf html uses a4 page marker",
      pdfHtml.includes(RESUME_PDF_HTML_A4_MARKER),
    ],
    [
      "export client delivers via blob fetch and anchor download",
      readFileSync(join(process.cwd(), "src/lib/resume-draft/export-client.ts"), "utf8").includes(
        "fetchExportBlob",
      ),
    ],
    [
      "docx is not primary final format",
      SECONDARY_EDITABLE_EXPORT_FORMAT === "docx" &&
        PRIMARY_FINAL_EXPORT_FORMAT === "pdf",
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll export strategy checks passed.");
}

main();
