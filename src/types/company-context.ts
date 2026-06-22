export type CompanyContextConfidence = "low" | "medium" | "high";

export type CompanyContext = {
  companyName: string;
  country?: string;
  website?: string;
  summary?: string;
  products?: string[];
  mission?: string;
  recentDevelopments?: string[];
  hiringSignals?: string[];
  sourceUrls?: string[];
  confidence: CompanyContextConfidence;
};

export type CompanyContextInput = {
  companyName: string;
  country?: string;
  website?: string;
  jobDescriptionText: string;
  additionalInstructions?: string;
};
