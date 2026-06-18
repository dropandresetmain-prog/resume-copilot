export type ExperienceDuration = {
  startDate?: string;
  endDate?: string;
  totalMonths?: number;
  display?: string;
  parseWarning?: string;
};

export type ParsedBullet = {
  id: string;
  parentId: string;
  keyword: string;
  description: string;
  rawBulletText: string;
};

export type ParsedExperience = {
  id: string;
  sourceResumeId: string;
  company: string;
  descriptor: string;
  location: string;
  role: string;
  dateRange: string;
  experienceDuration?: ExperienceDuration;
  rawHeader: string;
  rawRoleLine: string;
  bullets: ParsedBullet[];
};

export type ParsedEducationItem = {
  id: string;
  sourceResumeId: string;
  institution: string;
  location?: string;
  programmes: string[];
  dateRange?: string;
  experienceDuration?: ExperienceDuration;
  bullets: string[];
  rawText: string;
  parseWarnings: string[];
};

export type ParsedTextSection = {
  id: string;
  sourceResumeId: string;
  title: string;
  lines: string[];
  rawText: string;
  parseWarnings: string[];
};

export type ParsedUnparsedSection = {
  id: string;
  sourceResumeId: string;
  title: string;
  originalHeader: string;
  lines: string[];
  rawText: string;
  parseWarnings: string[];
};

export type ParsedSkillsSection = {
  id: string;
  sourceResumeId: string;
  languages: string[];
  technicalSkills: string[];
  interests: string[];
  other: string[];
  rawText: string;
  parseWarnings: string[];
};

export type ParsedResume = {
  id: string;
  filename: string;
  uploadedAt: string;
  workExperiences: ParsedExperience[];
  education: ParsedEducationItem[];
  additionalExperience: ParsedTextSection;
  skills: ParsedSkillsSection;
  unparsedSections: ParsedUnparsedSection[];
  parseWarnings: string[];
};

export type ParseFailure = {
  filename: string;
  message: string;
};

export type InventoryState = {
  resumes: ParsedResume[];
  failures: ParseFailure[];
};

export const INVENTORY_SCHEMA_VERSION = 1 as const;

export type PersistedInventory = {
  schemaVersion: typeof INVENTORY_SCHEMA_VERSION;
  savedAt: string;
  inventory: InventoryState;
};

export type ExportedInventory = {
  schemaVersion: typeof INVENTORY_SCHEMA_VERSION;
  exportedAt: string;
  inventory: InventoryState;
};
