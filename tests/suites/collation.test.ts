import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import {
  extractCategoryPrefix,
  splitAdditionalExperienceSegments,
  splitSkillAtomicItems,
} from "../../src/lib/inventory/split-items";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { parseResumeTextForTest } from "../../src/lib/parser/docx-parser";
import type { InventoryState } from "../../src/types/resume";

const additionalInput =
  "Other Past Roles: BayCurrent Consulting – Enterprise Blockchain (Japan), Entrepreneur First – Founders Experience Weekend, Active Global – Strategy & Operations, elderly primary care (Singapore), SE3D – 3D Bioprinting (Silicon Valley), Deloitte Consulting – Strategy & Operations (Myanmar)";

const additionalCategory = extractCategoryPrefix(additionalInput);
const additionalSegments = splitAdditionalExperienceSegments(
  additionalCategory.remainder,
);

const languageSkills = splitSkillAtomicItems(
  "Fluent in English, Mandarin, Burmese (Spoken/Written), Japanese (JLPT N3), Basic Thai (Spoken)",
);

const resumeA = parseResumeTextForTest(
  `
WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20%.
• Leadership: Led cross-functional teams.

EDUCATION
Nanyang Technological University                                                               Singapore
Master of Science in Technology Management
Bachelor of Engineering Science (Mechanical Engineering)                                        Aug 2014 – Dec 2018
• MSc Honours (Highest Distinction)
• Dean's List – CGPA 4.75/5.00
`,
  "resume-a",
);
resumeA.filename = "resume-a.docx";

const resumeB = parseResumeTextForTest(
  `
WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20 percent.
• Partnerships: Built strategic alliances.

EDUCATION
Nanyang Technological University                                                               Singapore
Master of Science in Technology Management
Bachelor of Engineering Science (Mechanical Engineering)                                        Aug 2014 – Dec 2018
• BSc Honours (Highest Distinction) – CGPA 4.65/5.00
• NTU College Full-Scholarship
`,
  "resume-b",
);
resumeB.filename = "resume-b.docx";

const inventoryBefore: InventoryState = {
  resumes: structuredClone([resumeA, resumeB]),
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

const inventorySnapshot = JSON.stringify(inventoryBefore);
const collated = buildCollatedInventory(inventoryBefore);
const inventoryAfter = JSON.stringify(inventoryBefore);

const acme = collated.experiences.find((item) => item.company === "Acme Corp");
const ntu = collated.educationItems.find((item) =>
  item.institution.includes("Nanyang"),
);

const checks: [string, boolean][] = [
  ["additional category", additionalCategory.category === "Other Past Roles"],
  ["additional split count", additionalSegments.length === 5],
  [
    "additional merged comma segment",
    additionalSegments.some((item) =>
      item.includes("Active Global – Strategy & Operations, elderly primary care"),
    ),
  ],
  ["language skill split", languageSkills.length === 5],
  ["collate one experience", collated.experiences.length === 1],
  ["collate two citations", acme?.sourceCitations.length === 2],
  ["collate bullet dedupe", acme?.bullets.length === 3],
  [
    "collate bullet citations",
    acme?.bullets.some((bullet) => bullet.sourceCitations.length === 2) === true,
  ],
  ["no mutation of parsed resumes", inventorySnapshot === inventoryAfter],
  ["collated one ntu education", collated.educationItems.length === 1],
  ["collated ntu citations", ntu?.sourceCitations.length === 2],
  ["collated ntu programmes", ntu?.programmes.length === 2],
  ["collated ntu bullets preserved", (ntu?.bullets.length ?? 0) === 4],
  [
    "collated ntu bullet variants",
    ntu?.bullets.some((bullet) => bullet.includes("MSc Honours")) === true &&
      ntu?.bullets.some((bullet) => bullet.includes("NTU College")) === true,
  ],
  ["collated ntu raw texts", (ntu?.rawTexts.length ?? 0) === 2],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok && name === "collated ntu bullets preserved") {
    console.log("  bullets:", ntu?.bullets);
  }
  if (!ok && name === "collate bullet dedupe") {
    console.log("  bullets:", acme?.bullets.map((b) => b.description));
  }
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
