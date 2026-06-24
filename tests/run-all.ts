import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
) as { version: string };

/** Same order as the pre-v0.9.8G npm test chain. */
const SUITES: { name: string; file: string }[] = [
  { name: "parser", file: "suites/parser.test.ts" },
  { name: "inventory", file: "suites/inventory.test.ts" },
  { name: "duration", file: "suites/duration.test.ts" },
  { name: "collation", file: "suites/collation.test.ts" },
  { name: "education", file: "suites/education.test.ts" },
  { name: "sections", file: "suites/section-detection.test.ts" },
  { name: "profile", file: "suites/profile.test.ts" },
  { name: "enrichment", file: "suites/enrichment.test.ts" },
  { name: "jd", file: "suites/jd.test.ts" },
  { name: "files", file: "suites/files.test.ts" },
  { name: "supabase", file: "suites/supabase.test.ts" },
  { name: "resume-draft", file: "suites/resume-draft.test.ts" },
  {
    name: "resume-generation-validation",
    file: "suites/resume-generation-validation.test.ts",
  },
  {
    name: "resume-generation-repair",
    file: "suites/resume-generation-repair.test.ts",
  },
  {
    name: "forced-bullet-regeneration",
    file: "suites/forced-bullet-regeneration.test.ts",
  },
  { name: "generation-payload", file: "suites/generation-payload.test.ts" },
  { name: "inventory-edits", file: "suites/inventory-edits.test.ts" },
  { name: "inventory-edit-ux", file: "suites/inventory-edit-ux.test.ts" },
  { name: "inventory-duplicate-cleanup", file: "suites/inventory-duplicate-cleanup.test.ts" },
  { name: "application-records", file: "suites/application-records.test.ts" },
  { name: "cover-letter", file: "suites/cover-letter.test.ts" },
  { name: "cover-letter-quality", file: "suites/cover-letter-quality.test.ts" },
  { name: "cover-letter-application-package", file: "suites/cover-letter-application-package.test.ts" },
  { name: "application-review", file: "suites/application-review.test.ts" },
  {
    name: "cover-letter-pdf-preview",
    file: "suites/cover-letter-pdf-preview.test.ts",
  },
  { name: "application-package-ux", file: "suites/application-package-ux.test.ts" },
  { name: "ux-quick-wins", file: "suites/ux-quick-wins.test.ts" },
  { name: "workflow-paper-cuts", file: "suites/workflow-paper-cuts.test.ts" },
  { name: "company-context", file: "suites/company-context.test.ts" },
  { name: "gemini-retry", file: "suites/gemini-retry.test.ts" },
  { name: "auto-company-context", file: "suites/auto-company-context.test.ts" },
  { name: "firecrawl-research", file: "suites/firecrawl-research.test.ts" },
  { name: "research-progress", file: "suites/research-progress.test.ts" },
  { name: "generate-flow", file: "suites/generate-flow.test.ts" },
  {
    name: "generation-partial-failure",
    file: "suites/generation-partial-failure.test.ts",
  },
  { name: "resume-draft-review", file: "suites/resume-draft-review.test.ts" },
  { name: "resume-draft-layout", file: "suites/resume-draft-layout.test.ts" },
  { name: "skills-section", file: "suites/skills-section.test.ts" },
  { name: "draft-inventory-safety", file: "suites/draft-inventory-safety.test.ts" },
  { name: "resume-docx-export", file: "suites/resume-docx-export.test.ts" },
  { name: "resume-pdf-export", file: "suites/resume-pdf-export.test.ts" },
  { name: "resume-pdf-page-count", file: "suites/resume-pdf-page-count.test.ts" },
  {
    name: "resume-approve-validation",
    file: "suites/resume-approve-validation.test.ts",
  },
  {
    name: "resume-pdf-preview-overflow",
    file: "suites/resume-pdf-preview-overflow.test.ts",
  },
  { name: "resume-export-delivery", file: "suites/resume-export-delivery.test.ts" },
  { name: "resume-layout-parity", file: "suites/resume-layout-parity.test.ts" },
  { name: "resume-export-strategy", file: "suites/resume-export-strategy.test.ts" },
  {
    name: "resume-export-model-parity",
    file: "suites/resume-export-model-parity.test.ts",
  },
  { name: "resume-approval-layout", file: "suites/resume-approval-layout.test.ts" },
];

for (const suite of SUITES) {
  const suitePath = path.join("tests", suite.file);
  const suiteAbs = path.join(ROOT, suitePath);

  console.log(`\n> resume-copilot@${packageJson.version} test:${suite.name}`);
  console.log(`> tsx ${suitePath.replace(/\\/g, "/")}\n`);

  try {
    execSync(`npx tsx ${JSON.stringify(suiteAbs)}`, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    process.exit(1);
  }
}

console.log(`\nAll ${SUITES.length} verification suites passed.`);
