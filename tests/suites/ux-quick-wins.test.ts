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
    ["app version constant", appVersion.includes('APP_VERSION = "0.9.11A"')],
    ["package json version", packageJson.includes('"version": "0.9.11A"')],
    ["nav version uses shared constant", appNav.includes("APP_VERSION")],
    ["dev tools removed from main nav", !nav.includes('label: "Dev Tools"')],
    ["generate shows setup alerts", generate.includes("SetupAlerts") && generate.includes("persistenceWarning")],
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
