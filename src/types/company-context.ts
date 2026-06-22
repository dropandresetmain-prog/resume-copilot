export type CompanyContextConfidence = "low" | "medium" | "high";

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

export type CompanyContextGenerationRequest = {
  jobDescriptionId?: string;
  jobDescriptionText: string;
  companyName: string;
  country?: string;
  website?: string;
  roleTitle?: string;
  additionalInstructions?: string;
};

export type CompanyContextGenerationResponse = CompanyContext & {
  provider: string;
  isMock: boolean;
  providerLabel: string;
  modelName?: string;
  timestamp: string;
};
