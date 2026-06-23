import {
  detectResumeSections,
  matchSectionHeader,
} from "../../src/lib/parser/section-detection";
import { parseResumeTextForTest } from "../../src/lib/parser/docx-parser";
import { parseExperienceSection } from "../../src/lib/parser/experience-parser";

const checks: [string, boolean][] = [
  [
    "work experience alias",
    matchSectionHeader("PROFESSIONAL EXPERIENCE")?.key === "work_experience",
  ],
  [
    "employment history alias",
    matchSectionHeader("EMPLOYMENT HISTORY")?.key === "work_experience",
  ],
  [
    "career history alias",
    matchSectionHeader("CAREER HISTORY")?.key === "work_experience",
  ],
  [
    "education alias",
    matchSectionHeader("ACADEMIC BACKGROUND")?.key === "education",
  ],
  [
    "additional experience alias",
    matchSectionHeader("LEADERSHIP")?.key === "additional_experience",
  ],
  [
    "certifications maps to additional experience",
    matchSectionHeader("CERTIFICATIONS")?.key === "additional_experience",
  ],
  [
    "skills alias",
    matchSectionHeader("TECHNICAL SKILLS")?.key === "skills",
  ],
  [
    "key skills alias",
    matchSectionHeader("KEY SKILLS")?.key === "skills",
  ],
  [
    "core competencies alias",
    matchSectionHeader("CORE COMPETENCIES")?.key === "skills",
  ],
  [
    "unknown section preserved",
    matchSectionHeader("REFERENCES")?.key === "unparsed",
  ],
  [
    "section colon header",
    matchSectionHeader("EDUCATION:")?.key === "education",
  ],
  [
    "person name is not section header",
    matchSectionHeader("ALEX TAN") === null,
  ],
  [
    "title-case summary unparsed",
    matchSectionHeader("Summary")?.key === "unparsed",
  ],
  [
    "title-case professional summary unparsed",
    matchSectionHeader("Professional Summary")?.key === "unparsed",
  ],
  [
    "title-case profile unparsed",
    matchSectionHeader("Profile")?.key === "unparsed",
  ],
  [
    "title-case objective unparsed",
    matchSectionHeader("Objective")?.key === "unparsed",
  ],
  [
    "title-case references unparsed",
    matchSectionHeader("References")?.key === "unparsed",
  ],
  [
    "awards maps to additional experience",
    matchSectionHeader("Awards")?.key === "additional_experience",
  ],
  [
    "volunteer experience maps to additional experience",
    matchSectionHeader("Volunteer Experience")?.key === "additional_experience",
  ],
];

const layeredResume = `
Product leader with venture building experience.

WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
• Growth: Increased revenue by 20%.

EDUCATION
National University of Singapore                                                       Singapore
Bachelor of Business Administration                                                     Aug 2018 – May 2022

REFERENCES
Available on request.
`;

const summaryHeaderResume = `
SUMMARY
Experienced operator across product and venture building.

WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
`;

const titleCaseSummaryResume = `
Summary
Experienced operator across product and venture building.

WORK EXPERIENCE
Acme Corp                                                                              Singapore
Product Manager                                                                        Jan 2020 – Dec 2022
`;

const detected = detectResumeSections(layeredResume);
const detectedSummary = detectResumeSections(summaryHeaderResume);
const detectedTitleCaseSummary = detectResumeSections(titleCaseSummaryResume);
const parsed = parseResumeTextForTest(layeredResume);
const parsedSummary = parseResumeTextForTest(summaryHeaderResume);
const parsedTitleCaseSummary = parseResumeTextForTest(titleCaseSummaryResume);
const experience = parseExperienceSection(
  layeredResume.split("EDUCATION")[0].split("WORK EXPERIENCE")[1]?.split("\n") ?? [],
);

checks.push(
  [
    "preamble detected",
    detected.preambleLines.some((line) =>
      line.includes("Product leader with venture building experience"),
    ),
  ],
  ["known sections detected", detected.sections.length >= 3],
  [
    "references unparsed section",
    detected.sections.some(
      (section) => section.key === "unparsed" && section.title === "REFERENCES",
    ),
  ],
  ["parsed work experience", parsed.workExperiences.length === 1],
  ["parsed education", parsed.education.length >= 1],
  [
    "references in unparsed output",
    parsed.unparsedSections.some((section) => section.title === "REFERENCES"),
  ],
  ["experience profile confidence", experience.confidence !== "low"],
  [
    "preamble in unparsed output",
    parsed.unparsedSections.some((section) => section.title === "Document preamble"),
  ],
  [
    "summary header becomes unparsed section",
    detectedSummary.sections.some(
      (section) => section.key === "unparsed" && section.title === "SUMMARY",
    ),
  ],
  [
    "summary section in parsed output",
    parsedSummary.unparsedSections.some((section) => section.title === "SUMMARY"),
  ],
  [
    "title-case summary becomes unparsed section",
    detectedTitleCaseSummary.sections.some(
      (section) => section.key === "unparsed" && section.title === "Summary",
    ),
  ],
  [
    "title-case summary in parsed output",
    parsedTitleCaseSummary.unparsedSections.some((section) => section.title === "Summary"),
  ],
);

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
