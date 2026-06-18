import { enrichInventoryWithAI, toEnrichmentApiResponse } from "@/lib/ai/provider";
import type { EnrichmentInventoryInput } from "@/lib/enrichment/payload";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as EnrichmentInventoryInput;

    if (!input?.bullets || !Array.isArray(input.bullets)) {
      return NextResponse.json(
        { error: "Invalid enrichment payload." },
        { status: 400 },
      );
    }

    const result = await enrichInventoryWithAI(input, process.env.AI_PROVIDER);
    return NextResponse.json(toEnrichmentApiResponse(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI enrichment failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
