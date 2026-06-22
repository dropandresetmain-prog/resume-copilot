import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import {
  clearAllResumes,
  countInventory,
  deleteResume,
  upsertResume,
} from "../../src/lib/inventory/inventory";
import { parseResumeTextForTest } from "../../src/lib/parser/docx-parser";
import type { InventoryState, ParsedResume } from "../../src/types/resume";

const sampleText = `
WORK EXPERIENCE
Acme Corp                                                                              Remote
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue.
`;

function makeResume(filename: string, id: string): ParsedResume {
  const parsed = parseResumeTextForTest(sampleText, id);
  return { ...parsed, filename, id };
}

let inventory: InventoryState = {
  resumes: [],
  failures: [],
  enrichment: createEmptyEnrichmentState(),
};

const resumeA = makeResume("resume-a.docx", "a");
const resumeB = makeResume("resume-b.docx", "b");

inventory = upsertResume(inventory, resumeA);
inventory = upsertResume(inventory, resumeB);

const replaceResumeA = makeResume("resume-a.docx", "a-replacement");
inventory = upsertResume(inventory, replaceResumeA);

const checks: [string, boolean][] = [
  ["upsert count", inventory.resumes.length === 2],
  [
    "replace by filename",
    inventory.resumes.find((r) => r.filename === "resume-a.docx")?.id ===
      "a-replacement",
  ],
  [
    "replace did not duplicate",
    inventory.resumes.filter((r) => r.filename === "resume-a.docx").length === 1,
  ],
];

inventory = deleteResume(inventory, "a-replacement");
checks.push(
  ["delete resume", inventory.resumes.length === 1],
  ["delete kept other", inventory.resumes[0]?.filename === "resume-b.docx"],
);

inventory = clearAllResumes();
checks.push(
  ["clear all resumes", inventory.resumes.length === 0],
  ["clear all failures", inventory.failures.length === 0],
);

inventory = upsertResume(inventory, resumeA);
const counts = countInventory(inventory);
checks.push(
  ["count resumes", counts.resumes === 1],
  ["count work experiences", counts.workExperiences === 1],
  ["count work bullets", counts.workBullets === 1],
);

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
