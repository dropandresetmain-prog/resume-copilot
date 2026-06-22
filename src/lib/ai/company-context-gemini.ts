import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import { buildCompanyContextPrompt } from "@/lib/company-context/prompt";
import { parseCompanyContextJson } from "@/lib/company-context/parse";
import type { CompanyContext, CompanyContextGenerationRequest } from "@/types/company-context";

export async function generateCompanyContextWithGemini(
  input: CompanyContextGenerationRequest,
  apiKey: string,
): Promise<CompanyContext> {
  const prompt = buildCompanyContextPrompt(input);
  const { text } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
  });

  return parseCompanyContextJson(text, {
    companyName: input.companyName,
    country: input.country,
    website: input.website,
  });
}
