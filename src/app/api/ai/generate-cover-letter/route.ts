import {
  generateCoverLetterWithAI,
  getCoverLetterProviderStatus,
  toCoverLetterApiResponse,
} from "@/lib/ai/cover-letter-provider";
import { InvalidModelTierError, parseModelTier } from "@/lib/ai/model-tiers";
import { resolveCompanyDisplayNameForProse } from "@/lib/cover-letter/company-name";
import { CoverLetterParseError } from "@/lib/cover-letter/parse";
import { CoverLetterValidationError } from "@/lib/cover-letter/generation-validation";
import type { CoverLetterGenerationInput } from "@/types/cover-letter-draft";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getCoverLetterProviderStatus());
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getCoverLetterProviderStatus();

  try {
    const body = (await request.json()) as CoverLetterGenerationInput;

    if (!body?.jobDescription?.id || !body.jobDescription.rawText?.trim()) {
      return NextResponse.json({ error: "A valid job description is required." }, { status: 400 });
    }
    if (!body.resumeDraftId?.trim()) {
      return NextResponse.json({ error: "A resume draft id is required." }, { status: 400 });
    }
    if (!body.resumeEvidenceSpine?.trim()) {
      return NextResponse.json({ error: "Resume evidence spine is required." }, { status: 400 });
    }
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    let coverLetterModelTier;
    try {
      coverLetterModelTier = parseModelTier(body.coverLetterModelTier);
    } catch (error) {
      if (error instanceof InvalidModelTierError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const companyNameRaw = body.companyNameRaw?.trim() || body.companyName.trim();
    const reconciledDisplayName = resolveCompanyDisplayNameForProse({
      rawName: companyNameRaw,
      website: body.companyWebsite,
      savedDisplayName: body.companyContext?.displayName,
    }).companyDisplayName;
    const normalizedBody: CoverLetterGenerationInput = {
      ...body,
      companyName: reconciledDisplayName,
      companyDisplayName: reconciledDisplayName,
      companyNameRaw,
      coverLetterModelTier,
      companyContext: {
        ...body.companyContext,
        companyName: reconciledDisplayName,
        displayName: reconciledDisplayName,
      },
    };

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI cover letter provider is not configured.",
          provider: providerStatus.provider,
          isMock: providerStatus.isMock,
          providerLabel: providerStatus.providerLabel,
          modelName: providerStatus.modelName,
          timestamp,
        },
        { status: 500 },
      );
    }

    const result = await generateCoverLetterWithAI(normalizedBody, process.env.AI_PROVIDER, {
      modelTier: coverLetterModelTier,
    });

    return NextResponse.json(
      toCoverLetterApiResponse(result, {
        modelName: result.modelName,
        requestedModelTier: coverLetterModelTier,
        modelFallbackApplied: result.modelFallbackApplied,
        timestamp,
      }),
    );
  } catch (error) {
    if (error instanceof CoverLetterParseError) {
      return NextResponse.json(
        {
          error: error.message,
          rawModelResponse: error.rawText,
          timestamp,
        },
        { status: 422 },
      );
    }
    if (error instanceof CoverLetterValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          timestamp,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cover letter generation failed.",
        timestamp,
      },
      { status: 500 },
    );
  }
}
