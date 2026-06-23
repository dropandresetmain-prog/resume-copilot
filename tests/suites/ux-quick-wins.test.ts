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
  const recordsPanel = readFileSync(
    join(process.cwd(), "src/components/setup/ApplicationRecordsPanel.tsx"),
    "utf8",
  );
  const profile = readFileSync(
    join(process.cwd(), "src/components/pages/ProfilePageClient.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["app version constant", appVersion.includes('APP_VERSION = "0.9.11C"')],
    ["package json version", packageJson.includes('"version": "0.9.11C"')],
    ["nav version uses shared constant", appNav.includes("APP_VERSION")],
    ["dev tools removed from main nav", !nav.includes('label: "Dev Tools"')],
    [
      "nav labels ordered for IA cleanup",
      nav.indexOf('label: "Uploads"') < nav.indexOf('label: "Inventory"') &&
        nav.indexOf('label: "Inventory"') < nav.indexOf('label: "Generate"') &&
        nav.indexOf('label: "Generate"') < nav.indexOf('label: "Applications"') &&
        nav.indexOf('label: "Applications"') < nav.indexOf('label: "Profile"'),
    ],
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
    ["profile removes hardcoded name", !profile.includes("Min Htet")],
    ["profile links dev tools", profile.includes('href="/dev-tools"')],
    [
      "v0.9.11C parked follow-ups documented",
      handoff.includes("Recruiter/confidential-client mode") &&
        handoff.includes("Inventory CRUD") &&
        roadmap.includes("recruiter/confidential-client mode") &&
        roadmap.includes("Inventory CRUD"),
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
