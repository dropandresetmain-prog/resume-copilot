import { NextResponse } from "next/server";

import { generateCoverLetterDocxBuffer } from "@/lib/cover-letter/docx-export";
import { resolveCoverLetterDocxFileName } from "@/lib/cover-letter/export-filename";
import { assertExportableCoverLetterBody } from "@/lib/cover-letter/generation-validation";
import { getGeneratedCoverLetterDraftForUser } from "@/lib/supabase/generated-cover-letter-drafts";
import { getGeneratedResumeDraftForUser } from "@/lib/supabase/generated-resume-drafts";
import { getJobDescriptionForUser } from "@/lib/supabase/job-descriptions";
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
    const body = (await request.json()) as { draftId?: string };
    if (!body.draftId) {
      return NextResponse.json({ error: "draftId is required." }, { status: 400 });
    }

    const draft = await getGeneratedCoverLetterDraftForUser(supabase, body.draftId, userId);
    if (!draft) {
      return NextResponse.json({ error: "Cover letter draft not found." }, { status: 404 });
    }

    try {
      assertExportableCoverLetterBody(draft.body);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Cover letter is not exportable.",
        },
        { status: 422 },
      );
    }

    const buffer = await generateCoverLetterDocxBuffer(draft.body);
    const resumeDraft = draft.resumeDraftId
      ? await getGeneratedResumeDraftForUser(supabase, draft.resumeDraftId, userId)
      : null;
    const job = draft.jobDescriptionId
      ? await getJobDescriptionForUser(supabase, draft.jobDescriptionId, userId)
      : null;
    const fileName = resolveCoverLetterDocxFileName({
      draft,
      resumeDraft,
      job,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "DOCX export failed." },
      { status: 500 },
    );
  }
}
