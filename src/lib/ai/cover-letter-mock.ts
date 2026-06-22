import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export function generateMockCoverLetter(
  input: CoverLetterGenerationInput,
): CoverLetterGenerationResult {
  const role = input.jobDescription.roleTitle ?? "this role";
  const company = input.companyName;

  const formalContent = `Dear Hiring Manager,

I am writing to express my interest in the ${role} position at ${company}. The role aligns with how I have combined strategy and operations work with hands-on product and commercial execution across founder-led and consulting environments.

In my recent work, I have translated operational challenges into practical requirements, built internal tools and workflow improvements, and managed stakeholder relationships across partners, customers, and leadership teams. The generated resume evidence for this application highlights relevant experience in product operations, partnerships, market expansion, and payment-related operational work where supported by facts.

What draws me to ${company} is the combination of the role scope and the company's context in ${input.country}. ${input.companyContext.summary ? input.companyContext.summary.split("\n")[0] : `I am particularly interested in contributing where structured execution, commercial judgement, and cross-functional delivery matter.`} I would welcome the opportunity to bring disciplined operations thinking and founder-operator execution to the team.

Thank you for your consideration. I would appreciate the chance to discuss how my background can support ${company}'s priorities for this role.

Regards,
Min Htet`;

  return {
    formalContent,
    rationale: {
      selectedThemes: ["Strategy & Operations", "Product Operations"],
      whyTheseThemes:
        "Selected themes match the JD emphasis and supported resume evidence without overclaiming technical seniority.",
      companyContextUsed: input.companyContext.summary ? ["summary"] : [],
      riskFlags: input.communicationProfile ? [] : ["No communication profile provided"],
      wordCount: formalContent.trim().split(/\s+/).length,
      emailCoverLetter: `Dear Hiring Manager,\n\nI am applying for the ${role} role at ${company}. My background spans strategy, operations, and hands-on delivery across product and commercial work. I would welcome a brief conversation.\n\nRegards,\nMin Htet`,
      linkedinMessage: `Hi — I am interested in the ${role} opening at ${company}. My background spans strategy & operations, product operations, and founder-led execution. Happy to connect if useful.`,
      recruiterDm: `Hi, I saw the ${role} role at ${company} and would love to learn more. My experience spans strategy & operations and hands-on product/commercial delivery.`,
      whatsappIntro: `Hi, this is Min Htet. I am interested in the ${role} role at ${company} and can share a tailored resume if helpful.`,
    },
  };
}
