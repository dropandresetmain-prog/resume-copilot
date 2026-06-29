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

  // Route-contract safeguard (Folio Recovery M1, roadmap §10.1 / §10.2).
  // Each active workspace route must mount its Folio client, and must never
  // import a legacy page client. A one-line import swap is exactly how the
  // pre-Folio rollback happened (d71d353 inventory, bc2fb9f records); these
  // grep contracts fail CI if a route is remounted to a legacy client.
  const activeRouteClients: Array<{ route: string; file: string; client: string }> = [
    { route: "/dashboard", file: "src/app/(workspace)/dashboard/page.tsx", client: "DashboardPageClient" },
    { route: "/inventory", file: "src/app/(workspace)/inventory/page.tsx", client: "CareerVaultPageClient" },
    { route: "/generate", file: "src/app/(workspace)/generate/page.tsx", client: "NewApplicationPageClient" },
    { route: "/records", file: "src/app/(workspace)/records/page.tsx", client: "ApplicationsPageClient" },
    {
      route: "/output/[draftId]",
      file: "src/app/(workspace)/output/[draftId]/page.tsx",
      client: "OutputEditorPageClient",
    },
  ];
  // The five legacy clients that must never be mounted at an active route.
  // Legacy routes (/resume-preview, /cover-letter-preview) keep their own
  // clients as behavioral references and are intentionally out of this scope.
  const forbiddenLegacyClients = [
    "InventoryPageClient",
    "RecordsPageClient",
    "GeneratePageClient",
    "ResumePreviewPageClient",
    "CoverLetterPreviewPageClient",
  ];
  const activeRouteSources = activeRouteClients.map(({ route, file, client }) => ({
    route,
    client,
    source: readFileSync(join(process.cwd(), file), "utf8"),
  }));

  const checks: [string, boolean][] = [
    // Folio shell contracts (updated from pre-Folio nav assertions in M1).
    // The pre-Folio sidebar (APP_VERSION badge, grid-cols-5 mobile nav,
    // mobileLabel, /setup, old landing copy) was replaced by the Folio
    // sidebar; these checks assert the shipped Folio shell instead.
    [
      "folio sidebar renders nav item arrays",
      appNav.includes("APP_NAV_ITEMS") && appNav.includes("APP_UTILITY_ITEMS"),
    ],
    ["dev tools removed from main nav", !nav.includes('label: "Dev Tools"')],
    [
      "folio nav order dashboard → vault → generate → applications",
      nav.indexOf('label: "Dashboard"') < nav.indexOf('label: "Career Vault"') &&
        nav.indexOf('label: "Career Vault"') < nav.indexOf('label: "Generate"') &&
        nav.indexOf('label: "Generate"') < nav.indexOf('label: "Applications"'),
    ],
    [
      "folio add-a-job cta targets generate",
      appNav.includes('href="/generate"') && appNav.includes("Add a job"),
    ],
    [
      "folio nav route hrefs",
      nav.includes('href: "/dashboard"') &&
        nav.includes('href: "/inventory"') &&
        nav.includes('href: "/generate"') &&
        nav.includes('href: "/records"'),
    ],
    [
      "folio sidebar fixed layout",
      appNav.includes("fixed inset-y-0 left-0") && appNav.includes("flex-col"),
    ],
    [
      "appnav sign out wired with full navigation",
      appNav.includes("handleSignOut") &&
        appNav.includes("signOut") &&
        appNav.includes("window.location.assign") &&
        appNav.includes("/auth/login"),
    ],
    [
      "folio nav applications label and route",
      nav.includes('label: "Applications"') && nav.includes('href: "/records"'),
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
      "landing hero folio product story",
      landingHero.includes("Folio builds tailored resumes") &&
        landingHero.includes('href="/auth/signup"') &&
        landingHero.includes("How it works"),
    ],
    ["profile removes hardcoded name", !profile.includes("Min Htet")],
    [
      "profile renders folio communication profile",
      profile.includes("Your details") && profile.includes("Cover letter voice"),
    ],
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
    // Route-contract: each active route mounts its Folio client.
    ...activeRouteSources.map(
      ({ route, client, source }): [string, boolean] => [
        `route ${route} mounts ${client}`,
        source.includes(`import { ${client} }`) && source.includes(`<${client}`),
      ],
    ),
    // Forbidden-remount: no active route imports a legacy page client.
    ...activeRouteSources.map(
      ({ route, source }): [string, boolean] => [
        `route ${route} imports no legacy page client`,
        !forbiddenLegacyClients.some((legacy) => source.includes(legacy)),
      ],
    ),
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
