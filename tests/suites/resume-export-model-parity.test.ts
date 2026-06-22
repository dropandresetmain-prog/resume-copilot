import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import {
  buildExportResumeDocumentModel,
  resolveExportTypographyFromReference,
} from "../../src/lib/resume-draft/build-export-document-model";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { buildReferenceResumeFormatProfile } from "../../src/lib/resume-draft/reference-format";
import { DEFAULT_RESUME_FONT_FAMILY } from "../../src/lib/resume-draft/preview-settings";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sampleJd: StoredJobDescription = {
  id: "jd-parity-model-1",
  rawText: "Product Manager role.",
  companyName: "Pave Bank",
  roleTitle: "Product Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const liveLayoutSettings = {
  bodyFontPx: 10,
  marginMm: 10,
  marginTopMm: 8,
  lineSpacing: 0.95,
  sectionSpacing: 0.45,
};

function buildInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-parity-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        profile: { fullName: "Hset Min Htet", rawText: "", parseWarnings: [] },
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-parity-1",
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
          sourceResumeId: "resume-parity-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "s1",
          sourceResumeId: "resume-parity-1",
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
  const referenceResume = inventory.resumes[0];
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume,
  });
  const draft = generateMockResumeDraft(generationInput);

  const previewModel = buildExportResumeDocumentModel({
    draft: {
      id: "draft-parity-model-1",
      status: "approved",
      content: draft.content,
      referenceResumeId: referenceResume.id,
    },
    jobDescription: sampleJd,
    referenceResume,
    layoutSettings: liveLayoutSettings,
  });

  const exportModel = buildExportResumeDocumentModel({
    draft: {
      id: "draft-parity-model-1",
      status: "approved",
      content: draft.content,
      referenceResumeId: referenceResume.id,
    },
    jobDescription: sampleJd,
    referenceResume,
    layoutSettings: liveLayoutSettings,
  });

  const typography = resolveExportTypographyFromReference(referenceResume);
  const referenceProfile = buildReferenceResumeFormatProfile(referenceResume);

  const pdfRoutePath = join(process.cwd(), "src/app/api/export/resume-pdf/route.ts");
  const approveRoutePath = join(process.cwd(), "src/app/api/approve/resume-draft/route.ts");
  const pdfRouteSource = existsSync(pdfRoutePath) ? readFileSync(pdfRoutePath, "utf8") : "";
  const approveRouteSource = existsSync(approveRoutePath)
    ? readFileSync(approveRoutePath, "utf8")
    : "";

  const checks: [string, boolean][] = [
    [
      "preview and export models share fontFamily",
      previewModel.fontFamily === exportModel.fontFamily,
    ],
    [
      "preview and export models share headerAlignment",
      previewModel.headerAlignment === exportModel.headerAlignment,
    ],
    [
      "preview and export models share layoutSettings",
      JSON.stringify(previewModel.layoutSettings) === JSON.stringify(exportModel.layoutSettings),
    ],
    [
      "reference typography uses profile fontFamily",
      typography.fontFamily === referenceProfile.fontFamily,
    ],
    [
      "reference typography uses profile headerAlignment",
      typography.headerAlignment === referenceProfile.headerAlignment,
    ],
    [
      "missing reference falls back to default font stack",
      resolveExportTypographyFromReference(null).fontFamily === DEFAULT_RESUME_FONT_FAMILY,
    ],
    [
      "pdf export route uses shared resolve export helper",
      pdfRouteSource.includes("resolveExportDocumentModelForDraft"),
    ],
    [
      "approve route uses shared validate export helper",
      approveRouteSource.includes("validateResumePdfExport"),
    ],
    [
      "layout settings include optimizer line-spacing floor",
      previewModel.layoutSettings.lineSpacing === 0.95,
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll export model parity checks passed.");
}

main();
