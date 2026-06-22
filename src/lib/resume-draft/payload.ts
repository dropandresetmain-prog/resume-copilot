import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { countApprovedKeywords } from "@/lib/enrichment/state";
import { buildActiveCollatedInventory } from "@/lib/inventory/active-collated";
import {
  groupGenerationBulletsByExperience,
  selectGenerationBullets,
} from "@/lib/resume-draft/bullet-payload";
import { buildAcceptedWordingByBulletKey } from "@/lib/resume-draft/enrichment-wording";
import { buildReferenceResumeFormatProfile } from "@/lib/resume-draft/reference-format";
import type { CompanyContext } from "@/types/company-context";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentState, KeywordBankItem } from "@/types/enrichment";
import type { StoredJobDescription } from "@/types/jd";
import type { InventoryState, ParsedResume } from "@/types/resume";
import {
  RESUME_DRAFT_SCHEMA_VERSION,
  type ResumeDraftGenerationInput,
  type ResumeDraftInputSnapshot,
  type ResumeDraftKeywordInput,
  type ResumeDraftRegenerationControls,
} from "@/types/resume-draft";

export const MAX_RESUME_DRAFT_BULLETS = 40;

export function filterApprovedKeywords(
  enrichment: EnrichmentState,
): KeywordBankItem[] {
  return enrichment.keywordBank.filter((item) => item.approved);
}

function keywordOverlapsJobDescription(keyword: string, jdText: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return jdText.toLowerCase().includes(normalized);
}

function toKeywordInput(
  item: KeywordBankItem,
  jdText: string,
): ResumeDraftKeywordInput {
  return {
    id: item.id,
    keyword: item.keyword,
    category: item.category,
    usage: "advisory_keyword_bank",
    overlapsJobDescription: keywordOverlapsJobDescription(item.keyword, jdText),
  };
}

export function buildResumeDraftGenerationInput(options: {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  jobDescription: StoredJobDescription;
  referenceResume: ParsedResume;
  maxBullets?: number;
  regenerationControls?: ResumeDraftRegenerationControls;
  companyContext?: CompanyContext;
}): ResumeDraftGenerationInput {
  const maxBullets = options.maxBullets ?? MAX_RESUME_DRAFT_BULLETS;
  const jdText = options.jobDescription.rawText;
  const approvedKeywords = filterApprovedKeywords(options.enrichment).map((item) =>
    toKeywordInput(item, jdText),
  );
  const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(options.enrichment);
  const regenerationControls = normalizeRegenerationControls(options.regenerationControls);
  const { selected, totalBullets, jdTerms, unavailableForcedKeys } = selectGenerationBullets({
    experiences: options.collated.experiences,
    maxBullets,
    jdText,
    acceptedWordingByBulletKey,
    forcedBulletKeys: regenerationControls.forcedBulletKeys,
    excludedBulletKeys: regenerationControls.excludedBulletKeys,
  });

  const experiences: ResumeDraftGenerationInput["experiences"] =
    groupGenerationBulletsByExperience(selected).map(({ experience, bullets }) => ({
      collatedExperienceId: experience.id,
      company: experience.company,
      companyDescriptor: experience.descriptor,
      role: experience.role,
      location: experience.location,
      dateRange: experience.dateRange,
      sourceCitations: experience.sourceCitations,
      bullets: bullets.map(({ bullet, bulletKey }) => ({
        bulletKey,
        collatedBulletId: bullet.id,
        company: experience.company,
        role: experience.role,
        dateRange: experience.dateRange,
        keyword: bullet.keyword,
        description: bullet.description,
        rawTexts: bullet.rawTexts,
        acceptedWording: acceptedWordingByBulletKey.get(bulletKey),
        sourceCitations: bullet.sourceCitations,
      })),
    }));

  const bulletsWithAcceptedWording = experiences.reduce(
    (total, experience) =>
      total + experience.bullets.filter((bullet) => Boolean(bullet.acceptedWording)).length,
    0,
  );

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
      location: item.location,
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
    auditHints: {
      bulletCap: maxBullets,
      totalInventoryBullets: totalBullets,
      bulletsIncluded: selected.length,
      bulletsOmitted: Math.max(0, totalBullets - selected.length),
      bulletsWithAcceptedWording,
      jdTermSample: jdTerms.slice(0, 12),
      unavailableForcedBulletKeys: unavailableForcedKeys,
    },
    regenerationControls,
    companyContext: options.companyContext,
  };
}

function normalizeRegenerationControls(
  controls: ResumeDraftRegenerationControls | undefined,
): ResumeDraftRegenerationControls {
  if (!controls) {
    return { forcedBulletKeys: [], excludedBulletKeys: [] };
  }

  return {
    forcedBulletKeys: [
      ...new Set(controls.forcedBulletKeys.filter((key) => key.trim())),
    ],
    excludedBulletKeys: [
      ...new Set(controls.excludedBulletKeys.filter((key) => key.trim())),
    ],
  };
}

export function buildResumeDraftInputSnapshot(options: {
  jobDescription: StoredJobDescription;
  referenceResume: ParsedResume;
  enrichment: EnrichmentState;
  collated: CollatedInventory;
  regenerationControls?: ResumeDraftRegenerationControls;
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
    regenerationControls: normalizeRegenerationControls(options.regenerationControls),
    generatedAtRequest: options.generatedAtRequest ?? new Date().toISOString(),
  };
}

export function buildResumeDraftPayloadFromInventory(options: {
  inventory: InventoryState;
  jobDescription: StoredJobDescription;
  referenceResumeId: string;
  maxBullets?: number;
  regenerationControls?: ResumeDraftRegenerationControls;
  companyContext?: CompanyContext;
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

  const collated = buildActiveCollatedInventory(options.inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: options.inventory.enrichment,
    jobDescription: options.jobDescription,
    referenceResume,
    maxBullets: options.maxBullets,
    regenerationControls: options.regenerationControls,
    companyContext: options.companyContext,
  });
  const inputSnapshot = buildResumeDraftInputSnapshot({
    jobDescription: options.jobDescription,
    referenceResume,
    enrichment: options.inventory.enrichment,
    collated,
    regenerationControls: options.regenerationControls,
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

/** @internal Test helper — exposes collation-order bullet cap behavior. */
export function buildResumeDraftGenerationInputLegacyOrder(options: {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  jobDescription: StoredJobDescription;
  referenceResume: ParsedResume;
  maxBullets?: number;
}): ResumeDraftGenerationInput {
  const maxBullets = options.maxBullets ?? MAX_RESUME_DRAFT_BULLETS;
  const jdText = options.jobDescription.rawText;
  const approvedKeywords = filterApprovedKeywords(options.enrichment).map((item) =>
    toKeywordInput(item, jdText),
  );
  const acceptedWordingByBulletKey = buildAcceptedWordingByBulletKey(options.enrichment);

  const experiences: ResumeDraftGenerationInput["experiences"] = [];
  let bulletCount = 0;
  let totalBullets = 0;

  for (const experience of options.collated.experiences) {
    totalBullets += experience.bullets.length;
    const bullets = [];

    for (const bullet of experience.bullets) {
      if (bulletCount >= maxBullets) {
        break;
      }

      const bulletKey = buildBulletEnrichmentKey(
        experience.company,
        experience.role,
        bullet.description,
      );

      bullets.push({
        bulletKey,
        collatedBulletId: bullet.id,
        company: experience.company,
        role: experience.role,
        dateRange: experience.dateRange,
        keyword: bullet.keyword,
        description: bullet.description,
        rawTexts: bullet.rawTexts,
        acceptedWording: acceptedWordingByBulletKey.get(bulletKey),
        sourceCitations: bullet.sourceCitations,
      });
      bulletCount += 1;
    }

    if (bullets.length > 0) {
      experiences.push({
        collatedExperienceId: experience.id,
        company: experience.company,
        companyDescriptor: experience.descriptor,
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

  const bulletsWithAcceptedWording = experiences.reduce(
    (total, experience) =>
      total + experience.bullets.filter((bullet) => Boolean(bullet.acceptedWording)).length,
    0,
  );

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
      location: item.location,
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
    auditHints: {
      bulletCap: maxBullets,
      totalInventoryBullets: totalBullets,
      bulletsIncluded: bulletCount,
      bulletsOmitted: Math.max(0, totalBullets - bulletCount),
      bulletsWithAcceptedWording,
      jdTermSample: [],
    },
  };
}
