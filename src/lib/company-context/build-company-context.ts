import type { CompanyContext, CompanyContextInput } from "@/types/company-context";

function extractHiringSignals(jobDescriptionText: string): string[] {
  const signals: string[] = [];
  const lines = jobDescriptionText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines.slice(0, 12)) {
    if (/looking for|seeking|we need|you will|responsibilit|requirement/i.test(line)) {
      signals.push(line.slice(0, 200));
    }
  }

  return signals.slice(0, 5);
}

function extractSummaryFromJd(jobDescriptionText: string, companyName: string): string | undefined {
  const paragraphs = jobDescriptionText
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  const first = paragraphs[0];
  if (!first) {
    return undefined;
  }

  return `${companyName}: ${first.slice(0, 400)}`;
}

/** Minimal company context — JD extraction + user fields; no live web search in v0.9.0. */
export function buildCompanyContext(input: CompanyContextInput): CompanyContext {
  const companyName = input.companyName.trim() || "the company";
  const country = input.country?.trim() || "Singapore";
  const website = input.website?.trim() || undefined;
  const hiringSignals = extractHiringSignals(input.jobDescriptionText);
  const summaryParts = [
    extractSummaryFromJd(input.jobDescriptionText, companyName),
    input.additionalInstructions?.trim(),
  ].filter(Boolean);

  let confidence: CompanyContext["confidence"] = "low";
  if (companyName && country) {
    confidence = "medium";
  }
  if (website) {
    confidence = "high";
  }

  return {
    companyName,
    country,
    website,
    summary: summaryParts.join("\n\n") || undefined,
    hiringSignals: hiringSignals.length > 0 ? hiringSignals : undefined,
    sourceUrls: website ? [website] : undefined,
    confidence,
  };
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
