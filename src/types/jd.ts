export type JobDescriptionInput = {
  rawText: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
};

export type StoredJobDescription = {
  id: string;
  /** Source of truth for future resume/cover letter generation. */
  rawText: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export const JD_STORAGE_SCHEMA_VERSION = 1;

export type PersistedJobDescriptions = {
  schemaVersion: number;
  savedAt: string;
  jobDescriptions: StoredJobDescription[];
};
