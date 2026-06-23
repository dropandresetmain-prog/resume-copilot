import {
  generateResumeDraftWithAI,
  getResumeDraftProviderStatus,
  toResumeDraftApiResponse,
} from "@/lib/ai/resume-draft-provider";
import { InvalidModelTierError, parseModelTier } from "@/lib/ai/model-tiers";
import { ResumeDraftParseError } from "@/lib/resume-draft/parse";
import type { ResumeDraftGenerationRequest } from "@/types/resume-draft";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getResumeDraftProviderStatus());
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getResumeDraftProviderStatus();

  try {
    const body = (await request.json()) as ResumeDraftGenerationRequest;

    if (!body?.jobDescription?.id || !body.jobDescription.rawText?.trim()) {
      return NextResponse.json(
        { error: "A valid job description is required." },
        { status: 400 },
      );
    }

    if (!body.referenceResume?.resumeId) {
      return NextResponse.json(
        { error: "A reference resume is required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.experiences)) {
      return NextResponse.json(
        { error: "Invalid resume draft generation payload." },
        { status: 400 },
      );
    }

    if (!body.inputSnapshot?.jobDescriptionId || !body.inputSnapshot.referenceResumeId) {
      return NextResponse.json(
        { error: "Input snapshot is required." },
        { status: 400 },
      );
    }

    let resumeModelTier;
    try {
      resumeModelTier = parseModelTier(body.resumeModelTier);
    } catch (error) {
      if (error instanceof InvalidModelTierError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI resume draft provider is not configured.",
          provider: providerStatus.provider,
          isMock: providerStatus.isMock,
          providerLabel: providerStatus.providerLabel,
          modelName: providerStatus.modelName,
          timestamp,
        },
        { status: 500 },
      );
    }

    const result = await generateResumeDraftWithAI(body, process.env.AI_PROVIDER, {
      modelTier: resumeModelTier,
    });

    const inputSnapshot = {
      ...body.inputSnapshot,
      resumeModelTier,
      modelFallbackApplied: result.modelFallbackApplied,
    };

    return NextResponse.json(
      toResumeDraftApiResponse(result, {
        inputSnapshot,
        modelName: result.modelName,
        requestedModelTier: resumeModelTier,
        modelFallbackApplied: result.modelFallbackApplied,
        timestamp,
      }),
    );
  } catch (error) {
    if (error instanceof ResumeDraftParseError) {
      return NextResponse.json(
        {
          error: error.message,
          rawModelResponse: error.rawModelResponse,
          provider: providerStatus.provider,
          isMock: providerStatus.isMock,
          providerLabel: providerStatus.providerLabel,
          modelName: providerStatus.modelName,
          timestamp,
        },
        { status: 422 },
      );
    }

    const message =
      error instanceof Error ? error.message : "AI resume draft generation failed.";
    return NextResponse.json(
      {
        error: message,
        provider: providerStatus.provider,
        isMock: providerStatus.isMock,
        providerLabel: providerStatus.providerLabel,
        modelName: providerStatus.modelName,
        timestamp,
      },
      { status: 500 },
    );
  }
}
