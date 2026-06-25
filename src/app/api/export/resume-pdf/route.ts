import { NextResponse } from "next/server";

import {
  isApprovedDraftStatus,
  parseResumePdfExportRequestBody,
} from "@/lib/resume-draft/export-request";
import { areExportLayoutSettingsEqual } from "@/lib/resume-draft/export-layout-settings";
import { generateResumePdfResult } from "@/lib/resume-draft/pdf-export";
import { buildOnePageExportBlockedJson } from "@/lib/resume-draft/pdf-export-validation";
import { ExportRequestError, resolveExportDocumentModelForDraft } from "@/lib/resume-draft/resolve-export-request";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { uploadResumePdfExport } from "@/lib/supabase/resume-pdf-storage";
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
    const body = parseResumePdfExportRequestBody(await request.json());

    const draft = await getGeneratedResumeDraftForUser(supabase, body.draftId, userId);
    if (!draft) {
      return NextResponse.json({ error: "Resume draft not found." }, { status: 404 });
    }

    if (!isApprovedDraftStatus(draft.status)) {
      return NextResponse.json(
        { error: "Approve for Export before downloading PDF." },
        { status: 403 },
      );
    }

    if (
      !areExportLayoutSettingsEqual(draft.content.exportLayoutSettings, body.layoutSettings ?? {})
    ) {
      return NextResponse.json(
        { error: "Layout changed after approval — re-approve for Export before downloading." },
        { status: 403 },
      );
    }

    const { documentModel } = await resolveExportDocumentModelForDraft(
      supabase,
      userId,
      body.draftId,
      body.layoutSettings,
    );

    const { buffer, pageCount, fitMeasurement } = await generateResumePdfResult(documentModel);

    if (pageCount > 1) {
      return NextResponse.json(
        buildOnePageExportBlockedJson({
          pageCount,
          fitMeasurement,
          layoutSettings: documentModel.layoutSettings,
          hasAdditionalExperience: documentModel.layout.additionalExperienceEntries.length > 0,
        }),
        { status: 422 },
      );
    }

    let uploadResult: Awaited<ReturnType<typeof uploadResumePdfExport>> | null = null;
    try {
      uploadResult = await uploadResumePdfExport(supabase, {
        userId,
        draftId: draft.id,
        fileName: documentModel.pdfFileName,
        buffer,
      });
    } catch (storageError) {
      console.warn("Resume PDF storage upload failed:", storageError);
    }

    if (uploadResult) {
      return NextResponse.json({
        fileName: documentModel.pdfFileName,
        downloadUrl: uploadResult.signedUrl,
        storedFileId: uploadResult.storedFile.id,
        storagePath: uploadResult.storagePath,
        pageCount,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${documentModel.pdfFileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof ExportRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Resume PDF export failed.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
