import { NextResponse } from "next/server";

import {
  extractInventoryTextWithAI,
  getInventoryTextExtractionProviderStatus,
  toInventoryTextExtractionApiResponse,
} from "@/lib/ai/inventory-text-extraction-provider";
import { InventoryTextExtractionParseError } from "@/lib/inventory-text-extraction/parse";
import type { InventoryTextExtractionRequest } from "@/types/inventory-text-extraction";

export async function GET() {
  return NextResponse.json(getInventoryTextExtractionProviderStatus());
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  const providerStatus = getInventoryTextExtractionProviderStatus();

  try {
    const body = (await request.json()) as InventoryTextExtractionRequest;

    if (!body?.pastedText || typeof body.pastedText !== "string") {
      return NextResponse.json(
        { error: "pastedText is required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.existingExperiences)) {
      return NextResponse.json(
        { error: "existingExperiences must be an array." },
        { status: 400 },
      );
    }

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          error:
            providerStatus.configurationError ??
            "AI provider is not configured for inventory text extraction.",
          provider: providerStatus.provider,
          isMock: providerStatus.isMock,
          providerLabel: providerStatus.providerLabel,
          modelName: providerStatus.modelName,
          timestamp,
        },
        { status: 500 },
      );
    }

    const result = await extractInventoryTextWithAI(body, process.env.AI_PROVIDER);
    return NextResponse.json(
      toInventoryTextExtractionApiResponse(result, {
        modelName: providerStatus.modelName,
        timestamp,
      }),
    );
  } catch (error) {
    if (error instanceof InventoryTextExtractionParseError) {
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
      error instanceof Error ? error.message : "Inventory text extraction failed.";
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
