import {
  parseBulletLine,
  parseCompanyLine,
  parseRoleLine,
  parseWorkExperienceLines,
} from "../../src/lib/parser/heuristics";
import { parseResumeTextForTest } from "../../src/lib/parser/docx-parser";
import { parseExperienceSection } from "../../src/lib/parser/experience-parser";
import { parseSkillsSection } from "../../src/lib/parser/sections";

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

// ── Inline / single-line experience format tests ─────────────────────────────

// "Role at Company — Date" format
const atFormatLines = [
  "Product Manager at Acme Corp — Jan 2020 – Dec 2022",
  "• Strategy: Led product roadmap.",
  "• Growth: Increased revenue by 20%.",
  "",
  "Software Engineer at Beta Labs | 2021 – Present",
  "• Built microservices in Node.js.",
];
const atFormatResult = parseExperienceSection(atFormatLines);
const atBlock0 = atFormatResult.blocks[0];
const atBlock1 = atFormatResult.blocks[1];

checks.push(
  ["inline at-format block count", atFormatResult.blocks.length === 2],
  ["inline at-format role", atBlock0?.role === "Product Manager"],
  ["inline at-format company", atBlock0?.company === "Acme Corp"],
  ["inline at-format date", atBlock0?.dateRange === "Jan 2020 – Dec 2022"],
  ["inline at-format bullet count", atBlock0?.bullets.length === 2],
  ["inline pipe-separator role", atBlock1?.role === "Software Engineer"],
  ["inline pipe-separator company", atBlock1?.company === "Beta Labs"],
  ["inline pipe-separator date", atBlock1?.dateRange === "2021 – Present"],
);

// Comma-separated single-line: "Role, Company — Date"
const commaFormatLines = [
  "Product Manager, Acme Corp — Jan 2020 – Dec 2022",
  "• Delivered key product features.",
];
const commaFormatResult = parseExperienceSection(commaFormatLines);
const commaBlock0 = commaFormatResult.blocks[0];

checks.push(
  ["inline comma-format block count", commaFormatResult.blocks.length >= 1],
  ["inline comma-format date", commaBlock0?.dateRange === "Jan 2020 – Dec 2022"],
  ["inline comma-format role", commaBlock0?.role === "Product Manager"],
  ["inline comma-format company", commaBlock0?.company === "Acme Corp"],
);

// Company-first comma: "Company, Role, Date"
const companyFirstLines = [
  "Acme Corp, Product Manager, Jan 2020 – Dec 2022",
  "• Delivered key product features.",
];
const companyFirstResult = parseExperienceSection(companyFirstLines);
const companyFirstBlock = companyFirstResult.blocks[0];

checks.push(
  ["company-first comma role", companyFirstBlock?.role === "Product Manager"],
  ["company-first comma company", companyFirstBlock?.company === "Acme Corp"],
  ["company-first comma date", companyFirstBlock?.dateRange === "Jan 2020 – Dec 2022"],
);

// Ambiguous comma pair — no company/role signals; should warn, not high confidence
const ambiguousCommaLines = ["Alpha, Beta, Jan 2020 – Dec 2022"];
const ambiguousCommaResult = parseExperienceSection(ambiguousCommaLines);

checks.push(
  ["ambiguous comma warns or low confidence", ambiguousCommaResult.confidence !== "high" || ambiguousCommaResult.warnings.length > 0],
  ["ambiguous comma role-first fallback", ambiguousCommaResult.blocks[0]?.role === "Alpha"],
);

// Date-first with descriptor line between date and role/company
const dateDescriptorLines = [
  "Jan 2020 – Dec 2022",
  "Full-time",
  "Product Manager, Acme Corp",
  "• Led roadmap planning.",
];
const dateDescriptorResult = parseExperienceSection(dateDescriptorLines);

checks.push(
  ["date-first descriptor skipped", dateDescriptorResult.blocks.length >= 1],
  ["date-first descriptor role", dateDescriptorResult.blocks[0]?.role === "Product Manager"],
  ["date-first descriptor company", dateDescriptorResult.blocks[0]?.company === "Acme Corp"],
);

// Date-first format
const dateFirstLines = [
  "Jan 2020 – Dec 2022",
  "Product Manager, Acme Corp",
  "• Led roadmap planning.",
  "",
  "2021 – Present",
  "Software Engineer at Beta Labs",
  "• Built APIs.",
];
const dateFirstResult = parseExperienceSection(dateFirstLines);

checks.push(
  ["date-first block count", dateFirstResult.blocks.length >= 1],
  ["date-first date extracted", dateFirstResult.blocks[0]?.dateRange === "Jan 2020 – Dec 2022"],
);

// Plain bullet work experience (no keyword prefix)
const plainBulletLines = [
  "Software Engineer at Meridian Partners | Jan 2019 – Dec 2020",
  "Built and deployed REST APIs serving 50k daily requests.",
  "Mentored junior engineers across a team of 8.",
];
const plainBulletResult = parseExperienceSection(plainBulletLines);

checks.push(
  ["plain bullet experience parsed", plainBulletResult.blocks.length >= 1],
  ["plain bullet role", plainBulletResult.blocks[0]?.role === "Software Engineer"],
  ["plain bullet bullets collected", plainBulletResult.blocks[0]?.bullets.length >= 1],
);

// Full document parse — "at" separator resume
const atSeparatorResume = `
Alex Tan
alex@example.com | +65 9123 4567

EMPLOYMENT HISTORY

Product Manager at Acme Corp — Jan 2020 – Dec 2022
• Roadmap: Defined product vision.
• Delivery: Shipped 4 major features.

Software Engineer at Beta Labs | 2017 – 2019
• Backend: Built core APIs.

EDUCATION

National University of Singapore                            Singapore
Bachelor of Computer Science                                Aug 2013 – May 2017

KEY SKILLS

Python, SQL, Product Management, Figma
• JavaScript
• Leadership
`;
const atSeparatorParsed = parseResumeTextForTest(atSeparatorResume);

checks.push(
  ["at-separator resume work experiences", atSeparatorParsed.workExperiences.length >= 1],
  [
    "at-separator employment history recognized",
    atSeparatorParsed.workExperiences.some((e) => e.company === "Acme Corp"),
  ],
  [
    "at-separator second role parsed",
    atSeparatorParsed.workExperiences.some((e) => e.company === "Beta Labs"),
  ],
  ["at-separator education parsed", atSeparatorParsed.education.length >= 1],
);

// ── Skills parsing tests ──────────────────────────────────────────────────────

let skillsId = 0;
const createSkillsId = () => `skill-${++skillsId}`;

// Plain comma-separated skills (no labels)
const plainCommaSkills = parseSkillsSection(
  ["Python, SQL, React, Git", "JavaScript, TypeScript"],
  "test",
  createSkillsId,
);
checks.push(
  ["plain comma skills in other", plainCommaSkills.other.length >= 4],
  ["plain comma skills split", plainCommaSkills.other.includes("Python")],
);

// Bullet list skills
const bulletSkills = parseSkillsSection(
  ["• Python", "• SQL", "• Figma"],
  "test",
  createSkillsId,
);
checks.push(
  ["bullet skills in other", bulletSkills.other.length >= 3],
  ["bullet skills stripped", bulletSkills.other.includes("Python")],
);

// Custom label (non-canonical): "Programming: Python, SQL"
const labeledOtherSkills = parseSkillsSection(
  ["Programming: Python, SQL, JavaScript"],
  "test",
  createSkillsId,
);
checks.push(
  ["labeled other skills to technicalSkills", labeledOtherSkills.technicalSkills.length >= 2],
  ["labeled other skills includes Python", labeledOtherSkills.technicalSkills.includes("Python")],
);

// Canonical labels still work
const canonicalSkills = parseSkillsSection(
  [
    "Languages: English, Mandarin",
    "Technical Skills: Python, SQL",
    "Interests: Travel, Pickleball",
  ],
  "test",
  createSkillsId,
);
checks.push(
  ["canonical languages", canonicalSkills.languages.length === 2],
  ["canonical technical", canonicalSkills.technicalSkills.length === 2],
  ["canonical interests", canonicalSkills.interests.length === 2],
);

// Low-confidence block preserved as unparsed
const lowConfidenceResume = `
WORK EXPERIENCE

This section contains only narrative text with no structured experience entries.
The candidate has various experiences across industries and geographies.
`;
const lowConfParsed = parseResumeTextForTest(lowConfidenceResume);

checks.push(
  [
    "low-confidence block preserved as unparsed",
    lowConfParsed.unparsedSections.length >= 1 || lowConfParsed.workExperiences.length === 0,
  ],
);

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
