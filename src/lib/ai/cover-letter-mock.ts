import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export function generateMockCoverLetter(
  input: CoverLetterGenerationInput,
): CoverLetterGenerationResult {
  const role = input.jobDescription.roleTitle ?? "this role";
  const company = input.companyDisplayName ?? input.companyName;
  const companyFact =
    input.companyContext.companySummary?.split(".")[0]?.trim() ||
    `${company} appears to need structured commercial execution`;
  const roleRequirement =
    input.companyContext.likelyHiringPriorities[0] ||
    "building and growing B2B customer relationships";
  const secondRoleRequirement =
    input.companyContext.likelyHiringPriorities[1] || "hands-on sales and stakeholder management";

  const formalContent = `Dear Hiring Manager,

I am writing about the ${role} role at ${company}. What stood out to me was ${companyFact.toLowerCase()}. The role's emphasis on ${roleRequirement.toLowerCase()} lines up with work I have actually done across strategy, operations, and hands-on commercial execution.

At the Singapore Business Federation, I worked closely with stakeholders and business development partners — experience that helps when building relationships with FMCG and commercial teams. That matters here because ${company}'s focus on ${secondRoleRequirement.toLowerCase()} needs someone comfortable with real customer conversations, not just planning from a distance.

I would welcome a conversation about where I could be helpful at ${company}.

Regards,
Min Htet`;

  return {
    formalContent,
    rationale: {
      selectedThemes: ["Stakeholder Management", "Business Development"],
      whyTheseThemes:
        "Ranked evidence prioritizes commercial and stakeholder work over founder stories for this B2B sales role.",
      selectedCompanyFacts: [
        companyFact,
        input.companyContext.productsAndServices[0] || `${company} serves FMCG brands`,
      ],
      selectedRoleRequirements: [roleRequirement, secondRoleRequirement],
      companyRoleStoryBridges: [
        `Company fact: ${companyFact} | Role requirement: ${roleRequirement} | Evidence: SBF stakeholder management | Why relevant: supports FMCG commercial relationship building`,
        `Company fact: ${secondRoleRequirement} | Role requirement: B2B customer growth | Evidence: business development work | Why relevant: matches outbound commercial execution`,
      ],
      companyContextUsed: [companyFact, roleRequirement],
      riskFlags: input.communicationProfile ? [] : ["No communication profile provided"],
      wordCount: formalContent.trim().split(/\s+/).filter(Boolean).length,
      emailCoverLetter: `Dear Hiring Manager,\n\nI am applying for the ${role} role at ${company}. My background spans strategy, operations, and hands-on commercial work. I would welcome a brief conversation.\n\nRegards,\nMin Htet`,
      linkedinMessage: `Hi — I am interested in the ${role} opening at ${company}. My background spans strategy & operations and hands-on commercial work. Happy to connect if useful.`,
      recruiterDm: `Hi, I saw the ${role} role at ${company} and would love to learn more. My experience spans commercial execution and stakeholder management.`,
      whatsappIntro: `Hi, this is Min Htet. I am interested in the ${role} role at ${company} and can share a tailored resume if helpful.`,
    },
  };
}
