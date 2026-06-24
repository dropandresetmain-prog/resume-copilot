import { readFileSync } from "node:fs";
import { join } from "node:path";

import { estimateGenerateAiSteps } from "../../src/lib/generate/ai-call-budget";
import {
  canGenerateWithDiscoveryPolicy,
  resolveGenerateContextPolicy,
} from "../../src/lib/generate/context-policy";
import {
  discoverCompanyWebsite,
  MAX_DISCOVERY_VERIFICATION_SCRAPES,
  selectUrlsForHomepageVerification,
  shouldOfferWebsiteDiscovery,
} from "../../src/lib/company-context/discover-company-website";
import {
  verifyWebsiteCandidate,
  type WebsiteVerificationResult,
} from "../../src/lib/company-context/verify-website-candidate";
import { savedWebsiteContextMatchesTarget } from "../../src/lib/company-context/normalize";
import { planCompanyResearchForGeneration } from "../../src/lib/company-context/research-plan";
import { ensureCompanyContextForGeneration } from "../../src/lib/company-context/ensure-for-generation";
import type { CompanyContext } from "../../src/types/company-context";
import { isRejectedDiscoveryUrl } from "../../src/lib/firecrawl/url";
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
import { extractCompanyWebsiteFromText } from "../../src/lib/jd/extract-website";
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

  const defaultPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: "Role at Acme.",
  });
  const confidentialPolicy = resolveGenerateContextPolicy({
    confidentialPosting: true,
    companyWebsiteInput: "https://acme.com",
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: "Role at Acme.",
  });
  const websitePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    companyWebsiteInput: "https://acme.com",
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: "Role at Acme.",
  });
  const highDiscoveredPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
    discoveredWebsite: {
      url: "https://acme.com",
      confidence: "high",
      userConfirmed: true,
      userDeclined: false,
    },
  });
  const mediumPendingPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
    discoveredWebsite: {
      url: "https://example-consulting.io",
      confidence: "medium",
      userConfirmed: false,
      userDeclined: false,
    },
  });
  const mediumConfirmedPolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
    discoveredWebsite: {
      url: "https://example-consulting.io",
      confidence: "medium",
      userConfirmed: true,
      userDeclined: false,
    },
  });

  const prevProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "mock";
  const mockDiscovery = await discoverCompanyWebsite({
    companyName: "Acme Corp",
    outputMode: "resume_and_cover_letter",
    jobDescriptionText: "Product manager role.",
  });
  process.env.AI_PROVIDER = prevProvider;

  const linkedInRejected = verifyWebsiteCandidate({
    companyName: "Acme Corp",
    url: "https://www.linkedin.com/company/acme",
    title: "Acme Corp | LinkedIn",
  });
  const highVerified = verifyWebsiteCandidate({
    companyName: "Acme Corp",
    url: "https://acme.com",
    title: "Acme Corp — Home",
    homepageText: "Acme Corp builds operational software for enterprises.",
    jobDescriptionText: "Product manager with operational software experience.",
  });
  const serpOnlyHighScore = verifyWebsiteCandidate({
    companyName: "Acme Corp",
    url: "https://acme.com",
    title: "Acme Corp — Home",
    description: "Acme Corp builds operational software for enterprises.",
    jobDescriptionText: "Product manager with operational software experience.",
  });

  const savedPaveBank: CompanyContext = {
    companyName: "Pave Bank",
    displayName: "Pave Bank",
    website: "https://pavebank.com",
    sourceType: "website_research",
    sources: [{ type: "firecrawl", url: "https://pavebank.com", success: true }],
    companySummary: "Digital bank.",
    productsAndServices: [],
    likelyHiringPriorities: [],
    suggestedNarrativeAngles: [],
    confidence: "medium",
    limitations: [],
    generatedAt: "2025-01-01T00:00:00.000Z",
  };
  const jdOnlySaved: CompanyContext = {
    companyName: "Pave Bank",
    displayName: "Pave Bank",
    sourceType: "jd_based_context",
    sources: [],
    companySummary: "JD-only summary.",
    productsAndServices: [],
    likelyHiringPriorities: [],
    suggestedNarrativeAngles: [],
    confidence: "low",
    limitations: [],
    generatedAt: "2025-01-01T00:00:00.000Z",
  };

  const discoveredWebsitePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
    discoveredWebsite: {
      url: "https://newcorp.com",
      confidence: "high",
      userConfirmed: true,
      userDeclined: false,
    },
  });
  const providedWebsitePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    companyWebsiteInput: "https://newcorp.com",
    outputMode: "resume_and_cover_letter",
  });
  const jdOnlyReusePolicy = resolveGenerateContextPolicy({
    confidentialPosting: false,
    outputMode: "resume_and_cover_letter",
  });

  const mismatchedSavedPlan = planCompanyResearchForGeneration({
    savedContext: savedPaveBank,
    policy: discoveredWebsitePolicy,
  });
  const mismatchedProvidedPlan = planCompanyResearchForGeneration({
    savedContext: savedPaveBank,
    policy: providedWebsitePolicy,
  });
  const jdOnlySavedPlan = planCompanyResearchForGeneration({
    savedContext: jdOnlySaved,
    policy: jdOnlyReusePolicy,
  });

  const mismatchedEnsure = await ensureCompanyContextForGeneration({
    applicationId: "app-mismatch",
    savedContext: savedPaveBank,
    job: existingJob,
    companyWebsite: "https://newcorp.com",
    autoGenerate: false,
    allowSavedWebsiteContext: true,
    runWebsiteResearch: false,
  });

  const scrapeCapCandidates: WebsiteVerificationResult[] = [
    { url: "https://a.com", domain: "a.com", score: 80, confidence: "high", reason: "a", rejected: false },
    { url: "https://b.com", domain: "b.com", score: 70, confidence: "high", reason: "b", rejected: false },
    { url: "https://c.com", domain: "c.com", score: 60, confidence: "medium", reason: "c", rejected: false },
    { url: "https://d.com", domain: "d.com", score: 50, confidence: "medium", reason: "d", rejected: false },
    { url: "https://e.com", domain: "e.com", score: 40, confidence: "low", reason: "e", rejected: false },
  ];
  const scrapeCapSelection = selectUrlsForHomepageVerification(scrapeCapCandidates);

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
        jdPanel.indexOf('id="jd-role"') < jdPanel.indexOf("jd-raw-text"),
    ],
    [
      "job url in more options not separate job details",
      !jdPanel.includes("More job details (optional)") &&
        generateSection.includes('id="jd-url"') &&
        generateSection.includes("More options (optional)") &&
        generateSection.indexOf("More options (optional)") < generateSection.indexOf('id="jd-url"'),
    ],
    [
      "clear form in more options",
      generateSection.includes('data-testid="generate-clear-form"') &&
        jdPanel.includes("onClearForm={clearForm}"),
    ],
    [
      "website discovery appears before base resume",
      generateSection.indexOf('data-testid="generate-company-context"') <
        generateSection.indexOf('id="base-resume-select"'),
    ],
    [
      "discovery intake requires company and jd only",
      generateSection.includes("jobForm.companyName?.trim() && jobForm.rawText.trim()") &&
        !generateSection.includes("jobForm.roleTitle?.trim() &&"),
    ],
    [
      "discovery hint mentions optional role",
      readFileSync(
        join(process.cwd(), "src/components/setup/CompanyWebsiteDiscoveryPanel.tsx"),
        "utf8",
      ).includes("Role is optional but"),
    ],
    [
      "find company website visible in discovery section",
      generateSection.includes("CompanyWebsiteDiscoveryPanel") &&
        generateSection.includes("hasIntakeComplete={hasIntakeComplete}") &&
        readFileSync(
          join(process.cwd(), "src/components/setup/CompanyWebsiteDiscoveryPanel.tsx"),
          "utf8",
        ).includes('data-testid="find-company-website"'),
    ],
    [
      "confidential discovery explanation",
      readFileSync(
        join(process.cwd(), "src/components/setup/CompanyWebsiteDiscoveryPanel.tsx"),
        "utf8",
      ).includes('data-testid="generate-website-discovery-confidential"') &&
        readFileSync(
          join(process.cwd(), "src/components/setup/CompanyWebsiteDiscoveryPanel.tsx"),
          "utf8",
        ).includes("Website discovery disabled"),
    ],
    ["primary CTA copy", generateSection.includes("Generate Resume & Cover Letter")],
    [
      "generate centered cta layout",
      generateSection.includes("max-w-md") && generateSection.includes("items-center text-center"),
    ],
    ["auto save helper used", generateSection.includes("ensureJobDescriptionForGeneration")],
    ["reference resume passed to payload", generateSection.includes("referenceResumeId: effectiveBaseResumeId")],
    ["progress panel rendered while generating", generateSection.includes("GenerationProgressPanel")],
    ["duplicate generate guard", generateSection.includes("isGenerating || isDiscoveringWebsite")],
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
    [
      "generate shows ai step estimate",
      generateSection.includes('data-testid="generate-ai-step-estimate"') &&
        generateSection.includes("estimateGenerateAiSteps"),
    ],
    [
      "output mode visible near cta",
      generateSection.includes('data-testid="generate-output-mode"') &&
        generateSection.indexOf('data-testid="generate-output-mode"') <
          generateSection.indexOf('data-testid="generate-ai-step-estimate"') &&
        generateSection.indexOf('data-testid="generate-company-context"') <
          generateSection.indexOf('data-testid="generate-output-mode"'),
    ],
    [
      "output mode defaults resume and cover letter",
      generateSection.includes('value="resume_and_cover_letter"') &&
        generateSection.includes("Resume + Cover Letter"),
    ],
    [
      "cover letter only option parked disabled",
      generateSection.includes('value="cover_letter_only" disabled') &&
        generateSection.includes("requires existing tailored resume"),
    ],
    [
      "context policy summary visible",
      generateSection.includes('data-testid="generate-context-policy-summary"') &&
        generateSection.includes("resolveGenerateContextPolicy"),
    ],
    [
      "no company name override field",
      !generateSection.includes("companyNameOverride") &&
        !generateSection.includes("company-name-override"),
    ],
    [
      "confidential mode wired",
      jdPanel.includes("confidentialPosting") &&
        jdPanel.includes("Use JD-only context. No website research or saved website context."),
    ],
    [
      "ensure receives context policy flags",
      generateSection.includes("allowSavedWebsiteContext: policy.allowSavedWebsiteContext") &&
        generateSection.includes("runWebsiteResearch: policy.runWebsiteResearch"),
    ],
    [
      "default policy is jd only without website",
      defaultPolicy.kind === "jd_only" && !defaultPolicy.allowSavedWebsiteContext,
    ],
    [
      "confidential policy forces jd only",
      confidentialPolicy.kind === "jd_only" &&
        !confidentialPolicy.runWebsiteResearch &&
        !confidentialPolicy.allowSavedWebsiteContext,
    ],
    [
      "provided website uses website and jd",
      websitePolicy.kind === "website_and_jd" && websitePolicy.runWebsiteResearch,
    ],
    [
      "jd url extraction skips job boards",
      extractCompanyWebsiteFromText(
        "Apply at https://boards.greenhouse.io/acme/jobs/123 or visit https://acme.com",
      ) === "https://acme.com",
    ],
    [
      "resume only estimate",
      estimateGenerateAiSteps({
        mode: "resume_only",
        policy: defaultPolicy,
      }).headline.includes("1 AI step"),
    ],
    [
      "combined jd only estimate",
      estimateGenerateAiSteps({
        mode: "resume_and_cover_letter",
        policy: defaultPolicy,
      }).headline.includes("2 AI steps"),
    ],
    [
      "combined with website research estimate",
      estimateGenerateAiSteps({
        mode: "resume_and_cover_letter",
        policy: websitePolicy,
      }).headline.includes("3 AI steps") &&
        estimateGenerateAiSteps({
          mode: "resume_and_cover_letter",
          policy: websitePolicy,
        }).includesWebsiteFetch,
    ],
    [
      "no discovery in confidential mode",
      !shouldOfferWebsiteDiscovery({
        companyName: "Acme",
        confidentialPosting: true,
        outputMode: "resume_and_cover_letter",
      }),
    ],
    [
      "no discovery when website provided",
      !shouldOfferWebsiteDiscovery({
        companyName: "Acme",
        companyWebsiteInput: "https://acme.com",
        outputMode: "resume_and_cover_letter",
      }),
    ],
    [
      "high confidence discovered uses website and jd",
      highDiscoveredPolicy.kind === "website_and_jd" &&
        highDiscoveredPolicy.websiteSource === "search_discovered",
    ],
    [
      "medium discovered requires confirmation",
      mediumPendingPolicy.discoveryState === "pending_confirmation" &&
        !canGenerateWithDiscoveryPolicy(mediumPendingPolicy),
    ],
    [
      "medium discovered confirmed allows generate",
      mediumConfirmedPolicy.kind === "website_and_jd" &&
        canGenerateWithDiscoveryPolicy(mediumConfirmedPolicy),
    ],
    [
      "low confidence falls back jd only",
      resolveGenerateContextPolicy({
        confidentialPosting: false,
        outputMode: "resume_and_cover_letter",
        discoveredWebsite: {
          url: "https://unknown.io",
          confidence: "low",
          userConfirmed: false,
          userDeclined: false,
        },
      }).kind === "jd_only",
    ],
    ["linkedin discovery candidate rejected", linkedInRejected.rejected],
    ["job board host rejected", isRejectedDiscoveryUrl("https://boards.greenhouse.io/acme/jobs/1")],
    ["high verification score", highVerified.confidence === "high"],
    [
      "serp only cannot auto confirm high",
      serpOnlyHighScore.confidence === "medium",
    ],
    [
      "saved context domain match helper",
      savedWebsiteContextMatchesTarget(savedPaveBank, "https://www.pavebank.com") &&
        !savedWebsiteContextMatchesTarget(savedPaveBank, "https://newcorp.com"),
    ],
    [
      "discovered website different from saved plans fresh research",
      mismatchedSavedPlan === "run_firecrawl",
    ],
    [
      "provided website different from saved plans fresh research",
      mismatchedProvidedPlan === "run_firecrawl",
    ],
    [
      "jd only still reuses saved jd context",
      jdOnlySavedPlan === "use_saved_jd",
    ],
    [
      "ensure skips stale saved website when domains differ",
      mismatchedEnsure.status !== "saved" || mismatchedEnsure.companyContext !== savedPaveBank,
    ],
    [
      "discovery scrape cap constant",
      MAX_DISCOVERY_VERIFICATION_SCRAPES === 2,
    ],
    [
      "discovery scrape cap selection",
      scrapeCapSelection.length === 2 &&
        scrapeCapSelection[0] === "https://a.com" &&
        scrapeCapSelection[1] === "https://b.com",
    ],
    [
      "mock discovery high confidence",
      mockDiscovery.status === "found" && mockDiscovery.candidate?.confidence === "high",
    ],
    [
      "website discovery panel wired",
      generateSection.includes("CompanyWebsiteDiscoveryPanel") &&
        generateSection.includes("handleFindCompanyWebsite"),
    ],
    [
      "discover website api route requires auth",
      readFileSync(
        join(process.cwd(), "src/app/api/company/discover-website/route.ts"),
        "utf8",
      ).includes("getAccessTokenFromRequest"),
    ],
    [
      "generate does not auto run discovery on click",
      !generateSection.includes("discoveryForRun = await handleFindCompanyWebsite"),
    ],
    [
      "generate disabled while discovering",
      generateSection.includes("!isDiscoveringWebsite") &&
        generateSection.includes("isGenerating || isDiscoveringWebsite"),
    ],
    ["generate buttons use aria-busy", generateSection.includes("aria-busy={isGenerating}")],
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
