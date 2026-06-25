import type {
  ResumeBatchRevisionRequest,
  ResumeBatchRevisionResponse,
  ResumeCustomRevisionRequest,
  ResumeCustomRevisionResponse,
} from "@/types/resume-draft";

export async function requestResumeBatchRevision(
  request: ResumeBatchRevisionRequest,
): Promise<ResumeBatchRevisionResponse> {
  const response = await fetch("/api/ai/revise-resume-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

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
  const response = await fetch("/api/ai/revise-resume-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

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
