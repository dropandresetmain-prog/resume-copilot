import { GEMINI_MODEL } from "@/lib/ai/config";
import {
  rewriteMockResumeRole,
  type ResumeRoleRewriteResult,
} from "@/lib/ai/resume-role-rewrite-mock";
import { rewriteResumeRoleWithGemini } from "@/lib/ai/resume-role-rewrite-gemini";
import { getProviderLabel, resolveProviderId } from "@/lib/ai/provider";
import type { AIProviderId } from "@/lib/ai/types";
import type { ResumeRoleRewritePromptInput } from "@/lib/resume-draft/role-rewrite-prompt";

export async function rewriteResumeRoleWithAI(
  input: ResumeRoleRewritePromptInput,
  providerId?: string | null,
): Promise<ResumeRoleRewriteResult & { providerId: AIProviderId }> {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    const result = await rewriteResumeRoleWithGemini(input, apiKey);
    return { ...result, providerId: "gemini" };
  }

  if (provider === "openai") {
    throw new Error("OpenAI resume role rewrite is not implemented yet.");
  }

  return {
    ...rewriteMockResumeRole(input),
    providerId: "mock",
  };
}

export function getResumeRoleRewriteModelName(providerId?: string | null): string | undefined {
  const provider = resolveProviderId(providerId ?? process.env.AI_PROVIDER);
  return provider === "gemini" ? GEMINI_MODEL : undefined;
}

export function getResumeRoleRewriteProviderLabel(providerId?: string | null): string {
  return getProviderLabel(resolveProviderId(providerId ?? process.env.AI_PROVIDER));
}
