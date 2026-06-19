/**
 * Pull production Supabase rows for Gemini analysis bundle.
 * Output: sample-data/private/gemini-analysis/*.raw.json (gitignored)
 */
import { execSync, type ExecSyncOptions } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "sample-data", "private", "gemini-analysis");

const QUERIES: [string, string][] = [
  [
    "01-resume-inventories.raw.json",
    `select id, user_id, schema_version, created_at, updated_at, data from resume_inventories order by updated_at desc limit 1`,
  ],
  [
    "03-job-descriptions.raw.json",
    `select id, company_name, role_title, job_url, summary, created_at, updated_at, raw_text from job_descriptions order by updated_at desc`,
  ],
  [
    "04-generated-resume-drafts.raw.json",
    `select id, job_description_id, reference_resume_id, provider, model_name, status, schema_version, created_at, updated_at, content, rationale, input_snapshot from generated_resume_drafts order by created_at desc limit 5`,
  ],
];

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const [filename, sql] of QUERIES) {
    const outPath = join(OUT_DIR, filename);
    const escapedSql = sql.replace(/"/g, '\\"');
    const execOptions: ExecSyncOptions = {
      stdio: "inherit",
      cwd: process.cwd(),
      shell: process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "/bin/sh",
    };
    execSync(
      `npx supabase db query --linked -o json "${escapedSql}" > "${outPath}"`,
      execOptions,
    );
    console.log(`Wrote ${outPath}`);
  }

  console.log("\nRun: npm run build:gemini-analysis-bundle");
}

main();
