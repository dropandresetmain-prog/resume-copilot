import { NextResponse } from "next/server";

import { RESUME_DRAFT_STATUS_APPROVED } from "@/lib/resume-draft/draft-status";
import { parseResumeExportRequestBody } from "@/lib/resume-draft/export-request";
import { sanitizeExportLayoutSettings } from "@/lib/resume-draft/export-layout-settings";
import { buildOnePageExportBlockedFromValidation } from "@/lib/resume-draft/pdf-export-validation";
import { ExportRequestError } from "@/lib/resume-draft/resolve-export-request";
import { validateResumePdfExport } from "@/lib/resume-draft/validate-resume-pdf-export";
import { mapGeneratedResumeDraftRow } from "@/lib/supabase/generated-resume-drafts";
import type { GeneratedResumeDraftRow } from "@/lib/supabase/types";
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

    const exportLayoutSettings = sanitizeExportLayoutSettings(body.layoutSettings);
    if (!exportLayoutSettings) {
      return NextResponse.json({ error: "Valid layout settings are required to approve." }, { status: 400 });
    }

    const { draft, validation } = await validateResumePdfExport({
      supabase,
      userId,
      draftId: body.draftId,
      layoutSettings: exportLayoutSettings,
    });

    if (!validation.valid) {
      return NextResponse.json(buildOnePageExportBlockedFromValidation(validation), { status: 422 });
    }

    const validatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("generated_resume_drafts")
      .update({
        content: {
          ...draft.content,
          exportLayoutSettings,
          serverPdfValidation: {
            pageCount: validation.pageCount,
            validatedAt,
          },
        },
        status: RESUME_DRAFT_STATUS_APPROVED,
        updated_at: validatedAt,
      })
      .eq("id", draft.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to approve draft for export." },
        { status: 400 },
      );
    }

    const mapped = mapGeneratedResumeDraftRow(data as GeneratedResumeDraftRow);
    if (!mapped) {
      return NextResponse.json({ error: "Approved draft has invalid content." }, { status: 400 });
    }

    return NextResponse.json({
      draft: mapped,
      pageCount: validation.pageCount,
      valid: true,
    });
  } catch (error) {
    if (error instanceof ExportRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Approve for export failed.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
