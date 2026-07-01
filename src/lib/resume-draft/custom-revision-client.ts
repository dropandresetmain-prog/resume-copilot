import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  ResumeBatchRevisionRequest,
  ResumeBatchRevisionResponse,
  ResumeCustomRevisionRequest,
  ResumeCustomRevisionResponse,
  ResumeSingleBulletRevisionRequest,
  ResumeSingleBulletRevisionResponse,
} from "@/types/resume-draft";

async function requestAuthorizedResumeRevision(body: unknown): Promise<Response> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to revise your resume.");
  }

  return fetch("/api/ai/revise-resume-scope", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

export async function requestResumeSingleBulletRevision(
  request: ResumeSingleBulletRevisionRequest,
): Promise<ResumeSingleBulletRevisionResponse> {
  const response = await requestAuthorizedResumeRevision(request);

  const payload = (await response.json().catch(() => null)) as
    | (ResumeSingleBulletRevisionResponse & { error?: string; validationIssues?: string[] })
    | null;

  if (!response.ok || !payload || !Array.isArray(payload.bulletCandidates)) {
    const issues = payload?.validationIssues?.length
      ? ` ${payload.validationIssues.join(" ")}`
      : "";
    throw new Error((payload?.error ?? "Single-bullet revision failed.") + issues);
  }

  return payload;
}

export async function requestResumeBatchRevision(
  request: ResumeBatchRevisionRequest,
): Promise<ResumeBatchRevisionResponse> {
  const response = await requestAuthorizedResumeRevision(request);

  const payload = (await response.json().catch(() => null)) as
    | (ResumeBatchRevisionResponse & { error?: string; validationIssues?: string[] })
    | null;

  if (!response.ok || !payload || !Array.isArray(payload.roleCandidates)) {
    const issues = payload?.validationIssues?.length
      ? ` ${payload.validationIssues.join(" ")}`
      : "";
    throw new Error((payload?.error ?? "Resume batch revision failed.") + issues);
  }

  return payload;
}

export async function requestResumeCustomRevision(
  request: ResumeCustomRevisionRequest,
): Promise<ResumeCustomRevisionResponse> {
  const response = await requestAuthorizedResumeRevision(request);

  const payload = (await response.json().catch(() => null)) as
    | (ResumeCustomRevisionResponse & ResumeBatchRevisionResponse & {
        error?: string;
        validationIssues?: string[];
      })
    | null;

  if (!response.ok || !payload) {
    const issues = payload?.validationIssues?.length
      ? ` ${payload.validationIssues.join(" ")}`
      : "";
    throw new Error((payload?.error ?? "Resume custom revision failed.") + issues);
  }

  if (!payload.scope) {
    throw new Error(payload.error ?? "Resume custom revision failed.");
  }

  return payload;
}
