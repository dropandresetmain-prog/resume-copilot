import { existsSync } from "node:fs";
import { join } from "node:path";

import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import { buildResumeDocumentModel } from "../src/lib/resume-draft/document-model";
import { generateResumeDocxBuffer } from "../src/lib/resume-draft/docx-export";
import {
  buildResumeDocxFileName,
  buildResumeDocxStoragePath,
  sanitizeFileNamePart,
} from "../src/lib/resume-draft/export-filename";
import {
  isApprovedDraftStatus,
  parseResumeDocxExportRequestBody,
} from "../src/lib/resume-draft/export-request";
import { layoutIncludesProfessionalSummary } from "../src/lib/resume-draft/layout";
import type { ResumeDraftEducationItem } from "../src/types/resume-draft";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

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
          languages: ["Japanese"],
          technicalSkills: ["Python"],
          interests: ["Travel"],
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

const ntuEducation: ResumeDraftEducationItem = {
  institution: "Nanyang Technological University",
  location: "Singapore",
  programmes: [
    "Renaissance Engineering Programme",
    "Master of Science in Technology Management",
    "Bachelor of Engineering Science (Mechanical Engineering)",
  ],
  dateRange: "Aug 2014 – Dec 2018",
  bullets: [],
  riskFlags: [],
};

async function main() {
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const mockDraft = generateMockResumeDraft(generationInput);
  const contentWithEducation = {
    ...mockDraft.content,
    education: [ntuEducation],
  };

  const documentModel = buildResumeDocumentModel({
    draftId: "draft-export-1",
    draftStatus: "approved",
    content: contentWithEducation,
    fullName: "Hset Min Htet",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const docxBuffer = await generateResumeDocxBuffer(documentModel);
  const exportRoutePath = join(process.cwd(), "src/app/api/export/resume-docx/route.ts");

  let requestValidationThrows = false;
  try {
    parseResumeDocxExportRequestBody({});
  } catch {
    requestValidationThrows = true;
  }

  const parsedRequest = parseResumeDocxExportRequestBody({
    draftId: "draft-1",
    layoutSettings: { bodyFontPx: 11, marginMm: 12 },
  });

  const checks: [string, boolean][] = [
    [
      "filename convention with company and role",
      buildResumeDocxFileName({
        fullName: "Hset Min Htet",
        companyName: "Pave Bank",
        roleTitle: "Product Manager",
      }) === "Hset Min Htet - Resume _Pave Bank _Product Manager.docx",
    ],
    [
      "filename fallback without company role",
      buildResumeDocxFileName({ fullName: "Hset Min Htet" }) === "Hset Min Htet - Resume.docx",
    ],
    [
      "sanitize unsafe filename chars",
      sanitizeFileNamePart("Pave/Bank: PM?") === "PaveBank PM",
    ],
    [
      "storage path convention",
      buildResumeDocxStoragePath("user-1", "draft-1", "Hset Min Htet - Resume.docx") ===
        "user-1/resumes/draft-1/Hset Min Htet - Resume.docx",
    ],
    ["document model has work experience", documentModel.layout.workExperience.length > 0],
    ["document model has education", documentModel.layout.education.length === 1],
    [
      "education double degree in model",
      (documentModel.layout.education[0]?.degreeLines.length ?? 0) === 2,
    ],
    [
      "education date shown once",
      Boolean(documentModel.layout.education[0]?.degreeLines[0]?.dateRange) &&
        !documentModel.layout.education[0]?.degreeLines[1]?.dateRange,
    ],
    [
      "skills tech line present",
      documentModel.layout.techLine.length > 0 || documentModel.layout.skillsLine.length > 0,
    ],
    [
      "languages and interests lines",
      documentModel.layout.languagesLine.includes("Japanese") &&
        documentModel.layout.interestsLine.length > 0,
    ],
    ["no professional summary in model", !layoutIncludesProfessionalSummary(contentWithEducation)],
    ["approved status helper", isApprovedDraftStatus("approved")],
    ["export request requires draftId", requestValidationThrows],
    ["export request parses layout settings", parsedRequest.draftId === "draft-1"],
    ["docx buffer generated", docxBuffer.byteLength > 500],
    ["export route file exists", existsSync(exportRoutePath)],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume DOCX export checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
