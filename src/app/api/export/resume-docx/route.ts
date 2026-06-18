import { NextResponse } from "next/server";

import { buildResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { generateResumeDocxBuffer } from "@/lib/resume-draft/docx-export";
import {
  isApprovedDraftStatus,
  parseResumeDocxExportRequestBody,
} from "@/lib/resume-draft/export-request";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
import { uploadResumeDocxExport } from "@/lib/supabase/resume-docx-storage";
import {
  createSupabaseClientWithAccessToken,
  getAccessTokenFromRequest,
  getAuthenticatedUserId,
} from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    const userId = await getAuthenticatedUserId(accessToken);
    const supabase = createSupabaseClientWithAccessToken(accessToken);
    const body = parseResumeDocxExportRequestBody(await request.json());

    const draft = await getGeneratedResumeDraftForUser(supabase, body.draftId, userId);
    if (!draft) {
      return NextResponse.json({ error: "Resume draft not found." }, { status: 404 });
    }

    if (!isApprovedDraftStatus(draft.status)) {
      return NextResponse.json(
        { error: "Approve for Export before downloading DOCX." },
        { status: 403 },
      );
    }

    const jobDescription = draft.jobDescriptionId
      ? await getJobDescriptionForUser(supabase, draft.jobDescriptionId, userId)
      : null;

    const documentModel = buildResumeDocumentModel({
      draftId: draft.id,
      draftStatus: draft.status,
      content: draft.content,
      layoutSettings: body.layoutSettings,
      fullName: draft.content.header.fullName,
      companyName: jobDescription?.companyName,
      roleTitle: jobDescription?.roleTitle ?? draft.content.targetRoleTitle,
    });

    const buffer = await generateResumeDocxBuffer(documentModel);

    let uploadResult: Awaited<ReturnType<typeof uploadResumeDocxExport>> | null = null;
    try {
      uploadResult = await uploadResumeDocxExport(supabase, {
        userId,
        draftId: draft.id,
        fileName: documentModel.fileName,
        buffer,
      });
    } catch (storageError) {
      console.warn("Resume DOCX storage upload failed:", storageError);
    }

    if (uploadResult) {
      return NextResponse.json({
        fileName: documentModel.fileName,
        downloadUrl: uploadResult.signedUrl,
        storedFileId: uploadResult.storedFile.id,
        storagePath: uploadResult.storagePath,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${documentModel.fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume DOCX export failed.";
    const status = message.includes("signed in") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
