import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import { normalizeCompanyContext } from "@/lib/company-context/normalize";
import type { CompanyContext } from "@/types/company-context";

export class CompanyContextParseError extends Error {
  rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = "CompanyContextParseError";
    this.rawText = rawText;
  }
}

export function parseCompanyContextJson(
  rawText: string,
  fallback?: { companyName?: string; country?: string; website?: string },
): CompanyContext {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new CompanyContextParseError("Invalid company context JSON.", rawText);
  }

  const normalized = normalizeCompanyContext(parsed, fallback);
  if (!normalized) {
    throw new CompanyContextParseError("Missing companySummary in company context.", rawText);
  }

  if (!normalized.displayName?.trim()) {
    normalized.displayName = normalizeCompanyDisplayName(normalized.companyName);
  }

  if (!normalized.generatedAt) {
    normalized.generatedAt = new Date().toISOString();
  }

  if (normalized.limitations.length === 0) {
    normalized.limitations = [
      "Generated from JD and company fields only — no external web research.",
    ];
  }

  return normalized;
}

export function validateCompanyContextForSave(context: CompanyContext): string | null {
  if (!context.companySummary.trim()) {
    return "Company summary is required.";
  }
  if (!context.displayName.trim()) {
    return "Display name is required.";
  }
  return null;
}
