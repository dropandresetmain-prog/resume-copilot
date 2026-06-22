import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAYS_MS,
  GeminiHttpError,
  isGeminiModelUnavailableError,
  isTransientGeminiError,
  isTransientGeminiHttpStatus,
} from "../../src/lib/ai/call-gemini";
import { GEMINI_MODEL_FALLBACK, GEMINI_MODEL_PRIMARY } from "../../src/lib/ai/config";

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
  const coverGemini = readFileSync(join(process.cwd(), "src/lib/ai/cover-letter-gemini.ts"), "utf8");
  const reviseGemini = readFileSync(
    join(process.cwd(), "src/lib/ai/revise-cover-letter-gemini.ts"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["503 UNAVAILABLE is transient", isTransientGeminiError(new GeminiHttpError(503, "UNAVAILABLE"))],
    ["429 rate limit is transient", isTransientGeminiError(new GeminiHttpError(429, "RESOURCE_EXHAUSTED"))],
    ["500 server error is transient", isTransientGeminiHttpStatus(500)],
    ["400 bad request is not transient", !isTransientGeminiHttpStatus(400)],
    ["validation error is not transient", !isTransientGeminiError(new Error("ResumeDraftValidationError: missing bullets"))],
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
    ["revision uses callGeminiWithRetry", reviseGemini.includes("callGeminiWithRetry")],
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
