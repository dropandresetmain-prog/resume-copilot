import { GEMINI_MODEL } from "@/lib/ai/config";
import { buildCompanyContextPrompt } from "@/lib/company-context/prompt";
import { parseCompanyContextJson } from "@/lib/company-context/parse";
import type { CompanyContext, CompanyContextGenerationRequest } from "@/types/company-context";

export async function generateCompanyContextWithGemini(
  input: CompanyContextGenerationRequest,
  apiKey: string,
): Promise<CompanyContext> {
  const prompt = buildCompanyContextPrompt(input);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini API error: ${message}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned no content.");
  }

  return parseCompanyContextJson(text, {
    companyName: input.companyName,
    country: input.country,
    website: input.website,
  });
}
