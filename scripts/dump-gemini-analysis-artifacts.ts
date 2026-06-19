/**
 * One-off: dump artifacts for Gemini resume-draft analysis (items 13–16).
 * Run: npx tsx scripts/dump-gemini-analysis-artifacts.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateResumeDraftWithGemini } from "../src/lib/ai/resume-draft-gemini";
import { GEMINI_MODEL } from "../src/lib/ai/config";
import { createEmptyEnrichmentState, upsertKeywordBankItem } from "../src/lib/enrichment/state";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";
import {
  buildResumeDraftPayloadFromInventory,
} from "../src/lib/resume-draft/payload";
import { buildResumeDraftPrompt } from "../src/lib/resume-draft/prompt";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

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

function buildRealisticInventory(): InventoryState {
  const resumeA = parseResumeTextForTest(
    `
WORK EXPERIENCE
Pave Bank                                                                                Singapore
Product Manager                                                                          Jan 2023 – Present
• Product Operations: Built division-wide CRM workflow and onboarding playbooks for 200+ SME clients
• Financial Operations: Managed S$200k–300k monthly cash reconciliation across treasury and ops teams
• Strategy: Supported market entry initiatives across ASEAN corridors with regulatory stakeholders

EDUCATION
Nanyang Technological University                                                               Singapore
Renaissance Engineering Programme
Master of Science in Technology Management
Bachelor of Engineering Science (Mechanical Engineering)                                        Aug 2014 – Dec 2018
• MSc Honours (Highest Distinction)
• Dean's List – CGPA 4.75/5.00

ADDITIONAL EXPERIENCE
Other Past Roles: BayCurrent Consulting – Enterprise Blockchain (Japan), Entrepreneur First – Founders Experience Weekend, Active Global – Strategy & Operations, elderly primary care (Singapore), SE3D – 3D Bioprinting (Silicon Valley), Deloitte Consulting – Strategy & Operations (Myanmar)

SKILLS & INTERESTS
Languages: Fluent in English, Mandarin, Burmese (Spoken/Written), Japanese (JLPT N3), Basic Thai (Spoken)
Technical Skills: Strategy & Operations, Product Management, Python, SQL, CRM systems
Interests: Travel, Pickleball, Music
`,
    "resume-a",
  );
  resumeA.filename = "Hset Min Htet - Resume.docx";

  const resumeB = parseResumeTextForTest(
    `
WORK EXPERIENCE
Pave Bank                                                                                Singapore
Product Manager                                                                          Jan 2023 – Present
• Product Operations: Built division-wide CRM workflow and onboarding playbooks
• Partnerships: Built strategic alliances with payment networks and banking partners
• Growth: Increased active SME accounts by 35% through funnel optimisation

EDUCATION
Nanyang Technological University                                                               Singapore
Master of Science in Technology Management
Bachelor of Engineering Science (Mechanical Engineering)                                        Aug 2014 – Dec 2018
• BSc Honours (Highest Distinction) – CGPA 4.65/5.00
• NTU College Full-Scholarship
`,
    "resume-b",
  );
  resumeB.filename = "Hset Min Htet - Resume (2024).docx";

  let keywordBank = createEmptyEnrichmentState().keywordBank;
  keywordBank = upsertKeywordBankItem(keywordBank, "Product Operations", "ai_suggested", true);
  keywordBank = upsertKeywordBankItem(keywordBank, "Stakeholder Management", "ai_suggested", true);
  keywordBank = upsertKeywordBankItem(keywordBank, "Go-to-Market", "ai_suggested", true);
  keywordBank = upsertKeywordBankItem(keywordBank, "Financial Operations", "ai_suggested", false);

  return {
    resumes: [resumeA, resumeB],
    failures: [],
    enrichment: {
      ...createEmptyEnrichmentState(),
      keywordBank,
    },
  };
}

const pmJd: StoredJobDescription = {
  id: "jd-pm-pave-bank",
  rawText: `Product Manager
Pave Bank
Singapore (Hybrid)

About Pave Bank
Pave is building a modern business bank for SMEs and growth companies across ASEAN.

About the role
We are looking for a Product Manager to own core banking workflows from discovery through launch. You will partner with engineering, design, compliance, and go-to-market teams to ship customer-facing products that improve onboarding, payments, and treasury operations.

What you'll do
- Own product discovery and roadmap for SME onboarding and account operations
- Translate regulatory and banking constraints into clear product requirements
- Define success metrics, run experiments, and iterate on funnel conversion
- Partner with operations and finance on reconciliation, reporting, and controls
- Communicate tradeoffs to senior stakeholders and external partners

What we're looking for
- 3+ years in product management, strategy & operations, or consulting
- Experience with B2B or fintech products; comfort with compliance-heavy domains
- Strong written communication and structured problem solving
- Data-informed decision making; SQL or analytics tooling a plus
- Experience working with cross-functional teams in fast-moving environments`,
  companyName: "Pave Bank",
  roleTitle: "Product Manager",
  createdAt: "2025-06-01T00:00:00.000Z",
  updatedAt: "2025-06-01T00:00:00.000Z",
};

const strategyOpsJd: StoredJobDescription = {
  id: "jd-strategy-ops",
  rawText: `Strategy & Operations Manager
Active Global
Singapore

About the role
Join our Strategy & Operations team to improve how we scale elderly primary care services across Singapore. You will drive operational excellence, partner with clinical and commercial leaders, and turn ambiguous problems into executable plans.

Responsibilities
- Lead cross-functional initiatives spanning operations, finance, and customer experience
- Build operating models, dashboards, and process improvements for service delivery
- Support market expansion analysis and stakeholder management with regulators and partners
- Facilitate executive-ready updates and decision memos
- Identify cost, quality, and throughput improvements across the care network

Requirements
- 2–5 years in strategy & operations, management consulting, or product operations
- Strong analytical skills; comfortable with spreadsheets, SQL, or BI tools
- Experience structuring ambiguous problems and driving outcomes without direct authority
- Excellent communication in English; additional Asian languages a plus
- Healthcare or services operations experience preferred but not required`,
  companyName: "Active Global",
  roleTitle: "Strategy & Operations Manager",
  createdAt: "2025-06-01T00:00:00.000Z",
  updatedAt: "2025-06-01T00:00:00.000Z",
};

async function main() {
  loadEnvLocal();
  const inventory = buildRealisticInventory();
  const collated = buildCollatedInventory(inventory);
  const referenceResumeId = inventory.resumes[0].id;

  const pmPayload = buildResumeDraftPayloadFromInventory({
    inventory,
    jobDescription: pmJd,
    referenceResumeId,
  });

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const prompt = buildResumeDraftPrompt(pmPayload.generationInput);
  const geminiRequestBody = {
    model: GEMINI_MODEL,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    },
  };

  let geminiRawResponse: unknown = null;
  let generatedDraft: unknown = null;
  let geminiError: string | null = null;

  if (geminiApiKey) {
    try {
      generatedDraft = await generateResumeDraftWithGemini(
        pmPayload.generationInput,
        geminiApiKey,
      );
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiRequestBody.body),
        },
      );
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      geminiRawResponse = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? payload;
    } catch (error) {
      geminiError = error instanceof Error ? error.message : String(error);
    }
  }

  const supabaseInventoryShape = {
    note: "resume_inventories.data column stores full InventoryState (parsed resumes + enrichment), NOT pre-collated JSON",
    schema_version: "v1",
    data: inventory,
  };

  const generatedResumeDraftRecordShape = {
    note: "generated_resume_drafts row shape after Generate",
    job_description_id: pmJd.id,
    reference_resume_id: referenceResumeId,
    content: generatedDraft ? (generatedDraft as { content: unknown }).content : null,
    rationale: generatedDraft ? (generatedDraft as { rationale: unknown }).rationale : null,
    input_snapshot: pmPayload.inputSnapshot,
    provider: "gemini",
    model_name: GEMINI_MODEL,
    status: "generated",
    schema_version: "1",
  };

  const output = {
    "13_collated_inventory": collated,
    "13_supabase_resume_inventories_data": supabaseInventoryShape,
    "13_gemini_generation_input": pmPayload.generationInput,
    "14_sample_jd_pm": pmJd,
    "14_sample_jd_strategy_ops": strategyOpsJd,
    "15_generated_resume_draft": generatedResumeDraftRecordShape,
    "16_gemini_request": {
      ...geminiRequestBody,
      promptCharacterCount: prompt.length,
      promptPreviewFirst2000Chars: prompt.slice(0, 2000),
      promptPreviewLast1500Chars: prompt.slice(-1500),
    },
    "16_gemini_raw_response_text": geminiRawResponse,
    "16_gemini_error": geminiError,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
