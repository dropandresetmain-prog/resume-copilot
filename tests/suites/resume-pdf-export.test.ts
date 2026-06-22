import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { buildResumeDocumentModel } from "../../src/lib/resume-draft/document-model";
import {
  buildCompanyLineSegments,
} from "../../src/lib/resume-draft/docx-layout-helpers";
import {
  mapPreviewBodyPxToDocxHalfPoints,
  mapPreviewHeaderPxToDocxHalfPoints,
  resolveDocxFontSizes,
} from "../../src/lib/resume-draft/docx-font";
import {
  buildResumeDocxFileName,
  buildResumeExportFileStem,
  buildResumePdfFileName,
  buildResumePdfStoragePath,
} from "../../src/lib/resume-draft/export-filename";
import {
  isApprovedDraftStatus,
  parseResumePdfExportRequestBody,
} from "../../src/lib/resume-draft/export-request";
import { layoutIncludesProfessionalSummary } from "../../src/lib/resume-draft/layout";
import {
  renderResumePdfHtml,
  resumePdfHeaderOffsetPx,
} from "../../src/lib/resume-draft/pdf-html";
import {
  formatCandidateDisplayName,
  RESUME_PDF_HTML_A4_MARKER,
} from "../../src/lib/resume-draft/resume-layout-styles";
import {
  PREVIEW_BODY_FONT_DEFAULT_PX,
  PREVIEW_HEADER_OFFSET_PX,
  resolvePreviewFontSizes,
} from "../../src/lib/resume-draft/preview-settings";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-export-1",
  rawText: "Product Manager role at Pave Bank.",
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
          rawText: "Hset Min Htet\nname@example.com",
          parseWarnings: [],
        },
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Drop & Reset",
            descriptor: "pickleball social club; 2500+ total following",
            location: "Singapore",
            role: "Founder",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "bullet-1",
                parentId: "exp-1",
                keyword: "Community",
                description: "Built a local sports community",
                rawBulletText: "Community: Built a local sports community",
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

async function main() {
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const draft = generateMockResumeDraft(generationInput);
  draft.content.experience[0] = {
    ...draft.content.experience[0],
    company: "Drop & Reset",
    companyDescriptor: "pickleball social club; 2500+ total following",
  };
  draft.content.professionalSummary = { text: "", jdAlignment: [], riskFlags: [] };

  const documentModel = buildResumeDocumentModel({
    draftId: "draft-pdf-1",
    draftStatus: "approved",
    content: draft.content,
    fullName: "Hset Min Htet",
    companyName: sampleJd.companyName,
    roleTitle: sampleJd.roleTitle,
  });

  const pdfHtml = renderResumePdfHtml(documentModel);
  const companySegments = buildCompanyLineSegments(
    "Drop & Reset",
    "pickleball social club; 2500+ total following",
  );
  const fontSizes = resolvePreviewFontSizes(PREVIEW_BODY_FONT_DEFAULT_PX);
  const docxSizes = resolveDocxFontSizes(PREVIEW_BODY_FONT_DEFAULT_PX);
  const exportRoutePath = join(process.cwd(), "src/app/api/export/resume-pdf/route.ts");
  const pdfExportPath = join(process.cwd(), "src/lib/resume-draft/pdf-export.ts");
  const pdfExportSource = readFileSync(pdfExportPath, "utf8");
  const exportRouteSource = readFileSync(exportRoutePath, "utf8");

  let requestValidationThrows = false;
  try {
    parseResumePdfExportRequestBody({});
  } catch {
    requestValidationThrows = true;
  }

  const parsedRequest = parseResumePdfExportRequestBody({
    draftId: "draft-1",
    layoutSettings: { bodyFontPx: 11 },
  });

  const docxStem = buildResumeExportFileStem({
    fullName: "Hset Min Htet",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });
  const pdfStem = buildResumeExportFileStem({
    fullName: "Hset Min Htet",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const checks: [string, boolean][] = [
    [
      "pdf filename convention with company and role",
      buildResumePdfFileName({
        fullName: "Hset Min Htet",
        companyName: "Pave Bank",
        roleTitle: "Product Manager",
      }) === "Hset Min Htet - Resume_Pave Bank_Product Manager.pdf",
    ],
    [
      "pdf filename fallback without company role",
      buildResumePdfFileName({ fullName: "Hset Min Htet" }) === "Hset Min Htet - Resume.pdf",
    ],
    [
      "docx and pdf share filename stem",
      docxStem === pdfStem &&
        buildResumeDocxFileName({
          fullName: "Hset Min Htet",
          companyName: "Pave Bank",
          roleTitle: "Product Manager",
        }).replace(/\.docx$/, "") ===
          buildResumePdfFileName({
            fullName: "Hset Min Htet",
            companyName: "Pave Bank",
            roleTitle: "Product Manager",
          }).replace(/\.pdf$/, ""),
    ],
    [
      "pdf storage path convention",
      buildResumePdfStoragePath("user-1", "draft-1", "Hset Min Htet - Resume.pdf") ===
        "user-1/resumes/draft-1/Hset Min Htet - Resume.pdf",
    ],
    ["pdf export request requires draftId", requestValidationThrows],
    ["pdf export request parses layout settings", parsedRequest.draftId === "draft-1"],
    ["approved status helper", isApprovedDraftStatus("approved")],
    ["pdf export route file exists", existsSync(exportRoutePath)],
    ["pdf html includes a4 css", pdfHtml.includes("@page") && pdfHtml.includes("size: A4")],
    ["pdf html uses a4 page marker", pdfHtml.includes(RESUME_PDF_HTML_A4_MARKER)],
    ["pdf html uses gill sans mt stack", pdfHtml.includes("Gill Sans MT")],
    [
      "pdf html company descriptor not bold",
      pdfHtml.includes('class="company-descriptor"') &&
        pdfHtml.includes("pickleball social club") &&
        !pdfHtml.includes('class="company-descriptor"><strong'),
    ],
    [
      "pdf html renders uppercase name",
      pdfHtml.includes(formatCandidateDisplayName("Hset Min Htet")),
    ],
    [
      "preview header is body + 1px",
      fontSizes.sectionPx === fontSizes.bodyPx + PREVIEW_HEADER_OFFSET_PX,
    ],
    [
      "pdf header offset constant is 1px",
      resumePdfHeaderOffsetPx() === 1,
    ],
    [
      "docx header is body + 1pt",
      docxSizes.headerPt === docxSizes.bodyPt + 1,
    ],
    [
      "docx header half points +2 above body",
      mapPreviewHeaderPxToDocxHalfPoints(11) === mapPreviewBodyPxToDocxHalfPoints(11) + 2,
    ],
    ["pdf html excludes professional summary", !pdfHtml.toLowerCase().includes("professional summary")],
    [
      "canonical model excludes professional summary",
      !layoutIncludesProfessionalSummary(draft.content),
    ],
    [
      "pdf html uses document model work experience",
      pdfHtml.includes("Drop &amp; Reset") && pdfHtml.includes("Founder"),
    ],
    [
      "company descriptor segments not all bold",
      companySegments.length === 2 &&
        companySegments[0]?.bold === true &&
        companySegments[1]?.bold === false,
    ],
    ["document model has pdf filename", documentModel.pdfFileName.endsWith(".pdf")],
    [
      "pdf export exposes generateResumePdfResult with pageCount",
      pdfExportSource.includes("export async function generateResumePdfResult") &&
        pdfExportSource.includes("countPdfPages"),
    ],
    [
      "pdf export route blocks multi-page pdf",
      exportRouteSource.includes("pageCount > 1") && exportRouteSource.includes("422"),
    ],
    [
      "pdf export awaits fonts ready before page.pdf",
      pdfExportSource.includes("waitForPdfDocumentFonts") &&
        pdfExportSource.includes("document.fonts?.ready"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume PDF export checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
