import { mergeSpineSnapshotIntoSelectionAudit } from "@/lib/evidence/spine";
import { prepareGeneratedResumeContent } from "@/lib/resume-draft/generation-validation";
import {
  compactAdditionalExperience,
  filterAdditionalExperienceItems,
  formatKeywordBullet,
} from "@/lib/resume-draft/layout";
import { repairBulletText } from "@/lib/resume-draft/keyword-repair";
import { buildSourceBulletTextsByKey } from "@/lib/resume-draft/payload";
import { isTechnicalSkillItem, normalizeTechnicalSkillLabel } from "@/lib/resume-draft/skills-section";
import type {
  ResumeDraftGenerationInput,
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
} from "@/types/resume-draft";
import type { ResumeDraftGenerationResult } from "@/types/resume-draft";
import { RESUME_DRAFT_SCHEMA_VERSION } from "@/types/resume-draft";

const MAX_BULLETS_PRIMARY = 3;
const MAX_BULLETS_SECONDARY = 2;

function buildHeader(input: ResumeDraftGenerationInput) {
  const contact = input.referenceResume.headerContact;
  return {
    includeHeader: Boolean(contact?.fullName || contact?.email || contact?.phone),
    fullName: contact?.fullName,
    phone: contact?.phone,
    email: contact?.email,
    location: undefined,
    linkedin: undefined,
    notes: "Header layout from reference resume formatting profile only.",
  };
}

function buildSkillsGroups(input: ResumeDraftGenerationInput) {
  const inventorySkillItems = input.skills
    .filter((item) => /technical skill/i.test(item.category))
    .map((item) => item.text)
    .filter(Boolean);
  const languageItems = input.skills
    .filter((item) => /^languages$/i.test(item.category))
    .map((item) => item.text)
    .filter(Boolean);
  const interestItems = input.skills
    .filter((item) => /^interests$/i.test(item.category))
    .map((item) => item.text)
    .filter(Boolean);

  const keywordItems = input.approvedKeywords.slice(0, 8).map((item) => item.keyword);
  const technicalItems = dedupeSkillItems([
    ...inventorySkillItems,
    ...keywordItems,
  ]
    .filter(isTechnicalSkillItem)
    .map(normalizeTechnicalSkillLabel))
    .slice(0, 12);

  const groups = [];
  groups.push({ label: "Skills", items: technicalItems });
  groups.push({ label: "Languages", items: languageItems.slice(0, 8) });
  groups.push({
    label: "Interests",
    items:
      interestItems.length > 0
        ? interestItems.slice(0, 8)
        : ["Travel", "Music", "Fitness"],
  });

  return groups;
}

function dedupeSkillItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function generateMockResumeDraft(
  input: ResumeDraftGenerationInput,
): ResumeDraftGenerationResult {
  const targetRole =
    input.jobDescription.roleTitle?.trim() ||
    input.jobDescription.companyName?.trim() ||
    "Target Role";

  const experience = input.experiences.slice(0, 3).map((entry, index) => {
    const maxBullets = index === 0 ? MAX_BULLETS_PRIMARY : MAX_BULLETS_SECONDARY;
    const mappedBullets: ResumeDraftExperienceBullet[] = entry.bullets.slice(0, maxBullets).map((bullet) => {
      const keyword = bullet.keyword?.trim() || "Operations";
      const statement = bullet.acceptedWording?.trim() || bullet.description.trim();
      return {
        text: repairBulletText(formatKeywordBullet(keyword, statement)),
        sourceRefs: bullet.sourceCitations.map((citation) => ({
          collatedBulletId: bullet.collatedBulletId,
          bulletKey: bullet.bulletKey,
          resumeId: citation.resumeId,
          filename: citation.filename,
        })),
        jdAlignmentReason: `Aligned to JD emphasis for ${targetRole} using inventory bullet.`,
        confidence: "high" as const,
        riskFlags: [],
      };
    });

    if (mappedBullets.length === 1 && maxBullets >= 2) {
      const fallbackKeyword = input.approvedKeywords[0]?.keyword ?? "Operations";
      mappedBullets.push({
        text: repairBulletText(
          formatKeywordBullet(
            fallbackKeyword,
            `Applied ${fallbackKeyword.toLowerCase()} in ${entry.role} work at ${entry.company}.`,
          ),
        ),
        sourceRefs: mappedBullets[0]?.sourceRefs ?? [],
        jdAlignmentReason: `Secondary bullet aligned to JD emphasis for ${targetRole}.`,
        confidence: "medium" as const,
        riskFlags: [],
      });
    }

    return {
      company: entry.company,
      companyDescriptor: entry.companyDescriptor,
      role: entry.role,
      location: entry.location,
      dateRange: entry.dateRange,
      bullets: mappedBullets,
      riskFlags: [],
    };
  });

  const additionalItems = filterAdditionalExperienceItems(
    input.additionalExperience.map((item) => ({
      category: item.category,
      text: item.text,
      riskFlags: [],
    })),
  );
  const additionalLine = compactAdditionalExperience(additionalItems);

  const draftContent: ResumeDraftContent = {
    schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
    targetRoleTitle: targetRole,
    header: buildHeader(input),
    professionalSummary: {
      text: "",
      jdAlignment: [],
      riskFlags: [],
    },
    skills: {
      groups: buildSkillsGroups(input),
      jdAlignment: input.approvedKeywords.slice(0, 5).map((item) => item.keyword),
      riskFlags: [],
    },
    experience,
    education: input.education.slice(0, 3).map((item) => ({
      institution: item.institution,
      location: item.location,
      programmes: item.programmes,
      dateRange: item.dateRange,
      bullets: item.bullets.slice(0, 2),
      riskFlags: [],
    })),
    additionalExperience: additionalLine
      ? [{ category: "Additional Experience", text: additionalLine, riskFlags: [] }]
      : [],
    globalRiskFlags:
      input.approvedKeywords.length === 0
        ? ["No approved keywords were available for this draft."]
        : [],
  };

  const acceptedWordingUsed = input.experiences
    .flatMap((experience) => experience.bullets)
    .filter((bullet) => bullet.acceptedWording)
    .map((bullet) => bullet.bulletKey);

  const spineSelectionAudit = input.evidenceSpine
    ? mergeSpineSnapshotIntoSelectionAudit(input.evidenceSpine)
    : undefined;

  const rationale = {
    overall: `Draft tailored for ${targetRole}: prioritized JD-relevant inventory evidence with honest gap notes. Reference resume (${input.referenceResume.filename}) informed layout only.`,
    toneNotes: `Lead with ${input.auditHints?.jdTermSample?.slice(0, 2).join(" and ") || "strongest role-relevant"} proof; keep one-page discipline.`,
    omissions: spineSelectionAudit?.honestGaps ?? ([] as string[]),
    keywordUsage: input.approvedKeywords.slice(0, 5).map((item) => item.keyword),
    selectionAudit: spineSelectionAudit ?? {
      jdThemes: input.auditHints?.jdTermSample ?? [],
      strongestMatches: input.experiences
        .slice(0, 2)
        .map(
          (experience) =>
            `${experience.role} at ${experience.company} with inventory-backed bullets`,
        ),
      honestGaps: [] as string[],
      positioningAngle: `Lead with ${targetRole}-relevant outcomes from recent roles.`,
      roleSelectionRationale:
        "Work Experience roles chosen for JD overlap and senior relevance; early-career or low-relevance roles deferred to Additional Experience when present.",
      selectedBulletKeys: input.experiences.flatMap((experience) =>
        experience.bullets.map((bullet) => bullet.bulletKey),
      ),
      acceptedWordingUsed,
      approvedKeywordsUsed: input.approvedKeywords
        .filter((item) => item.overlapsJobDescription)
        .map((item) => item.keyword),
      approvedKeywordsSkipped: input.approvedKeywords
        .filter((item) => !item.overlapsJobDescription)
        .map((item) => item.keyword),
    },
  };

  const prepared = prepareGeneratedResumeContent(draftContent, {
    jdText: input.jobDescription.rawText,
    targetRoleTitle: input.jobDescription.roleTitle,
    forcedBulletKeys: input.regenerationControls?.forcedBulletKeys,
    rationale,
    sourceBulletTextsByKey: buildSourceBulletTextsByKey(input),
  });

  return {
    content: prepared.content,
    draftStatus: prepared.draftStatus,
    rationale:
      prepared.repairMessages.length > 0 || prepared.forcedBulletAudit
        ? {
            ...rationale,
            ...(prepared.forcedBulletAudit
              ? { forcedBulletAudit: prepared.forcedBulletAudit }
              : {}),
            ...(prepared.repairMessages.length > 0
              ? {
                  structureRepair: {
                    actions: prepared.repairActions,
                    messages: prepared.repairMessages,
                    needsReview: prepared.needsReview,
                  },
                }
              : {}),
          }
        : rationale,
  };
}
