import { GEMINI_MODEL_FALLBACK, GEMINI_MODEL_PRIMARY } from "@/lib/ai/config";

export type GeminiCallStep = {
  step: string;
  geminiCall: boolean;
  route: string;
  providerFile: string;
  model: string;
  optional: boolean;
  persistedTo: string;
  retryCanDuplicate: boolean;
  notes?: string;
};

export const GEMINI_END_TO_END_CALL_MAP: GeminiCallStep[] = [
  {
    step: "Enrichment",
    geminiCall: true,
    route: "/api/ai/enrich",
    providerFile: "src/lib/ai/gemini.ts",
    model: GEMINI_MODEL_PRIMARY,
    optional: true,
    persistedTo: "resume_inventories.data.enrichment",
    retryCanDuplicate: true,
    notes: "Transient HTTP retry via callGeminiWithRetry (503/429/5xx).",
  },
  {
    step: "Company context generation",
    geminiCall: true,
    route: "/api/ai/generate-company-context",
    providerFile: "src/lib/ai/company-context-gemini.ts",
    model: GEMINI_MODEL_PRIMARY,
    optional: true,
    persistedTo: "application_records.company_context",
    retryCanDuplicate: true,
    notes: "v0.9.4 auto-runs when missing in combined flow; failure falls back to JD fields.",
  },
  {
    step: "Resume generation",
    geminiCall: true,
    route: "/api/ai/generate-resume",
    providerFile: "src/lib/ai/resume-draft-gemini.ts",
    model: GEMINI_MODEL_PRIMARY,
    optional: false,
    persistedTo: "generated_resume_drafts",
    retryCanDuplicate: true,
    notes: "Large payload; transient HTTP retry via callGeminiWithRetry.",
  },
  {
    step: "Cover letter generation",
    geminiCall: true,
    route: "/api/ai/generate-cover-letter",
    providerFile: "src/lib/ai/cover-letter-gemini.ts",
    model: GEMINI_MODEL_PRIMARY,
    optional: false,
    persistedTo: "generated_cover_letter_drafts",
    retryCanDuplicate: true,
    notes: "HTTP retry + optional validation compression retry.",
  },
  {
    step: "Cover letter revision",
    geminiCall: true,
    route: "/api/ai/revise-cover-letter",
    providerFile: "src/lib/ai/revise-cover-letter-gemini.ts",
    model: GEMINI_MODEL_PRIMARY,
    optional: true,
    persistedTo: "generated_cover_letter_drafts.body",
    retryCanDuplicate: true,
    notes: "Quick revision; HTTP retry + optional compression retry.",
  },
];

export const GEMINI_MODEL_FALLBACK_NOTE = `Fallback model after transient failures: ${GEMINI_MODEL_FALLBACK}`;

export function countGeminiCallsForFlow(flow: {
  enrichment?: boolean;
  companyContext?: boolean;
  resume?: boolean;
  coverLetter?: boolean;
  coverLetterRevision?: boolean;
}): number {
  let count = 0;
  if (flow.enrichment) count += 1;
  if (flow.companyContext) count += 1;
  if (flow.resume) count += 1;
  if (flow.coverLetter) count += 1;
  if (flow.coverLetterRevision) count += 1;
  return count;
}

export function estimateFullApplicationGeminiCalls(options: {
  withEnrichment: boolean;
  withCompanyContext: boolean;
  resumeAndCoverLetter: boolean;
  coverLetterRetries: number;
  coverLetterRevisions: number;
}): number {
  return countGeminiCallsForFlow({
    enrichment: options.withEnrichment,
    companyContext: options.withCompanyContext,
    resume: options.resumeAndCoverLetter,
    coverLetter: options.resumeAndCoverLetter,
    coverLetterRevision: options.coverLetterRevisions > 0,
  }) + options.coverLetterRetries + Math.max(0, options.coverLetterRevisions - 1);
}
