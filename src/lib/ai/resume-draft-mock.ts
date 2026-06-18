import type { ResumeDraftGenerationInput } from "@/types/resume-draft";
import type { ResumeDraftGenerationResult } from "@/types/resume-draft";
import { RESUME_DRAFT_SCHEMA_VERSION } from "@/types/resume-draft";

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
    bullets: entry.bullets.slice(0, 3).map((bullet) => ({
      text: bullet.description,
      sourceRefs: bullet.sourceCitations.map((citation) => ({
        collatedBulletId: bullet.collatedBulletId,
        bulletKey: bullet.bulletKey,
        resumeId: citation.resumeId,
        filename: citation.filename,
      })),
      jdAlignmentReason: `Aligned to JD emphasis using existing inventory bullet for ${entry.role}.`,
      confidence: "high" as const,
      riskFlags: [],
    })),
    riskFlags: [],
  }));

  return {
    content: {
      schemaVersion: RESUME_DRAFT_SCHEMA_VERSION,
      targetRoleTitle: targetRole,
      header: {
        includeHeader: Boolean(input.referenceResume.preambleAndUnparsedText.trim()),
        notes: input.referenceResume.preambleAndUnparsedText.trim()
          ? "Header derived from reference resume excerpt only."
          : "No contact block found in reference resume excerpt.",
      },
      professionalSummary: {
        text: `Product and operations professional targeting ${targetRole}, drawing on verified inventory experience across ${input.experiences.length} role(s).`,
        jdAlignment: [
          `Tailored toward JD for ${input.jobDescription.companyName ?? "target company"}.`,
        ],
        riskFlags: [],
      },
      skills: {
        groups: input.skills.length
          ? [
              {
                label: "Skills",
                items: input.skills.slice(0, 12).map((skill) => skill.text),
              },
            ]
          : [],
        jdAlignment: input.approvedKeywords.slice(0, 5).map((item) => item.keyword),
        riskFlags: [],
      },
      experience,
      education: input.education.slice(0, 3).map((item) => ({
        institution: item.institution,
        programmes: item.programmes,
        dateRange: item.dateRange,
        bullets: item.bullets.slice(0, 3),
        riskFlags: [],
      })),
      additionalExperience: input.additionalExperience.slice(0, 3).map((item) => ({
        category: item.category,
        text: item.text,
        riskFlags: [],
      })),
      globalRiskFlags:
        input.approvedKeywords.length === 0
          ? ["No approved keywords were available for this draft."]
          : [],
    },
    rationale: {
      overall: "Mock draft generated from inventory bullets without modifying source data.",
      toneNotes: `Matched concise style from reference resume ${input.referenceResume.filename}.`,
      omissions: [],
      keywordUsage: input.approvedKeywords.map((item) => item.keyword),
    },
  };
}
