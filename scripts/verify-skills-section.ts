import { buildFinalResumeLayout } from "../src/lib/resume-draft/layout";
import {
  extractSkillsLanguagesInterests,
  isSoftBusinessSkillItem,
  isTechnicalSkillItem,
  normalizeTechnicalSkillLabel,
} from "../src/lib/resume-draft/skills-section";
import type { ResumeDraftContent } from "../src/types/resume-draft";

function buildLegacySkillsDraft(): ResumeDraftContent {
  return {
    schemaVersion: 1,
    header: { includeHeader: false },
    professionalSummary: { text: "", jdAlignment: [], riskFlags: [] },
    skills: {
      groups: [
        { label: "Tech", items: ["Python (basic automation & data handling)", "Airtable"] },
        {
          label: "Skills",
          items: [
            "Business Development",
            "Negotiation",
            "Git/GitHub",
            "Next.js",
          ],
        },
        { label: "Languages", items: ["English", "Japanese"] },
        { label: "Interests", items: ["Travel", "Pickleball"] },
      ],
      jdAlignment: [],
      riskFlags: [],
    },
    experience: [],
    education: [],
    additionalExperience: [],
    globalRiskFlags: [],
  };
}

function main() {
  const draft = buildLegacySkillsDraft();
  const extracted = extractSkillsLanguagesInterests(draft);
  const layout = buildFinalResumeLayout(draft);

  const softSkills = [
    "Business Development",
    "Negotiation",
    "Relationship Building",
    "Consulting",
    "Stakeholder Engagement",
  ];

  const checks: [string, boolean][] = [
    ["technical classifier accepts Python", isTechnicalSkillItem("Python")],
    ["technical classifier accepts Next.js", isTechnicalSkillItem("Next.js")],
    ["technical classifier accepts Git/GitHub", isTechnicalSkillItem("Git/GitHub")],
    ["soft classifier rejects business development", isSoftBusinessSkillItem("Business Development")],
    ["soft classifier rejects negotiation", isSoftBusinessSkillItem("Negotiation")],
    ["python label normalized", normalizeTechnicalSkillLabel("Python (basic automation & data handling)") === "Python"],
    ["skills line present", extracted.skillsLine.length > 0],
    ["skills line includes Python", extracted.skillsLine.includes("Python")],
    ["skills line excludes python qualifier", !extracted.skillsLine.includes("basic automation")],
    ["skills line includes technical items from legacy Skills group", extracted.skillsLine.includes("Next.js")],
    ["skills line excludes soft business skills", softSkills.every((skill) => !extracted.skillsLine.includes(skill))],
    ["languages line present", extracted.languagesLine.includes("English")],
    ["interests line present", extracted.interestsLine.includes("Travel")],
    ["layout skills line present", layout.skillsLine.length > 0],
    ["layout languages line present", layout.languagesLine.length > 0],
    ["layout interests line present", layout.interestsLine.length > 0],
    [
      "layout excludes soft business skills",
      softSkills.every((skill) => !layout.skillsLine.includes(skill)),
    ],
    ["layout has no Tech row field", !("techLine" in layout)],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll skills section checks passed.");
}

main();
