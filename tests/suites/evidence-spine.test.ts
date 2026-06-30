import { buildBulletEnrichmentKey } from "../../src/lib/enrichment/keys";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { applyInventoryEditsToCollated } from "../../src/lib/inventory/edits";
import { buildEvidenceSpine, mergeSpineSnapshotIntoSelectionAudit } from "../../src/lib/evidence/spine";
import { collectEvidenceItems } from "../../src/lib/evidence/collect";
import { selectGenerationBullets } from "../../src/lib/resume-draft/bullet-payload";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import type { CollatedInventory, CollatedSkillItem } from "../../src/types/collated";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";

const blockchainJd: StoredJobDescription = {
  id: "jd-1",
  rawText:
    "Product leader with blockchain fintech market entry, platform operations, and stakeholder leadership.",
  companyName: "FinCo",
  roleTitle: "Product Lead",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function buildCrossCategoryCollated(): CollatedInventory {
  return {
    experiences: [
      {
        id: "exp-low",
        company: "Legacy Corp",
        role: "Analyst",
        sourceCitations: [],
        bullets: [
          {
            id: "low-bullet",
            description: "Prepared internal reporting packs",
            rawTexts: ["Prepared internal reporting packs"],
            sourceCitations: [],
          },
        ],
      },
    ],
    educationItems: [
      {
        id: "edu-1",
        institution: "Business School",
        programmes: ["MBA Fintech and Blockchain"],
        bullets: [],
        rawTexts: [],
        sourceCitations: [],
        parseWarnings: [],
      },
    ],
    additionalExperienceItems: [
      {
        id: "add-line-1",
        category: "Projects",
        text: "Led blockchain fintech market entry pilot across APAC partners",
        rawTexts: ["Led blockchain fintech market entry pilot across APAC partners"],
        sourceCitations: [],
      },
    ],
    skillItems: [
      {
        id: "skill-1",
        category: "Technical Skills",
        text: "Blockchain platform operations",
        sourceCitations: [],
      },
    ],
  };
}

function buildSkillCategoryCollated(skillItems: CollatedSkillItem[]): CollatedInventory {
  return {
    experiences: [],
    educationItems: [],
    additionalExperienceItems: [],
    skillItems,
  };
}

function buildPerCategorySkillItems(options: {
  technical?: readonly string[];
  languages?: readonly string[];
  interests?: readonly string[];
  other?: readonly string[];
}): CollatedSkillItem[] {
  const items: CollatedSkillItem[] = [];
  for (const [index, text] of (options.technical ?? []).entries()) {
    items.push({
      id: `tech-${index}`,
      category: "Technical Skills",
      text,
      sourceCitations: [],
    });
  }
  for (const [index, text] of (options.languages ?? []).entries()) {
    items.push({
      id: `lang-${index}`,
      category: "Languages",
      text,
      sourceCitations: [],
    });
  }
  for (const [index, text] of (options.interests ?? []).entries()) {
    items.push({
      id: `interest-${index}`,
      category: "Interests",
      text,
      sourceCitations: [],
    });
  }
  for (const [index, text] of (options.other ?? []).entries()) {
    items.push({
      id: `other-${index}`,
      category: "Other",
      text,
      sourceCitations: [],
    });
  }
  return items;
}

function main() {
  const collated = buildCrossCategoryCollated();
  const enrichment = {
    ...createEmptyEnrichmentState(),
    keywordBank: [
      {
        id: "kw-1",
        keyword: "Blockchain",
        category: "market",
        approved: true,
        source: "manual",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "kw-2",
        keyword: "Generic buzzword",
        category: "market",
        approved: true,
        source: "manual",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  };
  const referenceResume = {
    id: "resume-1",
    filename: "resume.docx",
    uploadedAt: "2025-01-01T00:00:00.000Z",
    workExperiences: [],
    education: [],
    additionalExperience: {
      id: "add-1",
      sourceResumeId: "resume-1",
      title: "Additional",
      lines: [],
      rawText: "",
      parseWarnings: [],
    },
    skills: {
      id: "skills-1",
      sourceResumeId: "resume-1",
      languages: [],
      technicalSkills: [],
      interests: [],
      other: [],
      rawText: "",
      parseWarnings: [],
    },
    unparsedSections: [],
    parseWarnings: [],
  } satisfies InventoryState["resumes"][number];

  const spine = buildEvidenceSpine({
    collated,
    enrichment,
    jdText: blockchainJd.rawText,
    roleTitle: blockchainJd.roleTitle,
    maxWorkBullets: 5,
  });

  const sourceTypes = new Set(spine.ranked.map((item) => item.sourceType));
  const additionalRank = spine.ranked
    .filter((item) => item.sourceType === "additional_experience")
    .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
  const workRank = spine.ranked
    .filter((item) => item.sourceType === "work_bullet")
    .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];

  const acceptedKey = buildBulletEnrichmentKey(
    "Legacy Corp",
    "Analyst",
    "Prepared internal reporting packs",
  );
  const enrichedCollated = buildCrossCategoryCollated();
  const acceptedSpine = buildEvidenceSpine({
    collated: enrichedCollated,
    enrichment: {
      ...enrichment,
      suggestions: [
        {
          id: "s-1",
          bulletKey: acceptedKey,
          company: "Legacy Corp",
          role: "Analyst",
          issueType: "alternative_wording",
          issueTitle: "Wording",
          beforeText: "Prepared internal reporting packs",
          suggestedAfterText: "Modernized internal reporting packs",
          suggestedKeywords: [],
          suggestedCapabilities: [],
          suggestedRoleTypes: [],
          changes: [],
          rationale: "Clearer",
          riskWarnings: [],
          status: "accepted",
          acceptedWording: "Modernized internal reporting packs",
          createdAt: "2025-01-01T00:00:00.000Z",
          reviewedAt: "2025-01-02T00:00:00.000Z",
          resolution: "use_suggestion",
        },
      ],
    },
    jdText: blockchainJd.rawText,
    maxWorkBullets: 5,
  });
  const acceptedWork = acceptedSpine.ranked.find((item) => item.bulletKey === acceptedKey);

  const forcedKey = acceptedKey;
  const forcedSpine = buildEvidenceSpine({
    collated,
    enrichment,
    jdText: blockchainJd.rawText,
    maxWorkBullets: 1,
    regenerationControls: { forcedBulletKeys: [forcedKey], excludedBulletKeys: [] },
  });

  const excludedKey = buildBulletEnrichmentKey(
    "Legacy Corp",
    "Analyst",
    "Prepared internal reporting packs",
  );
  const excludedSpine = buildEvidenceSpine({
    collated,
    enrichment,
    jdText: blockchainJd.rawText,
    maxWorkBullets: 5,
    regenerationControls: { forcedBulletKeys: [], excludedBulletKeys: [excludedKey] },
  });

  const conflictSpine = buildEvidenceSpine({
    collated,
    enrichment,
    jdText: blockchainJd.rawText,
    maxWorkBullets: 5,
    regenerationControls: { forcedBulletKeys: [forcedKey], excludedBulletKeys: [forcedKey] },
  });

  const modelWeakenedAudit = mergeSpineSnapshotIntoSelectionAudit(forcedSpine.snapshot, {
    strongestMatches: ["Model-provided match that should not win"],
    selectedBulletKeys: [],
  });

  const duplicateCollated: CollatedInventory = {
    experiences: [
      {
        id: "exp-dup",
        company: "Ops Co",
        role: "Lead",
        dateRange: "2022 - Present",
        sourceCitations: [],
        bullets: [
          {
            id: "b1",
            description: "Led blockchain fintech market entry across APAC",
            rawTexts: ["Led blockchain fintech market entry across APAC"],
            sourceCitations: [],
          },
          {
            id: "b2",
            description: "Led blockchain fintech market entry across APAC region",
            rawTexts: ["Led blockchain fintech market entry across APAC region"],
            sourceCitations: [],
          },
        ],
      },
    ],
    educationItems: [],
    additionalExperienceItems: [],
    skillItems: [],
  };
  const duplicateSpine = buildEvidenceSpine({
    collated: duplicateCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: blockchainJd.rawText,
    maxWorkBullets: 5,
  });
  const dupItems = duplicateSpine.ranked.filter((item) => item.sourceType === "work_bullet");

  const advisoryOnly = collectEvidenceItems({
    collated: { experiences: [], educationItems: [], additionalExperienceItems: [], skillItems: [] },
    enrichment,
    jdText: blockchainJd.rawText,
  }).filter((item) => item.sourceType === "keyword_tied");

  const hiddenCollated = buildCrossCategoryCollated();
  const hiddenActive = applyInventoryEditsToCollated(hiddenCollated, {
    hiddenBulletKeys: [excludedKey],
    editedBulletTextByBulletKey: {},
  });
  const hiddenPayload = buildResumeDraftGenerationInput({
    collated: hiddenActive,
    enrichment,
    jobDescription: blockchainJd,
    referenceResume,
    maxBullets: 5,
  });

  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment,
    jobDescription: blockchainJd,
    referenceResume,
    maxBullets: 5,
  });

  const languageJd: StoredJobDescription = {
    ...blockchainJd,
    rawText: "Bilingual product leader with Mandarin fluency and stakeholder leadership.",
  };
  const fourLanguageCollated = buildSkillCategoryCollated(
    buildPerCategorySkillItems({
      languages: ["English", "Mandarin", "Japanese", "French"],
    }),
  );
  const fourLanguageSpine = buildEvidenceSpine({
    collated: fourLanguageCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: languageJd.rawText,
    maxWorkBullets: 5,
  });
  const fourLanguagePayload = buildResumeDraftGenerationInput({
    collated: fourLanguageCollated,
    enrichment: createEmptyEnrichmentState(),
    jobDescription: languageJd,
    referenceResume,
    maxBullets: 5,
  });

  const sixLanguageCollated = buildSkillCategoryCollated(
    buildPerCategorySkillItems({
      languages: ["English", "Mandarin", "Japanese", "French", "Spanish", "German"],
    }),
  );
  const sixLanguageSpine = buildEvidenceSpine({
    collated: sixLanguageCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: languageJd.rawText,
    maxWorkBullets: 5,
  });
  const sixLanguagePayload = buildResumeDraftGenerationInput({
    collated: sixLanguageCollated,
    enrichment: createEmptyEnrichmentState(),
    jobDescription: languageJd,
    referenceResume,
    maxBullets: 5,
  });

  const mixedSkillCollated = buildSkillCategoryCollated(
    buildPerCategorySkillItems({
      technical: ["SQL", "Python", "Tableau", "Figma", "Jira"],
      languages: ["English", "Mandarin", "Japanese", "French", "Spanish"],
      interests: ["Cycling", "Chess", "Photography", "Volunteering", "Reading", "Hiking"],
    }),
  );
  const mixedSkillSpine = buildEvidenceSpine({
    collated: mixedSkillCollated,
    enrichment: createEmptyEnrichmentState(),
    jdText: languageJd.rawText,
    maxWorkBullets: 5,
  });
  const mixedSkillPayload = buildResumeDraftGenerationInput({
    collated: mixedSkillCollated,
    enrichment: createEmptyEnrichmentState(),
    jobDescription: languageJd,
    referenceResume,
    maxBullets: 5,
  });
  const mixedSkillCollatedSnapshot = JSON.stringify(mixedSkillCollated);

  const rankedLanguageTexts = mixedSkillSpine.ranked
    .filter((item) => item.sourceType === "skill" && item.displayLabel.startsWith("Languages:"))
    .map((item) => item.originalText);
  const selectedLanguageTexts = mixedSkillPayload.skills
    .filter((item) => item.category === "Languages")
    .map((item) => item.text);
  const expectedTopLanguages = rankedLanguageTexts.slice(0, 5);

  const otherSkillCollated = buildSkillCategoryCollated(
    buildPerCategorySkillItems({
      technical: ["SQL"],
      other: ["PMP", "Six Sigma", "Change Management"],
    }),
  );
  const otherSkillPayload = buildResumeDraftGenerationInput({
    collated: otherSkillCollated,
    enrichment: createEmptyEnrichmentState(),
    jobDescription: languageJd,
    referenceResume,
    maxBullets: 5,
  });

  const checks: [string, boolean][] = [
    ["spine ranks work bullets", sourceTypes.has("work_bullet")],
    ["spine ranks additional experience", sourceTypes.has("additional_experience")],
    ["spine ranks education", sourceTypes.has("education")],
    ["spine ranks skills", sourceTypes.has("skill")],
    [
      "jd-relevant additional outranks low-relevant work bullet",
      Boolean(additionalRank && workRank && additionalRank.relevanceScore > workRank.relevanceScore),
    ],
    ["accepted wording boosts work bullet score", (acceptedWork?.relevanceScore ?? 0) >= 1000],
    [
      "forced bullet stays in shortlist under tight cap",
      forcedSpine.workBulletSelections.some((item) => item.bulletKey === forcedKey),
    ],
    [
      "excluded bullet omitted from work selections",
      !excludedSpine.workBulletSelections.some((item) => item.bulletKey === excludedKey),
    ],
    [
      "excluded beats forced when same bullet key is in both lists",
      !conflictSpine.workBulletSelections.some((item) => item.bulletKey === forcedKey) &&
        !conflictSpine.ranked.some(
          (item) => item.sourceType === "work_bullet" && item.bulletKey === forcedKey,
        ),
    ],
    [
      "merge restores spine selectedBulletKeys when model audit is incomplete",
      modelWeakenedAudit.selectedBulletKeys.includes(forcedKey) &&
        modelWeakenedAudit.selectedBulletKeys.length > 0,
    ],
    [
      "merge keeps spine strongestMatches over model selectionAudit",
      modelWeakenedAudit.strongestMatches.join("|") ===
        forcedSpine.snapshot.strongestMatches.join("|"),
    ],
    [
      "redundant bullet demoted below near-duplicate",
      dupItems.length === 2 && dupItems[1]!.relevanceScore < dupItems[0]!.relevanceScore,
    ],
    [
      "bank-only keyword not in keyword_tied proof items",
      advisoryOnly.length === 0,
    ],
    [
      "payload snapshot includes evidence spine metadata",
      generationInput.evidenceSpine?.version === 1 &&
        (generationInput.evidenceSpine.selectedIds.length ?? 0) > 0,
    ],
    [
      "payload ranks additional experience slice",
      generationInput.additionalExperience.some((item) => item.text.includes("blockchain")),
    ],
    [
      "story inputs expose omitted-but-relevant metadata",
      spine.storyInputs.omittedButRelevant.length >= 0 &&
        Array.isArray(spine.storyInputs.proofStoryCandidates),
    ],
    ["hidden bullet excluded via active collated inventory", hiddenPayload.experiences.length === 0],
    [
      "selectGenerationBullets still respects forced keys",
      selectGenerationBullets({
        experiences: collated.experiences,
        maxBullets: 1,
        jdText: blockchainJd.rawText,
        acceptedWordingByBulletKey: new Map(),
        forcedBulletKeys: [forcedKey],
      }).selected.some((item) => item.bulletKey === forcedKey),
    ],
    [
      "four languages all reach generation payload",
      fourLanguageSpine.skillIds.length === 4 &&
        fourLanguagePayload.skills.length === 4 &&
        fourLanguagePayload.skills.every((item) => item.category === "Languages"),
    ],
    [
      "more than five languages are capped at five",
      sixLanguageSpine.skillIds.length === 5 &&
        sixLanguagePayload.skills.length === 5 &&
        sixLanguagePayload.skills.every((item) => item.category === "Languages"),
    ],
    [
      "five technical skills and five languages can coexist",
      mixedSkillPayload.skills.filter((item) => item.category === "Technical Skills").length ===
          5 &&
        mixedSkillPayload.skills.filter((item) => item.category === "Languages").length === 5,
    ],
    [
      "interests use an independent five-item quota",
      mixedSkillPayload.skills.filter((item) => item.category === "Interests").length === 5,
    ],
    [
      "one category does not reduce another category allowance",
      mixedSkillPayload.skills.length === 15,
    ],
    [
      "ranking order within each category remains deterministic",
      selectedLanguageTexts.join("|") === expectedTopLanguages.join("|"),
    ],
    [
      "source inventory is not mutated by skill selection",
      JSON.stringify(mixedSkillCollated) === mixedSkillCollatedSnapshot,
    ],
    [
      "Other skills still reach generation payload when present",
      otherSkillPayload.skills.some((item) => item.category === "Other") &&
        otherSkillPayload.skills.some((item) => item.category === "Technical Skills"),
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll evidence spine checks passed.");
}

main();
