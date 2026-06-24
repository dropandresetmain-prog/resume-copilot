import type { WebsiteDiscoveryConfidence } from "@/lib/company-context/verify-website-candidate";
import { resolveEffectiveCompanyWebsite } from "@/lib/jd/extract-website";

export type GenerateOutputMode =
  | "resume_only"
  | "resume_and_cover_letter"
  | "cover_letter_only";

export type ContextPolicyKind = "jd_only" | "website_and_jd";

export type WebsiteSourceKind = "provided" | "discovered" | "search_discovered" | "none";

export type WebsiteDiscoveryPolicyState =
  | "not_applicable"
  | "pending_confirmation"
  | "confirmed"
  | "declined"
  | "no_match"
  | "unavailable";

export type GenerateContextPolicy = {
  kind: ContextPolicyKind;
  effectiveWebsite: string | null;
  websiteSource: WebsiteSourceKind;
  allowSavedWebsiteContext: boolean;
  runWebsiteResearch: boolean;
  needsCompanyContext: boolean;
  discoveryState: WebsiteDiscoveryPolicyState;
  summaryHeadline: string;
  summaryDetail: string;
};

export type DiscoveredWebsitePolicyInput = {
  url: string;
  confidence: WebsiteDiscoveryConfidence;
  userConfirmed: boolean;
  userDeclined: boolean;
};

function needsCompanyContextForMode(mode: GenerateOutputMode): boolean {
  return mode === "resume_and_cover_letter" || mode === "cover_letter_only";
}

function resolveDiscoveredWebsitePolicy(
  discovered: DiscoveredWebsitePolicyInput,
): {
  useWebsite: boolean;
  discoveryState: WebsiteDiscoveryPolicyState;
  headline: string;
  detail: string;
} {
  if (discovered.userDeclined) {
    return {
      useWebsite: false,
      discoveryState: "declined",
      headline: "JD-only context",
      detail: "Using job-description context only — discovered website not used.",
    };
  }

  if (discovered.confidence === "high") {
    return {
      useWebsite: true,
      discoveryState: "confirmed",
      headline: "Website + job description",
      detail: `Found likely company website (${discovered.url.replace(/^https?:\/\//, "")}) — using website + JD.`,
    };
  }

  if (discovered.confidence === "medium" && discovered.userConfirmed) {
    return {
      useWebsite: true,
      discoveryState: "confirmed",
      headline: "Website + job description",
      detail: `Confirmed company website (${discovered.url.replace(/^https?:\/\//, "")}) — using website + JD.`,
    };
  }

  if (discovered.confidence === "medium") {
    return {
      useWebsite: false,
      discoveryState: "pending_confirmation",
      headline: "Possible website found",
      detail: "Confirm the discovered website or choose JD-only before generating.",
    };
  }

  return {
    useWebsite: false,
    discoveryState: "no_match",
    headline: "JD-only context",
    detail: "No reliable website found. Using JD-only context.",
  };
}

/**
 * Automatic, explainable research/context policy for the Generate composer.
 * JD-only never reuses saved website-backed context.
 */
export function resolveGenerateContextPolicy(options: {
  confidentialPosting: boolean;
  companyWebsiteInput?: string;
  jobDescriptionText?: string;
  outputMode: GenerateOutputMode;
  forceJdOnly?: boolean;
  discoveredWebsite?: DiscoveredWebsitePolicyInput | null;
}): GenerateContextPolicy {
  const needsCompanyContext = needsCompanyContextForMode(options.outputMode);
  const { website, source } = resolveEffectiveCompanyWebsite({
    userProvided: options.companyWebsiteInput,
    jobDescriptionText: options.jobDescriptionText,
  });

  if (options.confidentialPosting || options.forceJdOnly) {
    return {
      kind: "jd_only",
      effectiveWebsite: null,
      websiteSource: "none",
      allowSavedWebsiteContext: false,
      runWebsiteResearch: false,
      needsCompanyContext,
      discoveryState: options.confidentialPosting ? "not_applicable" : "declined",
      summaryHeadline: "JD-only context",
      summaryDetail: options.confidentialPosting
        ? "Confidential/recruitment posting — job description only. No website research or saved website context."
        : "Using job-description context only for this application.",
    };
  }

  if (website) {
    const websiteLabel =
      source === "provided" ? "provided company website" : "company website found in JD";
    return {
      kind: "website_and_jd",
      effectiveWebsite: website,
      websiteSource: source,
      allowSavedWebsiteContext: true,
      runWebsiteResearch: needsCompanyContext,
      needsCompanyContext,
      discoveryState: "not_applicable",
      summaryHeadline: "Website + job description",
      summaryDetail: `Uses ${websiteLabel} with the job description for company context.`,
    };
  }

  if (options.discoveredWebsite) {
    const discoveredPolicy = resolveDiscoveredWebsitePolicy(options.discoveredWebsite);
    if (discoveredPolicy.useWebsite) {
      return {
        kind: "website_and_jd",
        effectiveWebsite: options.discoveredWebsite.url,
        websiteSource: "search_discovered",
        allowSavedWebsiteContext: true,
        runWebsiteResearch: needsCompanyContext,
        needsCompanyContext,
        discoveryState: discoveredPolicy.discoveryState,
        summaryHeadline: discoveredPolicy.headline,
        summaryDetail: discoveredPolicy.detail,
      };
    }

    return {
      kind: "jd_only",
      effectiveWebsite: null,
      websiteSource: "none",
      allowSavedWebsiteContext: false,
      runWebsiteResearch: false,
      needsCompanyContext,
      discoveryState: discoveredPolicy.discoveryState,
      summaryHeadline: discoveredPolicy.headline,
      summaryDetail: discoveredPolicy.detail,
    };
  }

  return {
    kind: "jd_only",
    effectiveWebsite: null,
    websiteSource: "none",
    allowSavedWebsiteContext: false,
    runWebsiteResearch: false,
    needsCompanyContext,
    discoveryState: "not_applicable",
    summaryHeadline: "JD-only context",
    summaryDetail: needsCompanyContext
      ? "No company website — cover letter uses job-description context only (no website research)."
      : "No company website — resume tailored from job description only.",
  };
}

export function formatContextPolicyWebsiteLine(
  policy: GenerateContextPolicy,
): string | null {
  if (!policy.effectiveWebsite) {
    return null;
  }

  if (policy.websiteSource === "provided") {
    return `Company website: ${policy.effectiveWebsite}`;
  }

  if (policy.websiteSource === "search_discovered") {
    return `Company website (discovered): ${policy.effectiveWebsite}`;
  }

  return `Company website (from JD): ${policy.effectiveWebsite}`;
}

export function canGenerateWithDiscoveryPolicy(policy: GenerateContextPolicy): boolean {
  return policy.discoveryState !== "pending_confirmation";
}
