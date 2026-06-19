import { NextResponse } from "next/server";

import {
  buildExportResumeDocumentModel,
  findReferenceResumeInInventory,
} from "@/lib/resume-draft/build-export-document-model";
import {
  isApprovedDraftStatus,
  parseResumePdfExportRequestBody,
} from "@/lib/resume-draft/export-request";
import { generateResumePdfBuffer } from "@/lib/resume-draft/pdf-export";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
import { getResumeInventoryForUser } from "@/lib/supabase/resume-inventories";
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

    const jobDescription = draft.jobDescriptionId
      ? await getJobDescriptionForUser(supabase, draft.jobDescriptionId, userId)
      : null;

    const inventory = await getResumeInventoryForUser(supabase, userId);
    const referenceResume = inventory
      ? findReferenceResumeInInventory(inventory.resumes, draft.referenceResumeId)
      : null;

    const documentModel = buildExportResumeDocumentModel({
      draft,
      jobDescription,
      referenceResume,
      layoutSettings: body.layoutSettings,
    });

    const buffer = await generateResumePdfBuffer(documentModel);
    const warnings: string[] = [];
    if (documentModel.pageFit.exceedsOnePage) {
      warnings.push(
        `Preview layout exceeds one-page target (~${documentModel.pageFit.estimatedPages.toFixed(1)} pages). PDF exported with current settings.`,
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
        warnings,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${documentModel.pdfFileName}"`,
        ...(warnings.length > 0 ? { "X-Export-Warnings": warnings.join(" ") } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume PDF export failed.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
