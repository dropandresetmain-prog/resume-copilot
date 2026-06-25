import type { GenerateContextPolicy, GenerateOutputMode } from "@/lib/generate/context-policy";

export type GenerateMode = GenerateOutputMode;

export type GenerateAiStepEstimate = {
  aiSteps: number;
  includesWebsiteFetch: boolean;
  includesCompanyContextAi: boolean;
  headline: string;
  footnote: string;
};

/**
 * User-facing estimate of logical AI steps before Generate runs.
 * Does not include retry/fallback/compression attempts (documented in footnote).
 */
export function estimateGenerateAiSteps(options: {
  mode: GenerateOutputMode;
  policy: Pick<
    GenerateContextPolicy,
    "runWebsiteResearch" | "needsCompanyContext" | "effectiveWebsite"
  >;
}): GenerateAiStepEstimate {
  const includesWebsiteFetch =
    options.policy.needsCompanyContext &&
    options.policy.runWebsiteResearch &&
    Boolean(options.policy.effectiveWebsite);
  const includesCompanyContextAi = includesWebsiteFetch;

  let aiSteps = 0;
  if (options.mode === "resume_only") {
    aiSteps = 1;
  } else if (options.mode === "cover_letter_only") {
    aiSteps = 1;
  } else {
    aiSteps = 2;
  }

  if (includesCompanyContextAi) {
    aiSteps += 1;
  }

  let headline: string;
  if (options.mode === "resume_only") {
    headline = "1 AI step (tailored resume)";
  } else if (options.mode === "cover_letter_only") {
    headline = includesCompanyContextAi
      ? "2 AI steps (company research + cover letter) + website fetch"
      : "1 AI step (cover letter)";
  } else if (includesCompanyContextAi) {
    headline = "3 AI steps (company research, resume, cover letter) + website fetch";
  } else {
    headline = "2 AI steps (tailored resume + cover letter)";
  }

  const footnoteParts = [
    "Each step may retry on transient errors. Cover letter compression can add an extra call.",
  ];
  if (includesWebsiteFetch) {
    footnoteParts.push(
      "Website fetch uses Firecrawl when company website research is enabled.",
    );
  }
  const footnote = footnoteParts.join(" ");

  return {
    aiSteps,
    includesWebsiteFetch,
    includesCompanyContextAi,
    headline,
    footnote,
  };
}
