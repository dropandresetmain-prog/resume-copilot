import { buildCollatedInventory } from "../src/lib/inventory/collation";
import { parseEducationLines } from "../src/lib/parser/education";
import { createEmptyEnrichmentState } from "../src/lib/enrichment/state";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";
import type { InventoryState } from "../src/types/resume";

const ntuEducationText = `
Nanyang Technological University                                                               Singapore
Master of Science in Technology Management
Bachelor of Engineering Science (Mechanical Engineering)                                        Aug 2014 – Dec 2018
• An accelerated Premier Scholars Programme for the top 2% of admitted cohort
• MSc Honours (Highest Distinction)
• Dean's List – CGPA 4.75/5.00
• BSc Honours (Highest Distinction) – CGPA 4.65/5.00
• NTU College Full-Scholarship
• SAT Math II: 800/800
`;

const berkeleyEducationText = `
University of California, Berkeley                                                             USA
Mechanical Engineering, REP-UCB Study Abroad Programme (Fully Sponsored)                        Aug 2016 – Jul 2017
• Entrepreneurship Challenge – 1st Runner Up for a campus-wide startup pitch competition
`;

const ntuResume = parseResumeTextForTest(`
WORK EXPERIENCE
Example Corp                                                                                 Singapore
Analyst                                                                                      Jan 2020 – Dec 2021
• Example bullet
EDUCATION
${ntuEducationText}
`);
ntuResume.filename = "product-management.docx";

const berkeleyResume = parseResumeTextForTest(`
EDUCATION
${berkeleyEducationText}
`);
berkeleyResume.filename = "berkeley.docx";

const { blocks: ntuBlocks } = parseEducationLines(
  ntuEducationText.trim().split("\n").map((line) => line.trimEnd()),
);
const ntuBlock = ntuBlocks[0];

const { blocks: berkeleyBlocks } = parseEducationLines(
  berkeleyEducationText.trim().split("\n").map((line) => line.trimEnd()),
);
const berkeleyBlock = berkeleyBlocks[0];

const ntuParsed = ntuResume.education[0];
const berkeleyParsed = berkeleyResume.education[0];

const duplicateInventory: InventoryState = {
  resumes: structuredClone([ntuResume, { ...ntuResume, id: "ntu-copy" }]),
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

const collatedDuplicate = buildCollatedInventory(duplicateInventory);
const mergedNtu = collatedDuplicate.educationItems.find((item) =>
  item.institution.includes("Nanyang"),
);

const differentBulletsInventory: InventoryState = {
  resumes: [
    ntuResume,
    {
      ...ntuResume,
      id: "ntu-variant",
      education: [
        {
          ...ntuParsed,
          id: "edu-variant",
          bullets: [
            ...ntuParsed.bullets,
            "MSc Honours (Highest Distinction) with thesis commendation",
          ],
        },
      ],
    },
  ],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

const collatedVariants = buildCollatedInventory(differentBulletsInventory);
const variantNtu = collatedVariants.educationItems.find((item) =>
  item.institution.includes("Nanyang"),
);

const checks: [string, boolean][] = [
  ["ntu single education item", ntuResume.education.length === 1],
  [
    "ntu institution",
    ntuParsed?.institution === "Nanyang Technological University",
  ],
  ["ntu location", ntuParsed?.location === "Singapore"],
  ["ntu programme count", ntuParsed?.programmes.length === 2],
  [
    "ntu msc programme",
    ntuParsed?.programmes.some((programme) =>
      programme.includes("Master of Science in Technology Management"),
    ) === true,
  ],
  [
    "ntu beng programme",
    ntuParsed?.programmes.some((programme) =>
      programme.includes("Bachelor of Engineering Science"),
    ) === true,
  ],
  ["ntu date range", ntuParsed?.dateRange === "Aug 2014 – Dec 2018"],
  ["ntu bullet count", ntuParsed?.bullets.length === 6],
  [
    "ntu premier scholars bullet",
    ntuParsed?.bullets.some((bullet) => bullet.includes("Premier Scholars")) ===
      true,
  ],
  [
    "ntu msc honours bullet",
    ntuParsed?.bullets.some((bullet) =>
      bullet.includes("MSc Honours (Highest Distinction)"),
    ) === true,
  ],
  [
    "ntu sat bullet",
    ntuParsed?.bullets.some((bullet) => bullet.includes("SAT Math II: 800/800")) ===
      true,
  ],
  ["ntu raw text preserved", (ntuParsed?.rawText.length ?? 0) > 0],
  ["berkeley single education item", berkeleyResume.education.length === 1],
  [
    "berkeley institution",
    berkeleyParsed?.institution === "University of California, Berkeley",
  ],
  ["berkeley location", berkeleyParsed?.location === "USA"],
  [
    "berkeley programme",
    berkeleyParsed?.programmes[0]?.includes("Mechanical Engineering") === true,
  ],
  ["berkeley date range", berkeleyParsed?.dateRange === "Aug 2016 – Jul 2017"],
  [
    "berkeley entrepreneurship bullet",
    berkeleyParsed?.bullets.some((bullet) =>
      bullet.includes("Entrepreneurship Challenge"),
    ) === true,
  ],
  [
    "collated merge same education",
    collatedDuplicate.educationItems.length === 1,
  ],
  [
    "collated merge citations",
    mergedNtu?.sourceCitations.length === 2,
  ],
  [
    "collated preserve bullet variants",
    (variantNtu?.bullets.length ?? 0) === 7,
  ],
  [
    "parser block programmes",
    ntuBlock?.programmes.length === 2 && berkeleyBlock?.programmes.length === 1,
  ],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok && name === "ntu programme count") {
    console.log("  programmes:", ntuParsed?.programmes);
  }
  if (!ok && name === "ntu bullet count") {
    console.log("  bullets:", ntuParsed?.bullets);
  }
  if (!ok && name === "collated preserve bullet variants") {
    console.log("  bullets:", variantNtu?.bullets);
  }
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
