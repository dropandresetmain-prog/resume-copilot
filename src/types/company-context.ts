export type CompanyContextConfidence = "low" | "medium" | "high";

export type CompanyResearchSourceType = "firecrawl" | "jd" | "manual" | "fallback";

export type CompanyResearchSource = {
  type: CompanyResearchSourceType;
  url?: string;
  title?: string;
  retrievedAt?: string;
  success: boolean;
  error?: string;
};

export type CompanyContextSourceType =
  | "website_research"
  | "jd_based_context"
  | "manual";

export type CompanyNarrativeAngle = {
  angle: string;
  relevance: string;
  supportingStories?: string[];
  avoidOveremphasizing?: string[];
};

export type CompanyContext = {
  companyName: string;
  displayName: string;
  country?: string;
  website?: string;

  sourceType?: CompanyContextSourceType;
  sources?: CompanyResearchSource[];

  companySummary: string;
  industry?: string;
  businessModel?: string;
  productsAndServices: string[];
  customers?: string[];

  mission?: string;
  vision?: string;
  coreValues?: string[];

  likelyHiringPriorities: string[];
  whyThisRoleMayMatter?: string;

  suggestedNarrativeAngles: CompanyNarrativeAngle[];

  confidence: CompanyContextConfidence;
  limitations: string[];
  generatedAt: string;

  /** @deprecated legacy v0.9.0 field */
  summary?: string;
  /** @deprecated legacy v0.9.0 field */
  products?: string[];
  /** @deprecated legacy v0.9.0 field */
  hiringSignals?: string[];
  recentDevelopments?: string[];
  sourceUrls?: string[];
};

export type CompanyContextInput = {
  companyName: string;
  country?: string;
  website?: string;
  jobDescriptionText: string;
  roleTitle?: string;
  additionalInstructions?: string;
};

export type CompanyResearchMode = "website_backed" | "jd_fallback" | "jd_only";

export type CompanyContextGenerationRequest = {
  jobDescriptionId?: string;
  jobDescriptionText: string;
  companyName: string;
  country?: string;
  website?: string;
  roleTitle?: string;
  additionalInstructions?: string;
  websiteScrapeMarkdown?: string;
  websiteScrapeTitle?: string;
  researchMode?: CompanyResearchMode;
};

export type CompanyContextGenerationResponse = CompanyContext & {
  provider: string;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  timestamp: string;
  firecrawlUsed?: boolean;
  researchWarning?: string;
};
