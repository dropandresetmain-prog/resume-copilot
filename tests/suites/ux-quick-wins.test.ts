import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const nav = readFileSync(join(process.cwd(), "src/components/app/nav.ts"), "utf8");
  const appNav = readFileSync(join(process.cwd(), "src/components/app/AppNav.tsx"), "utf8");
  const appVersion = readFileSync(join(process.cwd(), "src/lib/app-version.ts"), "utf8");
  const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const generate = readFileSync(
    join(process.cwd(), "src/components/pages/GeneratePageClient.tsx"),
    "utf8",
  );
  const records = readFileSync(
    join(process.cwd(), "src/components/pages/RecordsPageClient.tsx"),
    "utf8",
  );
  const uploads = readFileSync(
    join(process.cwd(), "src/components/pages/ManageUploadsPageClient.tsx"),
    "utf8",
  );
  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const cloudFileStoragePanel = readFileSync(
    join(process.cwd(), "src/components/setup/CloudFileStoragePanel.tsx"),
    "utf8",
  );
  const uploadCard = readFileSync(
    join(process.cwd(), "src/components/setup/UploadCard.tsx"),
    "utf8",
  );
  const summaryCards = readFileSync(
    join(process.cwd(), "src/components/setup/SummaryCards.tsx"),
    "utf8",
  );
  const ui = readFileSync(join(process.cwd(), "src/components/setup/ui.tsx"), "utf8");
  const handoff = readFileSync(join(process.cwd(), "docs/HANDOFF.md"), "utf8");
  const roadmap = readFileSync(join(process.cwd(), "docs/ROADMAP.md"), "utf8");
  const resumePreview = readFileSync(
    join(process.cwd(), "src/components/pages/ResumePreviewPageClient.tsx"),
    "utf8",
  );
  const coverLetterPreview = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
    "utf8",
  );
  const draftHistory = readFileSync(
    join(process.cwd(), "src/components/setup/DraftHistoryPanel.tsx"),
    "utf8",
  );
  const landingHero = readFileSync(
    join(process.cwd(), "src/components/landing/LandingHero.tsx"),
    "utf8",
  );
  const jdPanel = readFileSync(
    join(process.cwd(), "src/components/setup/JDInputPanel.tsx"),
    "utf8",
  );
  const generationProgress = readFileSync(
    join(process.cwd(), "src/components/setup/GenerationProgressPanel.tsx"),
    "utf8",
  );
  const recordsPanel = readFileSync(
    join(process.cwd(), "src/components/setup/ApplicationRecordsPanel.tsx"),
    "utf8",
  );
  const profile = readFileSync(
    join(process.cwd(), "src/components/pages/ProfilePageClient.tsx"),
    "utf8",
  );
  const setupAlerts = readFileSync(
    join(process.cwd(), "src/components/setup/SetupAlerts.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["app version constant", appVersion.includes('APP_VERSION = "0.9.12D"')],
    ["package json version", packageJson.includes('"version": "0.9.12D"')],
    ["nav version uses shared constant", appNav.includes("APP_VERSION")],
    ["dev tools removed from main nav", !nav.includes('label: "Dev Tools"')],
    [
      "nav labels ordered for IA cleanup",
      nav.indexOf('label: "Uploads"') < nav.indexOf('label: "Generate"') &&
        nav.indexOf('label: "Generate"') < nav.indexOf('label: "Inventory"') &&
        nav.indexOf('label: "Inventory"') < nav.indexOf('label: "Applications"') &&
        nav.indexOf('label: "Applications"') < nav.indexOf('label: "Profile"'),
    ],
    ["generate nav is primary action", nav.includes('primary: true') && nav.includes('label: "Generate"')],
    ["nav route hrefs unchanged", nav.includes('href: "/setup"') && nav.includes('href: "/records"')],
    ["records renamed applications", records.includes('title="Applications"') && records.includes('pageMilestone("Applications")')],
    ["uploads page renamed", uploads.includes('title="Uploads"') && uploads.includes('pageMilestone("Uploads")')],
    ["generate shows setup alerts", generate.includes("SetupAlerts") && generate.includes("persistenceWarning")],
    ["generate removes everything in one card banner", !generate.includes("Everything you need is in one card below")],
    [
      "generate advanced controls hidden under disclosure",
      generateSection.indexOf("Base resume (formatting template)") <
        generateSection.indexOf("Show advanced options") &&
        generateSection.indexOf("Show advanced options") <
          generateSection.indexOf("Generation mode") &&
        generateSection.indexOf("Show advanced options") <
          generateSection.indexOf("Resume model") &&
        generateSection.indexOf("Show advanced options") <
          generateSection.indexOf("Company website"),
    ],
    [
      "uploads merged parsed and cloud list",
      uploads.includes("CloudFileStoragePanel") &&
        uploads.includes("resumes={inventory.resumes}") &&
        !uploads.includes("<ResumeList") &&
        cloudFileStoragePanel.includes("countResume") &&
        cloudFileStoragePanel.includes("Original resume files") &&
        cloudFileStoragePanel.includes("onDeleteResume(resume.id)"),
    ],
    [
      "setup card variants",
      ui.includes('variant?: "primary" | "secondary" | "muted"') &&
        ui.includes("variantClassName") &&
        ui.includes("actionBarClassName") &&
        uploadCard.includes('variant="primary"') &&
        summaryCards.includes('variant="muted"'),
    ],
    ["records shows setup alerts", records.includes("SetupAlerts") && records.includes("persistenceWarning")],
    ["single resume approve button", !resumePreview.includes("onClick={handleApproveForExport}")],
    ["review center still approves", resumePreview.includes("onApproveForExport={() => void handleApproveForExport()}")],
    ["layout controls collapsed", resumePreview.includes("<details") && resumePreview.includes("Layout controls")],
    ["draft history open package label", draftHistory.includes("Open package") && !draftHistory.includes(">Edit<")],
    ["draft delete keeps list on error", draftHistory.includes("actionError") && draftHistory.includes("role=\"alert\"")],
    ["records open package when cover letter missing", recordsPanel.includes("Open package")],
    ["cover letter unsaved hint", coverLetterPreview.includes("hasUnsavedBodyChanges")],
    ["cover letter no mojibake in save button", !coverLetterPreview.includes("Savingâ€¦") && coverLetterPreview.includes("Saving\u2026")],
    ["cover letter save disabled when no unsaved changes", coverLetterPreview.includes("!hasUnsavedBodyChanges")],
    ["cover letter save primary only in raw or with unsaved changes", coverLetterPreview.includes("bodyView === \"raw\" || hasUnsavedBodyChanges")],
    ["cover letter pdf hint clarifies revisions are auto-saved", coverLetterPreview.includes("Quick revisions (below) are saved")],
    ["profile removes hardcoded name", !profile.includes("Min Htet")],
    ["profile links dev tools", profile.includes('href="/dev-tools"')],
    ["uploads single column resume list", !cloudFileStoragePanel.includes("lg:grid-cols-2")],
    ["uploads summary uses row layout", summaryCards.includes("flex flex-col gap-2")],
    [
      "landing hero centered product story",
      landingHero.includes("Customize your resume for every role") &&
        landingHero.includes("LandingCta") &&
        landingHero.includes("Application package preview"),
    ],
    [
      "generate centered primary cta",
      generateSection.includes("Generate Resume & Cover Letter") &&
        generateSection.includes("max-w-md") &&
        !generateSection.includes("Primary action"),
    ],
    [
      "recruitment firm checkbox ui only",
      jdPanel.includes("Recruitment firm / confidential client posting") &&
        jdPanel.includes("Coming soon") &&
        jdPanel.includes("disabled"),
    ],
    [
      "saved jobs default limit with show more",
      jdPanel.includes("SAVED_JOBS_DEFAULT_LIMIT = 10") && jdPanel.includes("Show fewer saved jobs"),
    ],
    [
      "applications compact rollup and details",
      recordsPanel.includes("By status") &&
        recordsPanel.includes("Hide details") &&
        recordsPanel.includes("applicationStatusBadgeClassName"),
    ],
    [
      "generation progress dynamic treatment",
      generationProgress.includes("animate-spin") && generationProgress.includes("STAGE_HINTS"),
    ],
    [
      "v0.9.12C import robustness and output polish",
      appNav.includes("grid-cols-5") &&
        appNav.includes("sm:hidden"),
    ],
    [
      "generate collapsible compact alerts",
      generate.includes("persistenceCollapsible") &&
        generate.includes("compact") &&
        setupAlerts.includes("Local data needs sync"),
    ],
    [
      "uploads and applications use compact alerts",
      uploads.includes("persistenceCollapsible") && records.includes("persistenceCollapsible"),
    ],
    ["generate compact page header", generate.includes("compact") && generate.includes("PageHeader")],
    [
      "v0.9.11G documented",
      handoff.includes("v0.9.11G") && roadmap.includes("v0.9.11G"),
    ],
    [
      "v0.9.11H documented",
      handoff.includes("v0.9.11H") && roadmap.includes("v0.9.11H"),
    ],
    [
      "v0.9.12A documented",
      handoff.includes("v0.9.12A") && roadmap.includes("v0.9.12A"),
    ],
    [
      "v0.9.12B documented",
      handoff.includes("v0.9.12B") && roadmap.includes("v0.9.12B"),
    ],
    [
      "v0.9.12D documented",
      handoff.includes("v0.9.12D") && roadmap.includes("v0.9.12D"),
    ],
    [
      "mobile nav no horizontal scroll",
      appNav.includes("grid-cols-5") && !appNav.includes("overflow-x-auto"),
    ],
    [
      "mobile nav apps short label",
      nav.includes('mobileLabel: "Apps"') && nav.includes('label: "Applications"'),
    ],
    [
      "generate readiness strip",
      generateSection.includes("generate-readiness-strip") && generateSection.includes("Readiness"),
    ],
    [
      "generate advanced options collapsible",
      jdPanel.includes("Advanced options (optional)") && jdPanel.includes("Job URL"),
    ],
    [
      "generate company role before jd textarea",
      jdPanel.indexOf('id="jd-company"') < jdPanel.indexOf("jd-raw-text") &&
        jdPanel.indexOf('id="jd-role"') < jdPanel.indexOf("jd-raw-text"),
    ],
    [
      "generate cta after jd in generate flow",
      (() => {
        const afterJd = jdPanel.split('id="jd-raw-text"')[1] ?? "";
        return (
          afterJd.includes("GenerateTailoredResumeSection") &&
          afterJd.includes("Advanced options (optional)") &&
          afterJd.indexOf("GenerateTailoredResumeSection") <
            afterJd.indexOf("Advanced options (optional)")
        );
      })(),
    ],
    [
      "application package draft ready status",
      resumePreview.includes("exportReady={exportReady}"),
    ],
    [
      "package two-col layout desktop",
      resumePreview.includes("lg:grid-cols-[20rem") && resumePreview.includes("lg:sticky"),
    ],
    [
      "generate mobile sticky cta",
      generateSection.includes("generate-mobile-sticky-cta") && generateSection.includes("fixed bottom-0"),
    ],
    [
      "generate mobile textarea shorter",
      jdPanel.includes("h-[6.5rem]") && jdPanel.includes("sm:h-auto"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll UX quick wins checks passed.");
}

main();
