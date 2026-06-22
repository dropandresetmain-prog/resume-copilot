import type {
  ResumeRoleRewriteRequest,
  ResumeRoleRewriteResponse,
} from "@/types/resume-draft";

export type ResumeRoleRewriteClientError = Error & {
  rawModelResponse?: string;
  statusCode?: number;
  validationIssues?: string[];
};

export async function requestResumeRoleRewrite(
  request: ResumeRoleRewriteRequest,
): Promise<ResumeRoleRewriteResponse> {
  const response = await fetch("/api/ai/rewrite-resume-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | (ResumeRoleRewriteResponse & {
        error?: string;
        rawModelResponse?: string;
        validationIssues?: string[];
      })
    | null;

  if (!response.ok || !payload?.roles) {
    const error = new Error(
      payload?.error ?? "Targeted role rewrite failed.",
    ) as ResumeRoleRewriteClientError;
    error.rawModelResponse = payload?.rawModelResponse;
    error.statusCode = response.status;
    error.validationIssues = payload?.validationIssues;
    throw error;
  }

  return payload;
}
