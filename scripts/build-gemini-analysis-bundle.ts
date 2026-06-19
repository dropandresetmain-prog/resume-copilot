/**
 * Build a self-contained Gemini resume-analysis bundle from Supabase pull files.
 *
 * Prerequisite: run `npm run pull:gemini-analysis` first.
 * Output: sample-data/private/gemini-analysis/ (gitignored)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateResumeDraftWithGemini } from "../src/lib/ai/resume-draft-gemini";
import { GEMINI_MODEL } from "../src/lib/ai/config";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { validateInventoryState } from "../src/lib/inventory/persistence";
import {
  buildResumeDraftPayloadFromInventory,
} from "../src/lib/resume-draft/payload";
import { buildResumeDraftPrompt } from "../src/lib/resume-draft/prompt";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

const OUT_DIR = join(process.cwd(), "sample-data", "private", "gemini-analysis");

const PAVE_BANK_JD_ID = "7b77ec63-3eb6-4992-b491-72d3fedf15b3";
const LUMEN_JD_ID = "6118ac34-170a-4632-bb22-31db7d2af348";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function parseSupabaseQueryFile(path: string): Record<string, unknown> {
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const start = raw.indexOf('{"boundary"');
  const jsonStart = start >= 0 ? start : raw.indexOf("{");
  if (jsonStart < 0) {
    throw new Error(`No JSON object found in ${path}`);
  }
  return JSON.parse(raw.slice(jsonStart)) as Record<string, unknown>;
}

function writeJson(name: string, value: unknown) {
  writeFileSync(join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mapJobDescriptionRow(row: Record<string, unknown>): StoredJobDescription {
  return {
    id: String(row.id),
    rawText: String(row.raw_text ?? ""),
    companyName: typeof row.company_name === "string" ? row.company_name : undefined,
    roleTitle: typeof row.role_title === "string" ? row.role_title : undefined,
    jobUrl: typeof row.job_url === "string" ? row.job_url : undefined,
    summary: typeof row.summary === "string" ? row.summary : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function summarizeCollated(collated: ReturnType<typeof buildCollatedInventory>) {
  return {
    experienceCount: collated.experiences.length,
    bulletCount: collated.experiences.reduce((n, e) => n + e.bullets.length, 0),
    educationCount: collated.educationItems.length,
    additionalExperienceCount: collated.additionalExperienceItems.length,
    skillCount: collated.skillItems.length,
    experiences: collated.experiences.map((exp) => ({
      company: exp.company,
      role: exp.role,
      dateRange: exp.dateRange,
      bulletCount: exp.bullets.length,
      bullets: exp.bullets.map((b) => ({
        keyword: b.keyword,
        description: b.description,
        sourceCount: b.sourceCitations.length,
      })),
    })),
  };
}

function summarizeDraftSelection(
  generationInput: ReturnType<typeof buildResumeDraftPayloadFromInventory>["generationInput"],
  draftContent: { experience?: { bullets?: { text?: string; sourceRefs?: { bulletKey?: string }[] }[] }[] },
) {
  const inventoryBullets = generationInput.experiences.flatMap((exp) =>
    exp.bullets.map((b) => ({
      bulletKey: b.bulletKey,
      keyword: b.keyword,
      description: b.description,
    })),
  );
  const selectedKeys = new Set(
    (draftContent.experience ?? []).flatMap((exp) =>
      (exp.bullets ?? []).flatMap((b) =>
        (b.sourceRefs ?? [])
          .map((ref) => ref.bulletKey)
          .filter((key): key is string => Boolean(key)),
      ),
    ),
  );

  return {
    inventoryBulletCount: inventoryBullets.length,
    selectedBulletCount: selectedKeys.size,
    dropped: inventoryBullets
      .filter((b) => !selectedKeys.has(b.bulletKey))
      .map((b) => ({ keyword: b.keyword, description: b.description, bulletKey: b.bulletKey })),
    selected: inventoryBullets
      .filter((b) => selectedKeys.has(b.bulletKey))
      .map((b) => ({ keyword: b.keyword, description: b.description, bulletKey: b.bulletKey })),
  };
}

async function main() {
  loadEnvLocal();
  mkdirSync(OUT_DIR, { recursive: true });

  const inventoryQuery = parseSupabaseQueryFile(
    join(OUT_DIR, "01-resume-inventories.raw.json"),
  );
  const jdQuery = parseSupabaseQueryFile(join(OUT_DIR, "03-job-descriptions.raw.json"));
  const draftsQuery = parseSupabaseQueryFile(
    join(OUT_DIR, "04-generated-resume-drafts.raw.json"),
  );

  const inventoryRows = (inventoryQuery.rows ?? []) as Record<string, unknown>[];
  const jdRows = (jdQuery.rows ?? []) as Record<string, unknown>[];
  const draftRows = (draftsQuery.rows ?? []) as Record<string, unknown>[];

  if (inventoryRows.length === 0) {
    throw new Error("No resume_inventories rows found.");
  }

  const inventoryRow = inventoryRows[0];
  const inventoryData = inventoryRow.data;
  const inventory = validateInventoryState(inventoryData);
  if (!inventory) {
    throw new Error("resume_inventories.data failed validation.");
  }

  const jobDescriptions = jdRows.map(mapJobDescriptionRow);
  const paveBankJd = jobDescriptions.find((jd) => jd.id === PAVE_BANK_JD_ID);
  const lumenJd = jobDescriptions.find((jd) => jd.id === LUMEN_JD_ID);

  const collated = buildCollatedInventory(inventory);
  writeJson("02-collated-inventory.json", collated);
  writeJson("02-inventory-state.json", inventory);

  const referenceResumeId =
    inventory.resumes.find((r) => r.filename.includes("Product Management"))?.id ??
    inventory.resumes[0]?.id;

  if (!referenceResumeId || !paveBankJd) {
    throw new Error("Missing reference resume or Pave Bank JD.");
  }

  const pavePayload = buildResumeDraftPayloadFromInventory({
    inventory,
    jobDescription: paveBankJd,
    referenceResumeId,
  });
  writeJson("05-gemini-generation-input-pave-bank-pm.json", pavePayload.generationInput);
  writeJson("05-input-snapshot-pave-bank-pm.json", pavePayload.inputSnapshot);

  const paveDraftRow = draftRows.find((row) => row.job_description_id === PAVE_BANK_JD_ID);
  if (paveDraftRow) {
    writeJson("06-generated-draft-pave-bank-pm.json", {
      id: paveDraftRow.id,
      job_description_id: paveDraftRow.job_description_id,
      reference_resume_id: paveDraftRow.reference_resume_id,
      provider: paveDraftRow.provider,
      model_name: paveDraftRow.model_name,
      status: paveDraftRow.status,
      created_at: paveDraftRow.created_at,
      content: paveDraftRow.content,
      rationale: paveDraftRow.rationale,
      input_snapshot: paveDraftRow.input_snapshot,
    });
    writeJson("07-gemini-stored-response-pave-bank-pm.json", {
      note: "Reconstructed from generated_resume_drafts — this is the parsed Gemini output from the original Generate click.",
      draft_id: paveDraftRow.id,
      created_at: paveDraftRow.created_at,
      rawModelOutputShape: {
        ...(paveDraftRow.content as object),
        rationale: paveDraftRow.rationale,
      },
    });
  }

  const lumenDraftRow = draftRows.find(
    (row) => row.job_description_id === LUMEN_JD_ID && row.status === "approved",
  ) ?? draftRows.find((row) => row.job_description_id === LUMEN_JD_ID);

  if (lumenJd && lumenDraftRow) {
    const lumenPayload = buildResumeDraftPayloadFromInventory({
      inventory,
      jobDescription: lumenJd,
      referenceResumeId: String(lumenDraftRow.reference_resume_id ?? referenceResumeId),
    });
    writeJson("05-gemini-generation-input-lumen-equity-analyst.json", lumenPayload.generationInput);
    writeJson("06-generated-draft-lumen-equity-analyst.json", {
      id: lumenDraftRow.id,
      job_description_id: lumenDraftRow.job_description_id,
      reference_resume_id: lumenDraftRow.reference_resume_id,
      provider: lumenDraftRow.provider,
      model_name: lumenDraftRow.model_name,
      status: lumenDraftRow.status,
      created_at: lumenDraftRow.created_at,
      content: lumenDraftRow.content,
      rationale: lumenDraftRow.rationale,
      input_snapshot: lumenDraftRow.input_snapshot,
    });
  }

  const prompt = buildResumeDraftPrompt(pavePayload.generationInput);
  const geminiRequest = {
    model: GEMINI_MODEL,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    promptCharacterCount: prompt.length,
    prompt,
    generationInput: pavePayload.generationInput,
  };

  let geminiRawResponse: string | null = null;
  let geminiReplayError: string | null = null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: geminiRequest.generationConfig,
          }),
        },
      );
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string };
      };
      if (!response.ok) {
        geminiReplayError = payload.error?.message ?? `HTTP ${response.status}`;
      } else {
        geminiRawResponse = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      }
    } catch (error) {
      geminiReplayError = error instanceof Error ? error.message : String(error);
    }
  } else {
    geminiReplayError = "GEMINI_API_KEY not set — skipped live replay.";
  }

  writeJson("07-gemini-request-pave-bank-pm.json", geminiRequest);
  writeJson("07-gemini-raw-response-replay-pave-bank-pm.json", {
    note: "Fresh Gemini call using production inventory + Pave Bank JD (2026-06-19). Stored draft in 06-generated-draft-pave-bank-pm.json is the authoritative app output from Generate.",
    error: geminiReplayError,
    rawResponseText: geminiRawResponse,
  });

  const paveSelection = paveDraftRow?.content
    ? summarizeDraftSelection(pavePayload.generationInput, paveDraftRow.content as never)
    : null;

  const strategyOpsFromInventory = collated.additionalExperienceItems
    .filter((item) => /strategy\s*&\s*operations/i.test(item.text))
    .map((item) => item.text);

  const markdown = `# Gemini Resume Optimization — Analysis Bundle

Generated: ${new Date().toISOString()}  
Source: **Production Supabase** (\`resume-copilot\` project, \`ap-southeast-1\`)  
Location: \`sample-data/private/gemini-analysis/\` (**gitignored** — safe for local export/sharing)

---

## Purpose

This bundle answers the four artifacts requested for analyzing how **Gemini** is used to optimize resumes in **Career Resume Copilot**. Share this folder (or this markdown + JSON files) with an external analyst (e.g. ChatGPT).

---

## Questions answered

| # | Question | Answer location |
|---|----------|-----------------|
| **13** | Sample parsed / collated inventory JSON (after parse, dedupe, enrichment) | \`02-inventory-state.json\` (raw Supabase), \`02-collated-inventory.json\` (derived), summary below |
| **14** | Sample JD input (PM + Strategy & Ops) | \`03-job-descriptions.raw.json\` — **Pave Bank PM** is real saved JD; **no Strategy & Ops JD saved** in DB (see note) |
| **15** | Generated resume draft JSON / output | \`06-generated-draft-pave-bank-pm.json\` (PM), \`06-generated-draft-lumen-equity-analyst.json\` (bonus: Equity Analyst) |
| **16** | Raw Gemini request + response | \`07-gemini-request-pave-bank-pm.json\`, \`07-gemini-stored-response-pave-bank-pm.json\` (original Generate output), \`07-gemini-raw-response-replay-pave-bank-pm.json\` (optional fresh replay) |

---

## Pipeline (how data flows)

\`\`\`
resume_inventories.data (InventoryState)
  → buildCollatedInventory()           → CollatedInventory
  → buildResumeDraftPayloadFromInventory()
      → ResumeDraftGenerationInput     → POST /api/ai/generate-resume
      → buildResumeDraftPrompt()       → Gemini generateContent (gemini-2.5-flash)
      → parseResumeDraftJson()         → generated_resume_drafts.content + rationale
\`\`\`

**Important:** Gemini does **not** receive \`{ profile, workExperience, ... }\`. It receives \`ResumeDraftGenerationInput\`: \`jobDescription\`, \`approvedKeywords\`, \`experiences[]\`, \`education[]\`, \`additionalExperience[]\`, \`skills[]\`, \`referenceResume\` (formatting only).

---

## 13 — Inventory summary (production)

| Metric | Value |
|--------|-------|
| Parsed resumes | ${inventory.resumes.length} |
| Parse failures | ${inventory.failures.length} |
| Approved keywords | ${inventory.enrichment.keywordBank.filter((k) => k.approved).length} |
| Collated experiences | ${collated.experiences.length} |
| Collated bullets | ${collated.experiences.reduce((n, e) => n + e.bullets.length, 0)} |
| Education items | ${collated.educationItems.length} |
| Skill items | ${collated.skillItems.length} |

### Collated experience roles
${collated.experiences
  .map(
    (exp) =>
      `- **${exp.company}** — ${exp.role} (${exp.dateRange ?? "no dates"}) — ${exp.bullets.length} bullets`,
  )
  .join("\n")}

Full JSON: \`02-collated-inventory.json\`

---

## 14 — Job descriptions (production)

### PM role — Pave Bank (saved in Supabase)

- **ID:** \`${PAVE_BANK_JD_ID}\`
- **Title:** ${paveBankJd?.roleTitle ?? "Product Manager"} @ ${paveBankJd?.companyName ?? "Pave Bank"}
- **Full text:** see \`03-job-descriptions.raw.json\` or excerpt in \`14-jd-pave-bank-pm.txt\`

### Strategy & Ops role

**Not saved as a job description in Supabase.** The candidate's inventory includes Strategy & Operations in **Additional Experience**:

${strategyOpsFromInventory.map((t) => `- ${t}`).join("\n") || "- (none found)"}

For analyst comparison, use a hypothetical Strategy & Ops JD or paste one when testing Generate.

### Other saved JDs

${jobDescriptions
  .filter((jd) => jd.id !== PAVE_BANK_JD_ID)
  .map((jd) => `- **${jd.companyName ?? "Unknown"}** — ${jd.roleTitle ?? "Untitled"} (\`${jd.id}\`)`)
  .join("\n")}

---

## 15 — Generated draft summary (Pave Bank PM)

${paveDraftRow ? `- **Draft ID:** \`${paveDraftRow.id}\`
- **Status:** ${paveDraftRow.status}
- **Provider:** ${paveDraftRow.provider} / ${paveDraftRow.model_name}
- **Created:** ${paveDraftRow.created_at}` : "_No stored draft found for Pave Bank JD._"}

${paveSelection ? `### Bullet selection (${paveSelection.selectedBulletCount} selected / ${paveSelection.inventoryBulletCount} in payload)

**Selected:**
${paveSelection.selected.map((b) => `- ${b.keyword}: ${b.description}`).join("\n")}

**Dropped from inventory payload:**
${paveSelection.dropped.length > 0 ? paveSelection.dropped.map((b) => `- ${b.keyword}: ${b.description}`).join("\n") : "- (none)"}` : ""}

Full draft JSON: \`06-generated-draft-pave-bank-pm.json\`

---

## 16 — Gemini request / response

- **Model:** \`${GEMINI_MODEL}\`
- **Temperature:** 0.2
- **Response MIME:** \`application/json\`
- **Prompt length:** ${prompt.length.toLocaleString()} characters
- **Full prompt + input payload:** \`07-gemini-request-pave-bank-pm.json\`
- **Stored Gemini output (from Generate):** \`07-gemini-stored-response-pave-bank-pm.json\`
- **Live replay raw response:** \`07-gemini-raw-response-replay-pave-bank-pm.json\`
${geminiReplayError ? `- **Replay note:** ${geminiReplayError}` : ""}

Code paths:
- \`src/lib/resume-draft/prompt.ts\` → \`buildResumeDraftPrompt()\`
- \`src/lib/ai/resume-draft-gemini.ts\` → API call
- \`src/app/api/ai/generate-resume/route.ts\` → HTTP endpoint

---

## File index

| File | Contents |
|------|----------|
| \`01-resume-inventories.raw.json\` | Supabase pull: latest \`resume_inventories\` row |
| \`02-inventory-state.json\` | Parsed \`InventoryState\` (resumes + enrichment) |
| \`02-collated-inventory.json\` | After collation/dedupe |
| \`03-job-descriptions.raw.json\` | All saved JDs |
| \`04-generated-resume-drafts.raw.json\` | Latest 5 drafts from Supabase |
| \`05-gemini-generation-input-pave-bank-pm.json\` | Exact payload sent to prompt builder |
| \`05-input-snapshot-pave-bank-pm.json\` | Compact snapshot stored on draft |
| \`06-generated-draft-pave-bank-pm.json\` | Stored PM draft (content + rationale) |
| \`06-generated-draft-lumen-equity-analyst.json\` | Stored Equity Analyst draft |
| \`07-gemini-request-pave-bank-pm.json\` | Full prompt + generation input |
| \`07-gemini-stored-response-pave-bank-pm.json\` | Gemini JSON from original Generate (reconstructed) |
| \`07-gemini-raw-response-replay-pave-bank-pm.json\` | Fresh Gemini JSON response (if API available) |
| \`14-jd-pave-bank-pm.txt\` | Copy-paste JD text |
| \`14-jd-lumen-equity-analyst.txt\` | Copy-paste JD text |
| \`GEMINI_RESUME_ANALYSIS_BUNDLE.md\` | This file |

---

## Refresh

\`\`\`bash
npm run pull:gemini-analysis
npm run build:gemini-analysis-bundle
\`\`\`
`;

  writeFileSync(join(OUT_DIR, "GEMINI_RESUME_ANALYSIS_BUNDLE.md"), markdown, "utf8");

  if (paveBankJd) {
    writeFileSync(join(OUT_DIR, "14-jd-pave-bank-pm.txt"), paveBankJd.rawText, "utf8");
  }
  if (lumenJd) {
    writeFileSync(join(OUT_DIR, "14-jd-lumen-equity-analyst.txt"), lumenJd.rawText, "utf8");
  }

  console.log(`Bundle written to ${OUT_DIR}`);
  console.log(`- GEMINI_RESUME_ANALYSIS_BUNDLE.md`);
  console.log(`- ${inventory.resumes.length} resumes, ${jobDescriptions.length} JDs, ${draftRows.length} drafts`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
