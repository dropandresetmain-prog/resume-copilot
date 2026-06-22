import { normalizeCompanyDisplayName } from "@/lib/cover-letter/company-name";
import type {
  CompanyContextGenerationRequest,
  CompanyContextGenerationResponse,
} from "@/types/company-context";

export async function requestCompanyContextGeneration(
  input: CompanyContextGenerationRequest,
): Promise<CompanyContextGenerationResponse> {
  const response = await fetch("/api/ai/generate-company-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | (CompanyContextGenerationResponse & { error?: string })
    | null;

  if (!response.ok || !payload?.companySummary) {
    throw new Error(payload?.error ?? "Company context generation failed.");
  }

  return payload;
}

export function buildCompanyContextGenerationRequest(input: {
  jobDescriptionText: string;
  companyName: string;
  country?: string;
  website?: string;
  roleTitle?: string;
  additionalInstructions?: string;
  jobDescriptionId?: string;
}): CompanyContextGenerationRequest {
  return {
    jobDescriptionId: input.jobDescriptionId,
    jobDescriptionText: input.jobDescriptionText.trim(),
    companyName: normalizeCompanyDisplayName(input.companyName.trim()) || input.companyName.trim(),
    country: input.country?.trim() || "Singapore",
    website: input.website?.trim() || undefined,
    roleTitle: input.roleTitle?.trim() || undefined,
    additionalInstructions: input.additionalInstructions?.trim() || undefined,
  };
}
