import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { backfillProfileContactForInventory } from "../src/lib/inventory/backfill-profile-contact";
import type { InventoryState, ParsedResume } from "../src/types/resume";

function cloneInventory(inventory: InventoryState): InventoryState {
  return JSON.parse(JSON.stringify(inventory)) as InventoryState;
}

function buildLegacyResumeWithNameSection(): ParsedResume {
  return {
    id: "resume-legacy-1",
    filename: "legacy-resume.docx",
    uploadedAt: new Date().toISOString(),
    workExperiences: [
      {
        id: "exp-1",
        sourceResumeId: "resume-legacy-1",
        company: "Acme Corp",
        descriptor: "",
        location: "Singapore",
        role: "Product Manager",
        dateRange: "Jan 2020 – Dec 2022",
        rawHeader: "Acme Corp",
        rawRoleLine: "Product Manager",
        bullets: [
          {
            id: "bullet-1",
            parentId: "exp-1",
            keyword: "Growth",
            description: "Increased revenue by 20%.",
            rawBulletText: "• Growth: Increased revenue by 20%.",
          },
        ],
      },
    ],
    education: [],
    additionalExperience: {
      id: "add-1",
      sourceResumeId: "resume-legacy-1",
      title: "Additional Experience",
      lines: [],
      rawText: "",
      parseWarnings: [],
    },
    skills: {
      id: "skills-1",
      sourceResumeId: "resume-legacy-1",
      languages: [],
      technicalSkills: [],
      interests: [],
      other: [],
      rawText: "",
      parseWarnings: [],
    },
    unparsedSections: [
      {
        id: "unparsed-name",
        sourceResumeId: "resume-legacy-1",
        title: "HSET MIN HTET",
        originalHeader: "HSET MIN HTET",
        lines: ["hset.min.htet@example.com", "+65 9123 4567", "Singapore"],
        rawText: "hset.min.htet@example.com\n+65 9123 4567\nSingapore",
        parseWarnings: ["Unknown section type — preserved for manual review."],
      },
    ],
    parseWarnings: ['Unknown section "HSET MIN HTET" preserved as unparsed.'],
  };
}

const inventoryBefore: InventoryState = {
  resumes: [buildLegacyResumeWithNameSection()],
  failures: [],
  enrichment: {
    ...createEmptyEnrichmentState(),
    keywordBank: [
      {
        id: "kw-1",
        keyword: "Revenue Growth",
        category: "Finance",
        source: "ai_suggested",
        approved: true,
        seenCount: 1,
      },
    ],
    suggestions: [
      {
        id: "suggestion-1",
        bulletKey: "acme::product manager::increased revenue by 20 percent",
        company: "Acme Corp",
        role: "Product Manager",
        issueType: "keyword_suggestion",
        issueTitle: "Keyword could be more industry-standard",
        beforeText: "Increased revenue by 20%.",
        suggestedKeywords: ["Revenue Growth"],
        suggestedCapabilities: [],
        suggestedRoleTypes: [],
        changes: [],
        rationale: "Test suggestion",
        riskWarnings: [],
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

const inventorySnapshot = cloneInventory(inventoryBefore);
const result = backfillProfileContactForInventory(inventoryBefore);
const resumeAfter = result.inventory.resumes[0];
const noSourceInventory: InventoryState = {
  resumes: [
    {
      ...buildLegacyResumeWithNameSection(),
      unparsedSections: [],
      parseWarnings: [],
    },
  ],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};
const noSourceResult = backfillProfileContactForInventory(noSourceInventory);
const alreadyHasProfile = backfillProfileContactForInventory({
  ...inventorySnapshot,
  resumes: [
    {
      ...inventorySnapshot.resumes[0]!,
      profile: {
        fullName: "Existing Name",
        email: "existing@example.com",
        rawText: "Existing Name\nexisting@example.com",
        parseWarnings: [],
      },
    },
  ],
});

const checks: [string, boolean][] = [
  [
    "adds profile fullName from name unparsed section",
    resumeAfter?.profile?.fullName === "Hset Min Htet",
  ],
  [
    "adds profile email",
    resumeAfter?.profile?.email === "hset.min.htet@example.com",
  ],
  [
    "experiences unchanged",
    JSON.stringify(inventorySnapshot.resumes[0]?.workExperiences) ===
      JSON.stringify(result.inventory.resumes[0]?.workExperiences),
  ],
  [
    "enrichment unchanged",
    JSON.stringify(inventorySnapshot.enrichment) ===
      JSON.stringify(result.inventory.enrichment),
  ],
  [
    "keyword bank unchanged",
    JSON.stringify(inventorySnapshot.enrichment.keywordBank) ===
      JSON.stringify(result.inventory.enrichment.keywordBank),
  ],
  [
    "does not overwrite existing profile",
    alreadyHasProfile.summary.skippedAlreadyHadProfile === 1 &&
      alreadyHasProfile.summary.profilesAdded === 0,
  ],
  [
    "skips when no source text",
    noSourceResult.changed === false && noSourceResult.summary.profilesAdded === 0,
  ],
  [
    "removes old unknown section warning",
    !result.inventory.resumes[0]?.parseWarnings.some((warning) =>
      warning.includes("HSET MIN HTET"),
    ),
  ],
  [
    "removes name unparsed section",
    !result.inventory.resumes[0]?.unparsedSections.some(
      (section) => section.title === "HSET MIN HTET",
    ),
  ],
  ["reports profiles added", result.summary.profilesAdded === 1],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}

console.log("\nAll profile contact backfill checks passed.");
