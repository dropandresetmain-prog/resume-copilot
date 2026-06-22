import { generateMockResumeDraft } from "../src/lib/ai/resume-draft-mock";
import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../src/lib/resume-draft/payload";
import {
  getHardBlockValidationErrors,
  MAX_BULLETS_PER_ROLE,
  MAX_WORK_EXPERIENCE_ROLES,
  MIN_BULLETS_PER_ROLE,
  prepareGeneratedResumeContent,
  TARGET_TOTAL_WORK_BULLETS_MAX,
  TARGET_TOTAL_WORK_BULLETS_MIN,
} from "../src/lib/resume-draft/generation-validation";
import { repairGeneratedResumeContent } from "../src/lib/resume-draft/repair-generated-content";
import { RESUME_STRUCTURE_NEEDS_REVIEW_FLAG } from "../src/lib/resume-draft/repair-generated-content";
import type { ResumeDraftContent, ResumeDraftExperienceBullet } from "../src/types/resume-draft";
import type { InventoryState } from "../src/types/resume";
import type { StoredJobDescription } from "../src/types/jd";

const sampleJd: StoredJobDescription = {
  id: "jd-1",
  rawText:
    "B2B Sales Manager. Acquire FMCG customers. Stakeholder management. Revenue growth. CRM pipeline.",
  companyName: "ShelfPerfect",
  roleTitle: "B2B Sales Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function sampleBullet(text: string, scoreBoost = 0): ResumeDraftExperienceBullet {
  return {
    text,
    sourceRefs: scoreBoost > 0 ? [{ resumeId: "resume-1", bulletKey: `bullet-${scoreBoost}` }] : [],
    jdAlignmentReason: scoreBoost > 0 ? "Aligned to B2B sales and FMCG customer acquisition." : undefined,
    confidence: scoreBoost > 0 ? "high" : "low",
    riskFlags: [],
  };
}

function buildRole(company: string, bulletCount: number, relevance = 0) {
  return {
    company,
    role: "Founder",
    dateRange: "Apr 2025 – Present",
    bullets: Array.from({ length: bulletCount }, (_, index) =>
      sampleBullet(`${company}: Sales bullet ${index + 1} with revenue growth`, relevance + index),
    ),
    riskFlags: [],
  };
}

function buildValidSkeleton(overrides: Partial<ResumeDraftContent> = {}): ResumeDraftContent {
  return {
    schemaVersion: 1,
    header: { includeHeader: false },
    professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
    skills: {
      groups: [
        { label: "Skills", items: ["CRM", "B2B Sales"] },
        { label: "Languages", items: ["English"] },
        { label: "Interests", items: ["Fitness"] },
      ],
      jdAlignment: [],
      riskFlags: [],
    },
    experience: [
      buildRole("ShelfPerfect Target", 3, 5),
      buildRole("Socius Living", 3, 4),
      buildRole("Singapore Business Federation", 3, 3),
      buildRole("Roland Berger", 3, 2),
    ],
    education: [],
    additionalExperience: [],
    globalRiskFlags: [],
    ...overrides,
  };
}

function buildInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: ["English"],
          technicalSkills: ["CRM"],
          interests: ["Fitness"],
          other: [],
          rawText: "",
          parseWarnings: [],
        },
        unparsedSections: [],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
  };
}

function main() {
  const inventory = buildInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0]!,
  });
  const mockDraft = generateMockResumeDraft(generationInput);

  const fiveRoles = buildValidSkeleton({
    experience: [
      buildRole("Drop & Reset", 6, 6),
      buildRole("Socius Living", 3, 5),
      buildRole("Singapore Business Federation", 3, 4),
      buildRole("Roland Berger", 3, 3),
      buildRole("Baycurrent Consulting", 3, 2),
    ],
  });

  const sixBulletsRole = buildValidSkeleton({
    experience: [buildRole("Drop & Reset", 6, 6), buildRole("Socius Living", 3, 4)],
  });

  const tooManyTotalBullets = buildValidSkeleton({
    experience: [
      buildRole("Drop & Reset", 4, 6),
      buildRole("Socius Living", 4, 5),
      buildRole("Singapore Business Federation", 4, 4),
      buildRole("Roland Berger", 4, 3),
    ],
  });

  const underfilled = buildValidSkeleton({
    experience: [buildRole("Drop & Reset", 2, 5), buildRole("Socius Living", 2, 4)],
  });

  const noWorkExperience = buildValidSkeleton({ experience: [] });

  const repairedFiveRoles = prepareGeneratedResumeContent(fiveRoles, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const repairedSixBullets = prepareGeneratedResumeContent(sixBulletsRole, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const repairedTooManyTotal = prepareGeneratedResumeContent(tooManyTotalBullets, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const repairedUnderfilled = prepareGeneratedResumeContent(underfilled, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const repairedNoExperience = prepareGeneratedResumeContent(noWorkExperience, {
    jdText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });

  const dropRole = repairedFiveRoles.content.experience.find((role) => role.company === "Drop & Reset");
  const additionalHasBaycurrent = repairedFiveRoles.content.additionalExperience.some((item) =>
    item.text.includes("Baycurrent"),
  );

  const checks: [string, boolean][] = [
    ["mock draft still passes validation", mockDraft.content.experience.length <= MAX_WORK_EXPERIENCE_ROLES],
    [
      "5 roles repaired to 4 roles",
      fiveRoles.experience.length === 5 &&
        repairedFiveRoles.content.experience.length === MAX_WORK_EXPERIENCE_ROLES,
    ],
    [
      "dropped role moved to additional experience",
      additionalHasBaycurrent,
    ],
    [
      "6 bullets in one role repaired to 4",
      sixBulletsRole.experience[0]!.bullets.length === 6 &&
        repairedSixBullets.content.experience[0]!.bullets.length === MAX_BULLETS_PER_ROLE,
    ],
    [
      "total bullets over 13 repaired to 13",
      tooManyTotalBullets.experience.reduce((total, role) => total + role.bullets.length, 0) > 13 &&
        repairedTooManyTotal.content.experience.reduce((total, role) => total + role.bullets.length, 0) <=
          TARGET_TOTAL_WORK_BULLETS_MAX,
    ],
    [
      "under 12 bullets allowed with warning",
      repairedUnderfilled.content.experience.reduce((total, role) => total + role.bullets.length, 0) <
        TARGET_TOTAL_WORK_BULLETS_MIN &&
        repairedUnderfilled.repairActions.includes("allowed_underfilled_work_experience"),
    ],
    [
      "repair warnings in rationale-ready messages",
      repairedFiveRoles.repairMessages.some((message) => message.includes("Reduced Work Experience")),
    ],
    [
      "repair sets needs review status",
      repairedFiveRoles.draftStatus === "needs_review",
    ],
    [
      "repair adds structure review risk flag",
      repairedFiveRoles.content.globalRiskFlags.includes(RESUME_STRUCTURE_NEEDS_REVIEW_FLAG),
    ],
    [
      "no work experience still hard fails",
      getHardBlockValidationErrors(repairedNoExperience.validation).some(
        (issue) => issue.code === "no_work_experience",
      ),
    ],
    [
      "repaired draft has no hard block errors",
      getHardBlockValidationErrors(repairedFiveRoles.validation).length === 0,
    ],
    [
      "repair helper trims drop and reset role",
      dropRole?.bullets.length === MAX_BULLETS_PER_ROLE,
    ],
    [
      "repair does not mutate source inventory object",
      inventory.resumes.length === 1 && inventory.resumes[0]!.workExperiences.length === 0,
    ],
    [
      "each kept role has at least min bullets when possible",
      repairedSixBullets.content.experience.every(
        (role) => role.bullets.length >= MIN_BULLETS_PER_ROLE,
      ),
    ],
    [
      "direct repair helper exposes actions",
      repairGeneratedResumeContent(fiveRoles, { jdText: sampleJd.rawText }).repairActions.includes(
        "dropped_excess_role",
      ),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume generation repair checks passed.");
}

main();
