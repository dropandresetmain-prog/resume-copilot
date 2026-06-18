import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import { buildCollatedInventory } from "@/lib/inventory/collation";
import { buildReferenceResumeFormatProfile } from "@/lib/resume-draft/reference-format";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentState, KeywordBankItem } from "@/types/enrichment";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState, ParsedResume } from "@/types/resume";
import {
  RESUME_DRAFT_SCHEMA_VERSION,
  type ResumeDraftGenerationInput,
  type ResumeDraftInputSnapshot,
  type ResumeDraftKeywordInput,
} from "@/types/resume-draft";

export const MAX_RESUME_DRAFT_BULLETS = 40;

export function filterApprovedKeywords(
  enrichment: EnrichmentState,
): KeywordBankItem[] {
  return enrichment.keywordBank.filter((item) => item.approved);
}

function toKeywordInput(item: KeywordBankItem): ResumeDraftKeywordInput {
  return {
    id: item.id,
    keyword: item.keyword,
    category: item.category,
  };
}

export function buildResumeDraftGenerationInput(options: {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  jobDescription: StoredJobDescription;
  referenceResume: ParsedResume;
  maxBullets?: number;
}): ResumeDraftGenerationInput {
  const maxBullets = options.maxBullets ?? MAX_RESUME_DRAFT_BULLETS;
  const approvedKeywords = filterApprovedKeywords(options.enrichment).map(toKeywordInput);

  const experiences: ResumeDraftGenerationInput["experiences"] = [];
  let bulletCount = 0;

  for (const experience of options.collated.experiences) {
    const bullets = [];
    for (const bullet of experience.bullets) {
      if (bulletCount >= maxBullets) {
        break;
      }
      bullets.push({
        bulletKey: buildBulletEnrichmentKey(
          experience.company,
          experience.role,
          bullet.description,
        ),
        collatedBulletId: bullet.id,
        company: experience.company,
        role: experience.role,
        keyword: bullet.keyword,
        description: bullet.description,
        rawTexts: bullet.rawTexts,
        sourceCitations: bullet.sourceCitations,
      });
      bulletCount += 1;
    }

    if (bullets.length > 0) {
      experiences.push({
        collatedExperienceId: experience.id,
        company: experience.company,
        role: experience.role,
        location: experience.location,
        dateRange: experience.dateRange,
        sourceCitations: experience.sourceCitations,
        bullets,
      });
    }

    if (bulletCount >= maxBullets) {
      break;
    }
  }

  return {
    jobDescription: {
      id: options.jobDescription.id,
      rawText: options.jobDescription.rawText,
      companyName: options.jobDescription.companyName,
      roleTitle: options.jobDescription.roleTitle,
      jobUrl: options.jobDescription.jobUrl,
    },
    approvedKeywords,
    experiences,
    education: options.collated.educationItems.map((item) => ({
      institution: item.institution,
      programmes: item.programmes,
      dateRange: item.dateRange,
      bullets: item.bullets,
      sourceCitations: item.sourceCitations,
    })),
    additionalExperience: options.collated.additionalExperienceItems.map((item) => ({
      category: item.category,
      text: item.text,
      sourceCitations: item.sourceCitations,
    })),
    skills: options.collated.skillItems.map((item) => ({
      category: item.category,
      text: item.text,
      sourceCitations: item.sourceCitations,
    })),
    referenceResume: buildReferenceResumeFormatProfile(options.referenceResume),
  };
}

export function buildResumeDraftInputSnapshot(options: {
  jobDescription: StoredJobDescription;
  referenceResume: ParsedResume;
  enrichment: EnrichmentState;
  collated: CollatedInventory;
  generatedAtRequest?: string;
}): ResumeDraftInputSnapshot {
  const approved = filterApprovedKeywords(options.enrichment);
  const bulletCount = options.collated.experiences.reduce(
    (total, experience) => total + experience.bullets.length,
    0,
  );

  return {
    schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
    jobDescriptionId: options.jobDescription.id,
    referenceResumeId: options.referenceResume.id,
    referenceResumeFilename: options.referenceResume.filename,
    approvedKeywordIds: approved.map((item) => item.id),
    approvedKeywords: approved.map((item) => item.keyword),
    collatedSummary: {
      experienceCount: options.collated.experiences.length,
      bulletCount,
      educationCount: options.collated.educationItems.length,
      skillCount: options.collated.skillItems.length,
    },
    generatedAtRequest: options.generatedAtRequest ?? new Date().toISOString(),
  };
}

export function buildResumeDraftPayloadFromInventory(options: {
  inventory: InventoryState;
  jobDescription: StoredJobDescription;
  referenceResumeId: string;
  maxBullets?: number;
}): {
  generationInput: ResumeDraftGenerationInput;
  inputSnapshot: ResumeDraftInputSnapshot;
  approvedKeywordCount: number;
} {
  const referenceResume = options.inventory.resumes.find(
    (resume) => resume.id === options.referenceResumeId,
  );
  if (!referenceResume) {
    throw new Error("Reference resume not found in inventory.");
  }

  const collated = buildCollatedInventory(options.inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: options.inventory.enrichment,
    jobDescription: options.jobDescription,
    referenceResume,
    maxBullets: options.maxBullets,
  });
  const inputSnapshot = buildResumeDraftInputSnapshot({
    jobDescription: options.jobDescription,
    referenceResume,
    enrichment: options.inventory.enrichment,
    collated,
  });

  return {
    generationInput,
    inputSnapshot,
    approvedKeywordCount: countApprovedKeywords(options.inventory.enrichment),
  };
}

export function summarizeResumeDraftContent(content: {
  professionalSummary?: { text?: string };
  skills?: { groups?: unknown[] };
  experience?: { bullets?: unknown[] }[];
  globalRiskFlags?: string[];
}): {
  hasSummary: boolean;
  skillGroupCount: number;
  experienceCount: number;
  bulletCount: number;
  riskFlagCount: number;
} {
  const experiences = content.experience ?? [];
  const bulletCount = experiences.reduce(
    (total, experience) => total + (experience.bullets?.length ?? 0),
    0,
  );
  const sectionRiskFlags = experiences.reduce(
    (total, experience) =>
      total +
      ((experience as { riskFlags?: string[] }).riskFlags?.length ?? 0) +
      ((experience.bullets ?? []) as { riskFlags?: string[] }[]).reduce(
        (bulletTotal, bullet) => bulletTotal + (bullet.riskFlags?.length ?? 0),
        0,
      ),
    0,
  );

  return {
    hasSummary: Boolean(content.professionalSummary?.text?.trim()),
    skillGroupCount: content.skills?.groups?.length ?? 0,
    experienceCount: experiences.length,
    bulletCount,
    riskFlagCount: sectionRiskFlags + (content.globalRiskFlags?.length ?? 0),
  };
}
