import { callGeminiWithRetry } from "@/lib/ai/call-gemini";
import {
  parseResumeRoleRewriteJson,
  ResumeRoleRewriteParseError,
} from "@/lib/resume-draft/role-rewrite-parse";
import { buildResumeRoleRewritePrompt } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeRoleRewritePromptInput } from "@/lib/resume-draft/role-rewrite-prompt";
import type { ResumeRoleRewriteResult } from "@/lib/ai/resume-role-rewrite-mock";

export async function rewriteResumeRoleWithGemini(
  input: ResumeRoleRewritePromptInput,
  apiKey: string,
): Promise<ResumeRoleRewriteResult> {
  const prompt = buildResumeRoleRewritePrompt(input);
  const { text } = await callGeminiWithRetry({
    apiKey,
    prompt,
    temperature: 0.2,
    responseMimeType: "application/json",
  });

  try {
    return parseResumeRoleRewriteJson(text);
  } catch (error) {
    if (error instanceof ResumeRoleRewriteParseError) {
      throw error;
    }
    throw error;
  }
}
