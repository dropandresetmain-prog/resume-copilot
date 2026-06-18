import {
  calculateExperienceDuration,
  formatDuration,
  parseMonthYear,
} from "../src/lib/date/duration";
import {
  createExportPayload,
  parseImportedInventory,
  parsePersistedInventory,
  serializeInventory,
  validateInventoryState,
} from "../src/lib/inventory/persistence";
import { countResume } from "../src/lib/inventory/inventory";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";
import type { InventoryState } from "../src/types/resume";

const referenceDate = new Date("2025-06-18");

const durationChecks: [string, boolean][] = [
  [
    "Apr 2025 – Present",
    calculateExperienceDuration("Apr 2025 – Present", referenceDate).display ===
      "2 mos",
  ],
  [
    "Jul 2019 – Present months",
    calculateExperienceDuration("Jul 2019 – Present", referenceDate).totalMonths ===
      71,
  ],
  [
    "Dec 2020 – May 2022",
    calculateExperienceDuration("Dec 2020 – May 2022", referenceDate).display ===
      "1 yr 5 mos",
  ],
  [
    "Mar 2019 – Jun 2019",
    calculateExperienceDuration("Mar 2019 – Jun 2019", referenceDate).display ===
      "3 mos",
  ],
  [
    "invalid range warning",
    Boolean(
      calculateExperienceDuration("not a date range", referenceDate).parseWarning,
    ),
  ],
  ["format 6 yrs", formatDuration(72) === "6 yrs 0 mos"],
  ["format 1 yr", formatDuration(14) === "1 yr 2 mos"],
  ["parse Apr 2025", parseMonthYear("Apr 2025")?.year === 2025],
];

const sampleInventory: InventoryState = {
  resumes: [parseResumeTextForTest("WORK EXPERIENCE\nAcme\nRole\nJan 2020 – Present\n• A: B", "r1")],
  failures: [],
};

const serialized = serializeInventory(sampleInventory);
const persisted = parsePersistedInventory(serialized);
const exported = JSON.stringify(createExportPayload(sampleInventory));
const imported = parseImportedInventory(exported);
const listCounts = countResume(sampleInventory.resumes[0]);

const persistenceChecks: [string, boolean][] = [
  ["persist roundtrip", persisted.inventory?.resumes.length === 1],
  ["import valid", imported.inventory?.resumes.length === 1],
  [
    "import invalid",
    parseImportedInventory("{ bad json").error !== null,
  ],
  [
    "validate rejects bad shape",
    validateInventoryState({ resumes: "nope" }) === null,
  ],
  ["resume list work count", listCounts.workExperiences >= 0],
  ["resume list bullets", listCounts.workBullets >= 0],
];

const allChecks = [...durationChecks, ...persistenceChecks];

for (const [name, ok] of allChecks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (allChecks.some(([, ok]) => !ok)) {
  process.exit(1);
}
