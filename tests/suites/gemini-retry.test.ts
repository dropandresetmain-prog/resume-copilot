import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAYS_MS,
  GeminiHttpError,
  buildGeminiGenerationConfig,
  isGeminiModelUnavailableError,
  isTransientGeminiError,
  isTransientGeminiHttpStatus,
  logGeminiCallMetadata,
} from "../../src/lib/ai/call-gemini";
import { GEMINI_MODEL_FALLBACK, GEMINI_MODEL_PRIMARY } from "../../src/lib/ai/config";
import { COVER_LETTER_RESPONSE_SCHEMA } from "../../src/lib/ai/cover-letter-gemini";
import { toCoverLetterApiResponse } from "../../src/lib/ai/cover-letter-provider";
import { toResumeDraftApiResponse } from "../../src/lib/ai/resume-draft-provider";
import {
  GEMINI_TIER_FALLBACK_MODEL,
  InvalidModelTierError,
  buildModelSelectionMetadata,
  getPrimaryModelIdForTier,
  parseModelTier,
  resolveModelsForTier,
} from "../../src/lib/ai/model-tiers";

function main() {
  const geminiTs = readFileSync(join(process.cwd(), "src/lib/ai/gemini.ts"), "utf8");
  const companyContextGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/company-context-gemini.ts"),
    "utf8",
  );
  const resumeGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/resume-draft-gemini.ts"),
    "utf8",
  );
  const coverGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/cover-letter-gemini.ts"),
    "utf8",
  );
  const reviseGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/revise-cover-letter-gemini.ts"),
    "utf8",
  );
  const roleRewriteGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/resume-role-rewrite-gemini.ts"),
    "utf8",
  );
  const modelTierStorage = readFileSync(
    join(process.cwd(), "src/lib/ai/model-tier-storage.ts"),
    "utf8",
  );
  const rewriteRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/rewrite-resume-role/route.ts"),
    "utf8",
  );
  const reviseRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/revise-cover-letter/route.ts"),
    "utf8",
  );
  const resumeScopeGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/revise-resume-scope-gemini.ts"),
    "utf8",
  );
  const resumeScopeRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/revise-resume-scope/route.ts"),
    "utf8",
  );

  let invalidTierThrows = false;
  try {
    parseModelTier("ultra");
    invalidTierThrows = false;
  } catch (error) {
    invalidTierThrows = error instanceof InvalidModelTierError;
  }

  const premiumModels = resolveModelsForTier("premium");
  const coverLetterGenerationConfig = buildGeminiGenerationConfig({
    temperature: 0.3,
    responseMimeType: "application/json",
    responseSchema: COVER_LETTER_RESPONSE_SCHEMA,
  });
  const resumeApiResponse = toResumeDraftApiResponse(
    {
      content: {
        targetRoleTitle: "PM",
        summary: "",
        experience: [],
        education: [],
        additionalExperience: [],
        skills: [],
        interests: [],
      },
      rationale: { overall: "", selectionAudit: { selectedBulletKeys: [] } },
      providerId: "gemini",
      modelName: GEMINI_TIER_FALLBACK_MODEL,
      requestedModelTier: "premium",
      modelFallbackApplied: true,
    },
    {
      inputSnapshot: {
        jobDescriptionId: "jd-1",
        referenceResumeId: "resume-1",
        resumeModelTier: "premium",
        modelFallbackApplied: true,
      },
      modelName: GEMINI_TIER_FALLBACK_MODEL,
      requestedModelTier: "premium",
      modelFallbackApplied: true,
      timestamp: "2025-01-01T00:00:00.000Z",
    },
  );

  const coverApiResponse = toCoverLetterApiResponse(
    {
      formalContent: "Hello",
      rationale: {
        selectedThemes: [],
        whyTheseThemes: "",
        companyContextUsed: [],
        riskFlags: [],
        wordCount: 1,
        emailCoverLetter: "",
        linkedinMessage: "",
        recruiterDm: "",
        whatsappIntro: "",
        modelSelection: {
          requestedTier: "enhanced",
          fallbackApplied: false,
        },
      },
      providerId: "gemini",
      modelName: "gemini-3-flash-preview",
      requestedModelTier: "enhanced",
      modelFallbackApplied: false,
    },
    {
      modelName: "gemini-3-flash-preview",
      requestedModelTier: "enhanced",
      modelFallbackApplied: false,
      timestamp: "2025-01-01T00:00:00.000Z",
    },
  );

  const checks: [string, boolean][] = [
    ["503 UNAVAILABLE is transient", isTransientGeminiError(new GeminiHttpError(503, "UNAVAILABLE"))],
    ["429 rate limit is transient", isTransientGeminiError(new GeminiHttpError(429, "RESOURCE_EXHAUSTED"))],
    ["500 server error is transient", isTransientGeminiHttpStatus(500)],
    ["400 bad request is not transient", !isTransientGeminiHttpStatus(400)],
    [
      "validation error is not transient",
      !isTransientGeminiError(new Error("ResumeDraftValidationError: missing bullets")),
    ],
    ["network timeout message is transient", isTransientGeminiError(new Error("fetch failed ETIMEDOUT"))],
    ["max attempts is 3", GEMINI_MAX_ATTEMPTS === 3],
    ["retry delays are 1s 2s 4s", GEMINI_RETRY_DELAYS_MS.join(",") === "1000,2000,4000"],
    ["primary model default is gemini-2.5-flash", GEMINI_MODEL_PRIMARY === "gemini-2.5-flash"],
    [
      "fallback model default is gemini-2.5-flash-lite",
      GEMINI_MODEL_FALLBACK === "gemini-2.5-flash-lite",
    ],
    [
      "404 model retired is skippable",
      isGeminiModelUnavailableError(
        new GeminiHttpError(
          404,
          '{"error":{"message":"models/gemini-2.0-flash is no longer available"}}',
        ),
      ),
    ],
    ["enrichment uses callGeminiWithRetry", geminiTs.includes("callGeminiWithRetry")],
    ["company context uses callGeminiWithRetry", companyContextGemini.includes("callGeminiWithRetry")],
    ["resume uses callGeminiWithRetry", resumeGemini.includes("callGeminiWithRetry")],
    ["cover letter uses callGeminiWithRetry", coverGemini.includes("callGeminiWithRetry")],
    [
      "cover letter generation config carries structured output schema",
      coverLetterGenerationConfig.responseMimeType === "application/json" &&
        coverLetterGenerationConfig.responseSchema === COVER_LETTER_RESPONSE_SCHEMA,
    ],
    ["revision uses callGeminiWithRetry", reviseGemini.includes("callGeminiWithRetry")],
    ["standard tier maps to gemini-2.5-flash", getPrimaryModelIdForTier("standard") === "gemini-2.5-flash"],
    [
      "enhanced tier maps to gemini-3-flash-preview",
      getPrimaryModelIdForTier("enhanced") === "gemini-3-flash-preview",
    ],
    ["premium tier maps to gemini-3.5-flash", getPrimaryModelIdForTier("premium") === "gemini-3.5-flash"],
    ["missing tier defaults to standard", parseModelTier(undefined) === "standard"],
    ["empty tier defaults to standard", parseModelTier("") === "standard"],
    ["invalid tier throws InvalidModelTierError", invalidTierThrows],
    [
      "tiered models use tier primary not env primary",
      premiumModels[0] === "gemini-3.5-flash" && premiumModels[1] === GEMINI_TIER_FALLBACK_MODEL,
    ],
    [
      "fallback metadata detects downgrade",
      buildModelSelectionMetadata("premium", GEMINI_TIER_FALLBACK_MODEL).fallbackApplied,
    ],
    ["enrichment does not use resolveModelsForTier", !geminiTs.includes("resolveModelsForTier")],
    [
      "company context does not use resolveModelsForTier",
      !companyContextGemini.includes("resolveModelsForTier"),
    ],
    ["resume generation uses resolveModelsForTier", resumeGemini.includes("resolveModelsForTier")],
    ["cover letter generation uses resolveModelsForTier", coverGemini.includes("resolveModelsForTier")],
    ["cover letter revision uses resolveModelsForTier", reviseGemini.includes("resolveModelsForTier")],
    ["role rewrite uses resolveModelsForTier", roleRewriteGemini.includes("resolveModelsForTier")],
    ["resume custom revision uses callGeminiWithRetry", resumeScopeGemini.includes("callGeminiWithRetry")],
    ["resume custom revision uses resolveModelsForTier", resumeScopeGemini.includes("resolveModelsForTier")],
    ["resume batch revision uses callGeminiWithRetry", resumeScopeGemini.includes('logicalStep: "revise_resume_batch"')],
    ["call gemini logs metadata helper", typeof logGeminiCallMetadata === "function"],
    [
      "resume logical step name",
      resumeGemini.includes('logicalStep: "generate_resume"'),
    ],
    [
      "company context logical step name",
      companyContextGemini.includes('logicalStep: "generate_company_context"'),
    ],
    ["role rewrite route parses resumeModelTier", rewriteRoute.includes("parseModelTier(body.resumeModelTier)")],
    [
      "cover letter revision route parses coverLetterModelTier",
      reviseRoute.includes("parseModelTier(body.coverLetterModelTier)"),
    ],
    [
      "resume custom revision route parses resumeModelTier",
      resumeScopeRoute.includes("parseModelTier(body.resumeModelTier)"),
    ],
    [
      "resume API response stores actual model used",
      resumeApiResponse.modelName === GEMINI_TIER_FALLBACK_MODEL &&
        resumeApiResponse.inputSnapshot.resumeModelTier === "premium",
    ],
    [
      "cover letter API response stores actual model used",
      coverApiResponse.modelName === "gemini-3-flash-preview" &&
        coverApiResponse.rationale.modelSelection?.requestedTier === "enhanced",
    ],
    [
      "localStorage keys defined for tier persistence",
      modelTierStorage.includes("resume-copilot:resume-model-tier") &&
        modelTierStorage.includes("resume-copilot:cover-letter-model-tier"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll Gemini retry checks passed.");
}

main();
