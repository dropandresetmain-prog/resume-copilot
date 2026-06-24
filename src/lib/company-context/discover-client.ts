import type { CompanyWebsiteDiscoveryResult } from "@/lib/company-context/discover-company-website";
import { getSupabaseClient } from "@/lib/supabase/client";

export type DiscoverCompanyWebsiteRequest = {
  companyName: string;
  roleTitle?: string;
  country?: string;
  jobDescriptionText?: string;
  confidentialPosting?: boolean;
  companyWebsiteInput?: string;
  outputMode?: "resume_only" | "resume_and_cover_letter" | "cover_letter_only";
  forceJdOnly?: boolean;
};

async function getDiscoveryAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Sign in required to discover company websites.");
  }
  return accessToken;
}

export async function requestCompanyWebsiteDiscovery(
  body: DiscoverCompanyWebsiteRequest,
): Promise<CompanyWebsiteDiscoveryResult> {
  const accessToken = await getDiscoveryAccessToken();
  const response = await fetch("/api/company/discover-website", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as CompanyWebsiteDiscoveryResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Company website discovery failed.");
  }

  return payload;
}
