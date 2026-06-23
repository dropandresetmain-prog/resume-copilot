import { detectBannedPhrases } from "@/lib/cover-letter/banned-phrases";
import { validateFormalCoverLetterBody } from "@/lib/cover-letter/generation-validation";
import { countWords } from "@/lib/cover-letter/resume-evidence";
import { isOverWordLimit } from "@/lib/cover-letter/word-limits";

export type CoverLetterExportReadiness = {
  clientExportReady: boolean;
  clientBlockingReasons: string[];
  serverExportReady: boolean;
  serverBlockingReasons: string[];
};

/** Client export gates — matches CoverLetterPreviewPageClient `exportBlocked`. */
export function evaluateCoverLetterClientExportReadiness(body: string): {
  exportReady: boolean;
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];
  const trimmed = body.trim();

  if (!trimmed) {
    blockingReasons.push("Cover letter body is empty.");
    return { exportReady: false, blockingReasons };
  }

  const wordCount = countWords(body);
  if (isOverWordLimit(wordCount)) {
    blockingReasons.push(
      `${wordCount} words — shorten to 420 or fewer before export.`,
    );
  }

  const banned = detectBannedPhrases(body);
  if (banned.length > 0) {
    blockingReasons.push(
      `Banned phrasing must be removed before export: ${banned.join(", ")}.`,
    );
  }

  return { exportReady: blockingReasons.length === 0, blockingReasons };
}

/** Server export gates — matches `assertExportableCoverLetterBody`. */
export function evaluateCoverLetterServerExportReadiness(body: string): {
  exportReady: boolean;
  blockingReasons: string[];
} {
  const validation = validateFormalCoverLetterBody(body, {
    strictMax: true,
    checkBannedPhrases: false,
  });
  return {
    exportReady: validation.ok,
    blockingReasons: validation.errors.map((entry) => entry.message),
  };
}

export function evaluateCoverLetterExportReadiness(
  body: string | null | undefined,
): CoverLetterExportReadiness {
  if (!body?.trim()) {
    return {
      clientExportReady: false,
      clientBlockingReasons: ["No cover letter generated."],
      serverExportReady: false,
      serverBlockingReasons: ["No cover letter generated."],
    };
  }

  const client = evaluateCoverLetterClientExportReadiness(body);
  const server = evaluateCoverLetterServerExportReadiness(body);
  return {
    clientExportReady: client.exportReady,
    clientBlockingReasons: client.blockingReasons,
    serverExportReady: server.exportReady,
    serverBlockingReasons: server.blockingReasons,
  };
}
