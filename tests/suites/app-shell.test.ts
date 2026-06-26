import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const nav = readFileSync(join(process.cwd(), "src/components/app/nav.ts"), "utf8");
  const appNav = readFileSync(join(process.cwd(), "src/components/app/AppNav.tsx"), "utf8");
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
  const landingHero = readFileSync(
    join(process.cwd(), "src/components/landing/LandingHero.tsx"),
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
  const recordsPanel = readFileSync(
    join(process.cwd(), "src/components/setup/ApplicationRecordsPanel.tsx"),
    "utf8",
  );
  const draftHistory = readFileSync(
    join(process.cwd(), "src/components/setup/DraftHistoryPanel.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
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
    [
      "mobile nav grid layout",
      appNav.includes("grid-cols-5") && appNav.includes("sm:hidden"),
    ],
    [
      "mobile nav no horizontal scroll",
      appNav.includes("grid-cols-5") && !appNav.includes("overflow-x-auto"),
    ],
    [
      "mobile nav apps short label",
      nav.includes('mobileLabel: "Apps"') && nav.includes('label: "Applications"'),
    ],
    ["records renamed applications", records.includes('title="Applications"') && records.includes('pageMilestone("Applications")')],
    ["uploads page renamed", uploads.includes('title="Uploads"') && uploads.includes('pageMilestone("Uploads")')],
    ["generate shows setup alerts", generate.includes("SetupAlerts") && generate.includes("persistenceWarning")],
    ["records shows setup alerts", records.includes("SetupAlerts") && records.includes("persistenceWarning")],
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
    ["uploads single column resume list", !cloudFileStoragePanel.includes("lg:grid-cols-2")],
    ["uploads summary uses row layout", summaryCards.includes("flex flex-col gap-2")],
    [
      "landing hero centered product story",
      landingHero.includes("Customize your resume for every role") &&
        landingHero.includes("LandingCta") &&
        landingHero.includes("Application package preview"),
    ],
    ["profile removes hardcoded name", !profile.includes("Min Htet")],
    ["profile links dev tools", profile.includes('href="/dev-tools"')],
    [
      "applications compact rollup and details",
      recordsPanel.includes("By status") &&
        recordsPanel.includes("Hide details") &&
        recordsPanel.includes("applicationStatusBadgeClassName"),
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
    ["draft history open package label", draftHistory.includes("Open package") && !draftHistory.includes(">Edit<")],
    ["draft delete keeps list on error", draftHistory.includes("actionError") && draftHistory.includes('role="alert"')],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll app shell checks passed.");
}

main();
