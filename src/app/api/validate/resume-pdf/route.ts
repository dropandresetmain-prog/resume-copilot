import { NextResponse } from "next/server";

import { parseResumeExportRequestBody } from "@/lib/resume-draft/export-request";
import { ExportRequestError } from "@/lib/resume-draft/resolve-export-request";
import { validateResumePdfExport } from "@/lib/resume-draft/validate-resume-pdf-export";
import {
  createSupabaseClientWithAccessToken,
  getAccessTokenFromRequest,
  getAuthenticatedUserId,
} from "@/lib/supabase/server-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    const userId = await getAuthenticatedUserId(accessToken);
    const supabase = createSupabaseClientWithAccessToken(accessToken);
    const body = parseResumeExportRequestBody(await request.json());

    const { validation } = await validateResumePdfExport({
      supabase,
      userId,
      draftId: body.draftId,
      layoutSettings: body.layoutSettings,
    });

    return NextResponse.json({
      pageCount: validation.pageCount,
      valid: validation.valid,
      message: validation.message,
      suggestedActions: validation.suggestedActions,
      contentHeightPx: validation.contentHeightPx,
      overflowPx: validation.overflowPx,
      overflowMm: validation.overflowMm,
    });
  } catch (error) {
    if (error instanceof ExportRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Resume PDF validation failed.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
