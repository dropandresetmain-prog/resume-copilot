import {
  parseBulletLine,
  parseCompanyLine,
  parseRoleLine,
  parseWorkExperienceLines,
} from "../src/lib/parser/heuristics";
import { parseResumeTextForTest } from "../src/lib/parser/docx-parser";

const productManagementResume = `
WORK EXPERIENCE

Drop & Reset (pickleball social club; 2500+ total following)                              Singapore
Founder, Certified Coach (IPTPA)                                                          Apr 2025 – Present
• Product Architecture: Translated operational challenges into technical product requirements for the membership portal.
• Product Development: Built and launched a Telegram-based membership portal for 2500+ members.
• Payment Systems: Designed and implemented a wallet and ledger system for club operations.
• Venture Building: Scoped and validated adjacent revenue opportunities for the club.

EDUCATION

National University of Singapore                                                       Singapore
Bachelor of Business Administration                                                     Aug 2018 – May 2022
• Dean's List
• Relevant coursework: Product Management, Data Analytics

ADDITIONAL EXPERIENCE

Volunteer coach for community pickleball clinics
Mentor for early-stage founders at local startup events

SKILLS & INTEREST

Languages: English (Native), Mandarin (Conversational)
Technical Skills: Python, SQL, Figma, Product Management
Interests: Pickleball, Travel, Venture Building
`;

const company = parseCompanyLine(
  "Drop & Reset (pickleball social club; 2500+ total following)                              Singapore",
);
const role = parseRoleLine(
  "Founder, Certified Coach (IPTPA)                                                          Apr 2025 – Present",
);
const bullet = parseBulletLine(
  "• Product Architecture: Translated operational challenges into technical product requirements...",
);

const workSection = productManagementResume
  .split("EDUCATION")[0]
  .replace("WORK EXPERIENCE", "");
const { blocks } = parseWorkExperienceLines(workSection.split("\n"));

const parsed = parseResumeTextForTest(productManagementResume);

const checks: [string, boolean][] = [
  ["company", company.company === "Drop & Reset"],
  [
    "descriptor",
    company.descriptor === "pickleball social club; 2500+ total following",
  ],
  ["location", company.location === "Singapore"],
  ["role", role.role === "Founder, Certified Coach (IPTPA)"],
  ["dateRange", role.dateRange === "Apr 2025 – Present"],
  ["bullet keyword", bullet?.keyword === "Product Architecture"],
  ["work block count", blocks.length === 1],
  ["work bullet count", blocks[0]?.bullets.length === 4],
  [
    "work keywords",
    blocks[0]?.bullets.map((b) => b.keyword).join("|") ===
      "Product Architecture|Product Development|Payment Systems|Venture Building",
  ],
  ["parsed work experiences", parsed.workExperiences.length === 1],
  ["parsed education items", parsed.education.length >= 1],
  [
    "education institution",
    parsed.education[0]?.institution === "National University of Singapore",
  ],
  [
    "education programmes",
    parsed.education[0]?.programmes.some((programme) =>
      programme.includes("Bachelor of Business Administration"),
    ) === true,
  ],
  ["education raw preserved", Boolean(parsed.education[0]?.rawText)],
  ["additional experience lines", parsed.additionalExperience.lines.length >= 2],
  ["additional raw preserved", parsed.additionalExperience.rawText.length > 0],
  ["skills languages", parsed.skills.languages.length >= 2],
  ["skills technical", parsed.skills.technicalSkills.length >= 3],
  ["skills interests", parsed.skills.interests.length >= 2],
  ["skills raw preserved", parsed.skills.rawText.length > 0],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
