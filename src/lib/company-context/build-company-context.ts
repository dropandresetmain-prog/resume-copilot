import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import type { CompanyContext, CompanyContextInput } from "@/types/company-context";

function extractHiringSignals(jobDescriptionText: string): string[] {
  const signals: string[] = [];
  const lines = jobDescriptionText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (/looking for|seeking|we need|you will|responsibilit|requirement|must have/i.test(line)) {
      signals.push(line.slice(0, 200));
    }
  }

  return signals.slice(0, 6);
}

function extractSummaryFromJd(jobDescriptionText: string, companyName: string): string {
  const paragraphs = jobDescriptionText
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  const first = paragraphs[0];
  if (!first) {
    return `${companyName}: role details inferred from the pasted job description only.`;
  }

  return `${companyName}: ${first.slice(0, 500)}`;
}

/** JD + user fields fallback when no saved Gemini company context exists. */
export function buildFallbackCompanyContext(input: CompanyContextInput): CompanyContext {
  const companyName = input.companyName.trim() || "the company";
  const displayName = normalizeCompanyDisplayName(companyName);
  const country = input.country?.trim() || "Singapore";
  const website = input.website?.trim() || undefined;
  const hiringSignals = extractHiringSignals(input.jobDescriptionText);
  const summary = [
    extractSummaryFromJd(input.jobDescriptionText, displayName),
    input.additionalInstructions?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  let confidence: CompanyContext["confidence"] = "low";
  if (companyName && country) {
    confidence = "medium";
  }

  return {
    companyName,
    displayName,
    country,
    website,
    sourceType: "jd_based_context",
    sources: [
      {
        type: "jd",
        success: true,
        retrievedAt: new Date().toISOString(),
      },
    ],
    companySummary: summary,
    productsAndServices: [],
    likelyHiringPriorities: hiringSignals,
    whyThisRoleMayMatter: input.roleTitle
      ? `Role focus: ${input.roleTitle}`
      : undefined,
    suggestedNarrativeAngles: [],
    confidence,
    limitations: [
      "JD-based context only — derived from job description and company fields.",
      "No company website research was performed.",
    ],
    generatedAt: new Date().toISOString(),
    summary,
    hiringSignals: hiringSignals.length > 0 ? hiringSignals : undefined,
    sourceUrls: website ? [website] : undefined,
  };
}

/** @deprecated use buildFallbackCompanyContext */
export function buildCompanyContext(input: CompanyContextInput): CompanyContext {
  return buildFallbackCompanyContext(input);
}

export function resolveCompanyNameForGeneration(options: {
  override?: string;
  jobCompanyName?: string;
  jobDescriptionText: string;
}): string {
  const override = options.override?.trim();
  if (override) {
    return override;
  }
  if (options.jobCompanyName?.trim()) {
    return options.jobCompanyName.trim();
  }

  const match = options.jobDescriptionText.match(
    /(?:at|@)\s+([A-Z][A-Za-z0-9&.'\-\s]{2,60})/,
  );
  return match?.[1]?.trim() ?? "the company";
}
