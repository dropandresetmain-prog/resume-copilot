import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveDefaultBaseResumeId,
  writeLastBaseResumeId,
  LAST_BASE_RESUME_STORAGE_KEY,
} from "../../src/lib/generate/base-resume-preference";
import {
  ensureJobDescriptionForGeneration,
  normalizeJobDescriptionInput,
} from "../../src/lib/generate/save-job-for-generation";
import {
  buildCombinedProgressStages,
  generationProgressPercent,
} from "../../src/lib/generate/generation-progress";
import { createJobDescriptionFromInput, findDuplicateJobDescription } from "../../src/lib/jd/persistence";
import type { JobDescriptionInput } from "../../src/types/jd";
import type { ParsedResume } from "../../src/types/resume";

const sampleResumes: ParsedResume[] = [
  {
    id: "resume-old",
    filename: "older.docx",
    uploadedAt: "2025-01-01T00:00:00.000Z",
    workExperiences: [],
    education: [],
    additionalExperience: {
      id: "a1",
      sourceResumeId: "resume-old",
      title: "",
      lines: [],
      rawText: "",
      parseWarnings: [],
    },
    skills: {
      id: "s1",
      sourceResumeId: "resume-old",
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
  {
    id: "resume-new",
    filename: "latest.docx",
    uploadedAt: "2025-06-01T00:00:00.000Z",
    workExperiences: [],
    education: [],
    additionalExperience: {
      id: "a2",
      sourceResumeId: "resume-new",
      title: "",
      lines: [],
      rawText: "",
      parseWarnings: [],
    },
    skills: {
      id: "s2",
      sourceResumeId: "resume-new",
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
];

async function main() {
  const existingJob = createJobDescriptionFromInput({
    rawText: "We need a product manager with strategy skills.",
    companyName: "Acme",
    roleTitle: "Product Manager",
  });

  const duplicateInput: JobDescriptionInput = {
    rawText: "We need a product manager with strategy skills.",
    companyName: "Acme",
    roleTitle: "Product Manager",
  };

  let saveCalls = 0;
  const savedViaGeneration = await ensureJobDescriptionForGeneration(duplicateInput, {
    jobDescriptions: [existingJob],
    saveJob: async (input) => {
      saveCalls += 1;
      return createJobDescriptionFromInput(input);
    },
    editingId: null,
  });

  const newInput: JobDescriptionInput = {
    rawText: "Brand new role description for a data analyst.",
    companyName: "Beta",
    roleTitle: "Data Analyst",
  };

  await ensureJobDescriptionForGeneration(newInput, {
    jobDescriptions: [existingJob],
    saveJob: async (input) => {
      saveCalls += 1;
      return createJobDescriptionFromInput(input);
    },
  });

  const generatePage = readFileSync(
    join(process.cwd(), "src/components/pages/GeneratePageClient.tsx"),
    "utf8",
  );
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const jdPanel = readFileSync(
    join(process.cwd(), "src/components/setup/JDInputPanel.tsx"),
    "utf8",
  );
  const pdfButton = readFileSync(
    join(process.cwd(), "src/components/resume-drafts/DownloadResumePdfButton.tsx"),
    "utf8",
  );
  const ui = readFileSync(join(process.cwd(), "src/components/setup/ui.tsx"), "utf8");

  const prefersDraft = resolveDefaultBaseResumeId(sampleResumes, {
    recentDraftReferenceResumeId: "resume-new",
  });
  const prefersLatestUpload = resolveDefaultBaseResumeId(sampleResumes);

  const checks: [string, boolean][] = [
    ["generation reuses duplicate job without save", savedViaGeneration.id === existingJob.id && saveCalls === 1],
    ["normalize trims job text", normalizeJobDescriptionInput({ rawText: "  hello  " }).rawText === "hello"],
    ["default base resume prefers recent draft reference", prefersDraft === "resume-new"],
    ["default base resume falls back to latest upload", prefersLatestUpload === "resume-new"],
    ["writeLastBaseResumeId is exported", typeof writeLastBaseResumeId === "function"],
    ["last base resume storage key exported", LAST_BASE_RESUME_STORAGE_KEY.includes("lastBaseResumeId")],
    ["generate page hides save button", generatePage.includes("showSaveButton={false}")],
    ["generate page removed coming later", !generatePage.includes("Coming later")],
    ["generate page uses single jd panel", generatePage.includes("generateFlow={{") && !generatePage.includes("ResumeDraftPanel")],
    ["generate cta inside jd panel", jdPanel.includes("GenerateTailoredResumeSection")],
    [
      "generate company role primary fields",
      jdPanel.indexOf('id="jd-company"') < jdPanel.indexOf("jd-raw-text") &&
        jdPanel.indexOf('id="jd-role"') < jdPanel.indexOf("jd-raw-text") &&
        jdPanel.indexOf('id="jd-company"') < jdPanel.indexOf("Advanced options (optional)"),
    ],
    [
      "generate job url in advanced options only",
      jdPanel.includes("Advanced options (optional)") &&
        !jdPanel.includes("Company · Role · URL"),
    ],
    ["primary CTA copy", generateSection.includes("Generate Resume & Cover Letter")],
    [
      "generate centered cta layout",
      generateSection.includes("max-w-md") && generateSection.includes("items-center text-center"),
    ],
    ["auto save helper used", generateSection.includes("ensureJobDescriptionForGeneration")],
    ["reference resume passed to payload", generateSection.includes("referenceResumeId: effectiveBaseResumeId")],
    ["progress panel rendered while generating", generateSection.includes("GenerationProgressPanel")],
    ["duplicate generate guard", generateSection.includes("if (isGenerating)")],
    ["saved jobs visually separated", jdPanel.includes("Secondary workspace") && jdPanel.includes("Saved jobs and legacy management")],
    ["progress stages defined", buildCombinedProgressStages("Researching company website").length >= 7],
    ["progress percent helper", generationProgressPercent(0, 7) < generationProgressPercent(4, 7)],
    ["jd panel supports hide save", jdPanel.includes("showSaveButton")],
    ["records still supports explicit save", jdPanel.includes("Save job")],
    ["disabled download uses default cursor", ui.includes("disabled:cursor-default")],
    ["disabled download blocks pointer events", pdfButton.includes("pointer-events-none")],
    ["duplicate detection still works", Boolean(findDuplicateJobDescription([existingJob], duplicateInput))],
    ["generate flow ensures application record", generateSection.includes("ensureApplicationRecordForJobDescription")],
    ["generate flow links draft to application", generateSection.includes("applicationId: applicationRecord.id")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll generate flow checks passed.");
}

void main();
