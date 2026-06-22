import { NextResponse } from "next/server";

import { generateCoverLetterPdfBuffer } from "@/lib/cover-letter/pdf-export";
import { getGeneratedCoverLetterDraftForUser } from "@/lib/supabase/generated-cover-letter-drafts";
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
    const body = (await request.json()) as { draftId?: string };
    if (!body.draftId) {
      return NextResponse.json({ error: "draftId is required." }, { status: 400 });
    }

    const draft = await getGeneratedCoverLetterDraftForUser(supabase, body.draftId, userId);
    if (!draft) {
      return NextResponse.json({ error: "Cover letter draft not found." }, { status: 404 });
    }

    const buffer = await generateCoverLetterPdfBuffer(draft.body);
    const fileName = `cover-letter-${draft.id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF export failed." },
      { status: 500 },
    );
  }
}
