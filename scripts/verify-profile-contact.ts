import {
  looksLikePersonNameHeader,
  parseProfileContact,
} from "../src/lib/parser/profile-contact";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";

const profileResume = `
HSET MIN HTET
hset.min.htet@example.com
+65 9123 4567
Singapore

WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20%.
`;

const parsed = parseResumeTextForTest(profileResume, "profile-resume");
const profileOnly = parseProfileContact([
  "HSET MIN HTET",
  "hset.min.htet@example.com",
  "+65 9123 4567",
  "Singapore",
]);

const checks: [string, boolean][] = [
  ["person name header detected", looksLikePersonNameHeader("HSET MIN HTET")],
  ["person name not section header", !looksLikePersonNameHeader("WORK EXPERIENCE")],
  [
    "profile parser extracts fullName",
    profileOnly?.fullName === "Hset Min Htet",
  ],
  ["profile parser extracts email", profileOnly?.email === "hset.min.htet@example.com"],
  ["profile parser extracts phone", Boolean(profileOnly?.phone?.includes("9123"))],
  ["profile parser extracts location", profileOnly?.location === "Singapore"],
  ["parsed resume has profile", Boolean(parsed.profile?.fullName)],
  [
    "profile name not unparsed section",
    !parsed.unparsedSections.some((section) => section.title === "HSET MIN HTET"),
  ],
  [
    "confident profile skips preamble warning",
    !parsed.parseWarnings.some((warning) =>
      warning.includes("before the first section header"),
    ),
  ],
  [
    "profile raw text preserved",
    (parsed.profile?.rawText.length ?? 0) > 0,
  ],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}

console.log("\nAll profile/contact parser checks passed.");
