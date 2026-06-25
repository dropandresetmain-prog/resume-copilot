import type {
  ResumeCustomRevisionRequest,
  ResumeCustomRevisionResponse,
} from "@/types/resume-draft";

export async function requestResumeCustomRevision(
  request: ResumeCustomRevisionRequest,
): Promise<ResumeCustomRevisionResponse> {
  const response = await fetch("/api/ai/revise-resume-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | (ResumeCustomRevisionResponse & { error?: string; validationIssues?: string[] })
    | null;

  if (!response.ok || !payload?.scope) {
    const issues = payload?.validationIssues?.length
      ? ` ${payload.validationIssues.join(" ")}`
      : "";
    throw new Error((payload?.error ?? "Resume custom revision failed.") + issues);
  }

  return payload;
}
