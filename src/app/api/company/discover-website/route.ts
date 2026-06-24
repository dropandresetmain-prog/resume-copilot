import { NextResponse } from "next/server";

import {
  discoverCompanyWebsite,
  type DiscoverCompanyWebsiteInput,
} from "@/lib/company-context/discover-company-website";
import {
  getAccessTokenFromRequest,
  getAuthenticatedUserId,
} from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    await getAuthenticatedUserId(accessToken);

    const body = (await request.json()) as DiscoverCompanyWebsiteInput;

    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    if (body.confidentialPosting || body.forceJdOnly) {
      return NextResponse.json({
        status: "not_needed",
        candidate: null,
        rejected: [],
        searchConfigured: false,
        costNote: "Website discovery is disabled for confidential or JD-only requests.",
      });
    }

    const result = await discoverCompanyWebsite(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Company website discovery failed.";
    const status = message.includes("signed in") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
