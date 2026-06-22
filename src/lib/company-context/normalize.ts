import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import type {
  CompanyContext,
  CompanyNarrativeAngle,
  CompanyContextConfidence,
} from "@/types/company-context";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function readNarrativeAngles(value: unknown): CompanyNarrativeAngle[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isObject)
    .map((item) => ({
      angle: typeof item.angle === "string" ? item.angle : "",
      relevance: typeof item.relevance === "string" ? item.relevance : "",
      supportingStories: readStringArray(item.supportingStories),
      avoidOveremphasizing: readStringArray(item.avoidOveremphasizing),
    }))
    .filter((item) => item.angle.trim().length > 0);
}

function readConfidence(value: unknown): CompanyContextConfidence {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

/** Normalize legacy or partial JSON into the v0.9.3 CompanyContext shape. */
export function normalizeCompanyContext(
  value: unknown,
  fallback?: { companyName?: string; country?: string; website?: string },
): CompanyContext | null {
  if (!isObject(value)) {
    return null;
  }

  const rawName =
    (typeof value.companyName === "string" && value.companyName) ||
    fallback?.companyName ||
    "the company";
  const displayName =
    (typeof value.displayName === "string" && value.displayName.trim()) ||
    normalizeCompanyDisplayName(rawName);
  const companySummary =
    (typeof value.companySummary === "string" && value.companySummary.trim()) ||
    (typeof value.summary === "string" && value.summary.trim()) ||
    "";

  if (!companySummary) {
    return null;
  }

  const productsAndServices = readStringArray(value.productsAndServices);
  const legacyProducts = readStringArray(value.products);
  const likelyHiringPriorities =
    readStringArray(value.likelyHiringPriorities).length > 0
      ? readStringArray(value.likelyHiringPriorities)
      : readStringArray(value.hiringSignals);

  return {
    companyName: rawName,
    displayName,
    country:
      (typeof value.country === "string" && value.country) || fallback?.country,
    website:
      (typeof value.website === "string" && value.website) || fallback?.website,
    companySummary,
    industry: typeof value.industry === "string" ? value.industry : undefined,
    businessModel:
      typeof value.businessModel === "string" ? value.businessModel : undefined,
    productsAndServices:
      productsAndServices.length > 0 ? productsAndServices : legacyProducts,
    customers: readStringArray(value.customers),
    mission: typeof value.mission === "string" ? value.mission : undefined,
    vision: typeof value.vision === "string" ? value.vision : undefined,
    coreValues: readStringArray(value.coreValues),
    likelyHiringPriorities,
    whyThisRoleMayMatter:
      typeof value.whyThisRoleMayMatter === "string"
        ? value.whyThisRoleMayMatter
        : undefined,
    suggestedNarrativeAngles: readNarrativeAngles(value.suggestedNarrativeAngles),
    confidence: readConfidence(value.confidence),
    limitations: readStringArray(value.limitations),
    generatedAt:
      typeof value.generatedAt === "string"
        ? value.generatedAt
        : new Date().toISOString(),
    summary: typeof value.summary === "string" ? value.summary : undefined,
    products: legacyProducts.length > 0 ? legacyProducts : undefined,
    hiringSignals:
      readStringArray(value.hiringSignals).length > 0
        ? readStringArray(value.hiringSignals)
        : undefined,
    recentDevelopments: readStringArray(value.recentDevelopments),
    sourceUrls: readStringArray(value.sourceUrls),
  };
}

export function hasUsableCompanyContext(
  context: CompanyContext | null | undefined,
): context is CompanyContext {
  return Boolean(context?.companySummary?.trim());
}

export function formatCompanyContextForPrompt(context: CompanyContext): string {
  return JSON.stringify(
    {
      displayName: context.displayName,
      country: context.country,
      website: context.website,
      companySummary: context.companySummary,
      industry: context.industry,
      businessModel: context.businessModel,
      productsAndServices: context.productsAndServices,
      customers: context.customers,
      mission: context.mission,
      vision: context.vision,
      coreValues: context.coreValues,
      likelyHiringPriorities: context.likelyHiringPriorities,
      whyThisRoleMayMatter: context.whyThisRoleMayMatter,
      suggestedNarrativeAngles: context.suggestedNarrativeAngles,
      confidence: context.confidence,
      limitations: context.limitations,
    },
    null,
    2,
  );
}
