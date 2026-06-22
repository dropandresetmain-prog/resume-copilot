import type { CoverLetterGenerationInput, CoverLetterGenerationResult } from "@/types/cover-letter-draft";

export function generateMockCoverLetter(
  input: CoverLetterGenerationInput,
): CoverLetterGenerationResult {
  const role = input.jobDescription.roleTitle ?? "this role";
  const company = input.companyDisplayName ?? input.companyName;

  const formalContent = `Dear Hiring Manager,

I am writing about the ${role} role at ${company}. The role lines up with work I have actually done across strategy, operations, and hands-on execution in small businesses and consulting-style projects.

In recent years I have spent a lot of time close to operational problems: customer issues, payments, workflow bottlenecks, partner coordination, and the unglamorous work of making things run. The resume I submitted for this application highlights supported examples in product operations, partnerships, market expansion, and payment-related operations where those claims are backed by evidence.

What interests me about ${company} is the mix of the role itself and the context in ${input.country}. ${input.companyContext.summary ? input.companyContext.summary.split("\n")[0] : `I think my background would be useful where structured execution and commercial judgement matter day to day.`} I would welcome a conversation about where I could be helpful.

Thank you for your consideration.

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
      wordCount: formalContent.trim().split(/\s+/).filter(Boolean).length,
      emailCoverLetter: `Dear Hiring Manager,\n\nI am applying for the ${role} role at ${company}. My background spans strategy, operations, and hands-on delivery across product and commercial work. I would welcome a brief conversation.\n\nRegards,\nMin Htet`,
      linkedinMessage: `Hi — I am interested in the ${role} opening at ${company}. My background spans strategy & operations and hands-on product/commercial work. Happy to connect if useful.`,
      recruiterDm: `Hi, I saw the ${role} role at ${company} and would love to learn more. My experience spans strategy & operations and hands-on execution.`,
      whatsappIntro: `Hi, this is Min Htet. I am interested in the ${role} role at ${company} and can share a tailored resume if helpful.`,
    },
  };
}
