import { compactAdditionalExperience, formatKeywordBullet } from "@/lib/resume-draft/layout";
import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import type { ResumeDraftGenerationResult } from "@/types/resume-draft";
import { RESUME_DRAFT_SCHEMA_VERSION } from "@/types/resume-draft";

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
  const skillItems = input.skills
    .filter((item) => !/interest/i.test(item.category))
    .map((item) => item.text)
    .filter(Boolean);
  const interestItems = [
    ...input.skills.filter((item) => /interest/i.test(item.category)).map((item) => item.text),
    ...input.additionalExperience
      .filter((item) => /interest|hobby|language/i.test(item.category ?? item.text))
      .map((item) => item.text),
  ].filter(Boolean);

  const groups = [];
  if (skillItems.length > 0 || input.approvedKeywords.length > 0) {
    groups.push({
      label: "Skills",
      items: [
        ...input.approvedKeywords.slice(0, 8).map((item) => item.keyword),
        ...skillItems,
      ].slice(0, 12),
    });
  }
  groups.push({
    label: "Interests",
    items:
      interestItems.length > 0
        ? interestItems.slice(0, 8)
        : ["Travel", "Music", "Fitness"],
  });

  return groups;
}

export function generateMockResumeDraft(
  input: ResumeDraftGenerationInput,
): ResumeDraftGenerationResult {
  const targetRole =
    input.jobDescription.roleTitle?.trim() ||
    input.jobDescription.companyName?.trim() ||
    "Target Role";

  const experience = input.experiences.slice(0, 3).map((entry) => ({
    company: entry.company,
    role: entry.role,
    location: entry.location,
    dateRange: entry.dateRange,
    bullets: entry.bullets.slice(0, 3).map((bullet) => {
      const keyword = bullet.keyword?.trim() || "Operations";
      const statement = bullet.description.trim();
      return {
        text: formatKeywordBullet(keyword, statement),
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
    }),
    riskFlags: [],
  }));

  const additionalLine = compactAdditionalExperience(
    input.additionalExperience.map((item) => ({
      category: item.category,
      text: item.text,
      riskFlags: [],
    })),
  );

  return {
    content: {
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
    },
    rationale: {
      overall: `Draft tailored for ${targetRole} using inventory content only. Reference resume (${input.referenceResume.filename}) informed layout and bullet style.`,
      toneNotes: `Bullet style: ${input.referenceResume.bulletStyle}.`,
      omissions: [],
      keywordUsage: input.approvedKeywords.map((item) => item.keyword),
    },
  };
}
