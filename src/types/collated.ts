import type { ExperienceDuration } from "@/types/resume";

export type SourceCitation = {
  resumeId: string;
  filename: string;
};

export type CollatedBullet = {
  id: string;
  keyword?: string;
  description: string;
  rawTexts: string[];
  sourceCitations: SourceCitation[];
};

export type CollatedExperience = {
  id: string;
  company: string;
  role: string;
  descriptor?: string;
  location?: string;
  dateRange?: string;
  experienceDuration?: ExperienceDuration;
  sourceCitations: SourceCitation[];
  bullets: CollatedBullet[];
};

export type CollatedEducationItem = {
  id: string;
  institution: string;
  location?: string;
  programmes: string[];
  dateRange?: string;
  experienceDuration?: ExperienceDuration;
  bullets: string[];
  rawTexts: string[];
  sourceCitations: SourceCitation[];
  parseWarnings: string[];
};

export type CollatedTextItem = {
  id: string;
  category?: string;
  text: string;
  rawTexts: string[];
  sourceCitations: SourceCitation[];
};

export type CollatedSkillCategory =
  | "Languages"
  | "Technical Skills"
  | "Interests"
  | "Other";

export type CollatedSkillItem = {
  id: string;
  category: CollatedSkillCategory;
  text: string;
  sourceCitations: SourceCitation[];
};

export type CollatedInventory = {
  experiences: CollatedExperience[];
  educationItems: CollatedEducationItem[];
  additionalExperienceItems: CollatedTextItem[];
  skillItems: CollatedSkillItem[];
};
