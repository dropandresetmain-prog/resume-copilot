import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  COMPANY_CONTEXT_AUTO_FAIL_WARNING,
  ensureCompanyContextForGeneration,
} from "../src/lib/company-context/ensure-for-generation";
import { hasUsableCompanyContext } from "../src/lib/company-context/normalize";
import {
  formatCompanyContextStatusLabel,
  resolveCompanyContextDisplayStatus,
} from "../src/lib/company-context/status-labels";
import { createJobDescriptionFromInput } from "../src/lib/jd/persistence";
import type { CompanyContext } from "../src/types/company-context";

function buildSavedContext(): CompanyContext {
  return {
    companyName: "Pave Bank",
    displayName: "Pave Bank",
    country: "Singapore",
    companySummary: "Digital bank focused on business banking.",
    productsAndServices: [],
    likelyHiringPriorities: [],
    suggestedNarrativeAngles: [],
    confidence: "medium",
    limitations: [],
    generatedAt: "2025-01-01T00:00:00.000Z",
  };
}

async function main() {
  const job = createJobDescriptionFromInput({
    rawText: "Product Manager at Pave Bank.",
    companyName: "Pave Bank",
    roleTitle: "Product Manager",
  });

  const saved = buildSavedContext();
  const reused = await ensureCompanyContextForGeneration({
    applicationId: "app-1",
    savedContext: saved,
    job,
    autoGenerate: true,
  });

  const skipped = await ensureCompanyContextForGeneration({
    applicationId: "app-1",
    savedContext: null,
    job,
    autoGenerate: false,
  });

  const generateSection = readFileSync(
    join(process.cwd(), "src/components/setup/GenerateTailoredResumeSection.tsx"),
    "utf8",
  );
  const editorPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextEditorPanel.tsx"),
    "utf8",
  );
  const progress = readFileSync(
    join(process.cwd(), "src/lib/generate/generation-progress.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["saved context reused without auto generate call", reused.status === "saved" && reused.companyContext === saved],
    ["skipped when autoGenerate false", skipped.status === "skipped"],
    ["saved context is usable", hasUsableCompanyContext(saved)],
    ["failure warning copy defined", COMPANY_CONTEXT_AUTO_FAIL_WARNING.includes("JD/company fields only")],
    [
      "display status will auto-generate in combined mode",
      resolveCompanyContextDisplayStatus({ savedContext: null, combinedMode: true }) ===
        "will_auto_generate",
    ],
    [
      "display status saved when context exists",
      resolveCompanyContextDisplayStatus({ savedContext: saved, combinedMode: true }) === "saved",
    ],
    [
      "status label includes Saved",
      formatCompanyContextStatusLabel("saved").includes("Saved"),
    ],
    ["generate section calls ensureCompanyContextForGeneration", generateSection.includes("ensureCompanyContextForGeneration")],
    ["generate auto-generates only in combined mode", generateSection.includes('generateMode === "resume_and_cover_letter"')],
    ["generate stores context warning", generateSection.includes("companyContextWarning")],
    ["retry cover letter reuses application context", generateSection.includes("getApplicationRecordFromCloud")],
    [
      "retry cover letter does not auto-generate context",
      !generateSection.split("async function handleRetryCoverLetter")[1]?.includes(
        "ensureCompanyContextForGeneration",
      ),
    ],
    ["progress includes company context stage", progress.includes("Researching company context")],
    ["editor panel is compact secondary", editorPanel.includes("Preview / Edit Company Context")],
    ["editor panel has regenerate", editorPanel.includes("Regenerate Company Context")],
    ["editor panel shows status label", editorPanel.includes("formatCompanyContextStatusLabel")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll auto company context checks passed.");
}

void main();
