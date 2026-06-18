import {
  enrichInventoryWithAI,
  getProviderStatus,
  toEnrichmentApiResponse,
} from "@/lib/ai/provider";
import { EnrichmentParseError } from "@/lib/ai/parse-enrichment-response";
import {
  resolveEnrichmentInput,
  type EnrichmentBatchMode,
} from "@/lib/enrichment/batch";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import { NextResponse } from "next/server";

type EnrichmentRequestBody = EnrichmentInventoryInput & {
  mode?: EnrichmentBatchMode;
  maxBullets?: number;
};

export async function GET() {
  return NextResponse.json(getProviderStatus());
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getProviderStatus();

  try {
    const body = (await request.json()) as EnrichmentRequestBody;

    if (!body?.bullets || !Array.isArray(body.bullets)) {
      return NextResponse.json(
        { error: "Invalid enrichment payload." },
        { status: 400 },
      );
    }

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI enrichment provider is not configured.",
          provider: providerStatus.provider,
          isMock: providerStatus.isMock,
          providerLabel: providerStatus.providerLabel,
          modelName: providerStatus.modelName,
          timestamp,
        },
        { status: 500 },
      );
    }

    const mode = body.mode ?? "full";
    const input = resolveEnrichmentInput(
      { bullets: body.bullets },
      mode,
      body.maxBullets,
    );

    const result = await enrichInventoryWithAI(input, process.env.AI_PROVIDER);
    return NextResponse.json(
      toEnrichmentApiResponse(result, {
        batchMode: mode,
        bulletsSent: input.bullets.length,
        modelName: providerStatus.modelName,
        timestamp,
      }),
    );
  } catch (error) {
    if (error instanceof EnrichmentParseError) {
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
      error instanceof Error ? error.message : "AI enrichment failed.";
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
