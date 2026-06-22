import { NextResponse } from "next/server";

import {
  generateCompanyContextWithAI,
  getCompanyContextProviderStatus,
  toCompanyContextApiResponse,
} from "@/lib/ai/company-context-provider";
import { CompanyContextParseError } from "@/lib/company-context/parse";
import type { CompanyContextGenerationRequest } from "@/types/company-context";

export async function GET() {
  return NextResponse.json(getCompanyContextProviderStatus());
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getCompanyContextProviderStatus();

  try {
    const body = (await request.json()) as CompanyContextGenerationRequest;

    if (!body?.jobDescriptionText?.trim()) {
      return NextResponse.json({ error: "Job description text is required." }, { status: 400 });
    }
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI company context provider is not configured.",
          timestamp,
        },
        { status: 500 },
      );
    }

    const result = await generateCompanyContextWithAI(body, process.env.AI_PROVIDER);

    return NextResponse.json(
      toCompanyContextApiResponse(result, {
        modelName: providerStatus.modelName,
        timestamp,
      }),
    );
  } catch (error) {
    if (error instanceof CompanyContextParseError) {
      return NextResponse.json(
        { error: error.message, rawModelResponse: error.rawText, timestamp },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Company context generation failed.",
        timestamp,
      },
      { status: 500 },
    );
  }
}
