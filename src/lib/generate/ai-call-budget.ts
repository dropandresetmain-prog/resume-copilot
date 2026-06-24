import { resolveCompanyWebsiteForResearch } from "@/lib/firecrawl/url";

export type GenerateMode = "resume_only" | "resume_and_cover_letter";

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
  mode: GenerateMode;
  skipWebsiteResearch: boolean;
  companyWebsite?: string;
}): GenerateAiStepEstimate {
  const aiSteps = options.mode === "resume_only" ? 1 : 2;
  const hasWebsite = Boolean(resolveCompanyWebsiteForResearch(options.companyWebsite));
  const wouldResearch =
    options.mode === "resume_and_cover_letter" &&
    !options.skipWebsiteResearch &&
    hasWebsite;

  const includesWebsiteFetch = wouldResearch;
  const includesCompanyContextAi = wouldResearch;

  let headline: string;
  if (options.mode === "resume_only") {
    headline = "1 AI step (tailored resume)";
  } else if (wouldResearch) {
    headline = "3 AI steps (company research, resume, cover letter) + website fetch";
  } else {
    headline = "2 AI steps (tailored resume + cover letter)";
  }

  const footnote =
    "Each step may retry on transient errors. Cover letter compression can add an extra call.";

  return {
    aiSteps: wouldResearch ? aiSteps + 1 : aiSteps,
    includesWebsiteFetch,
    includesCompanyContextAi,
    headline,
    footnote,
  };
}
