import mammoth from "mammoth";

import { parseResumeContent } from "@/lib/parser/pipeline";
import type { ParsedResume } from "@/types/resume";

function createId(): string {
  return crypto.randomUUID();
}

/**
 * Parse a DOCX resume file into structured sections.
 * Runs client-side; the file never leaves the browser.
 */
export async function parseDocxResume(file: File): Promise<ParsedResume> {
  const resumeId = createId();

  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Only .docx files are supported.");
  }

  const arrayBuffer = await file.arrayBuffer();

  let text: string;
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read DOCX file.";
    throw new Error(message);
  }

  if (!text.trim()) {
    throw new Error("The DOCX file appears to be empty or unreadable.");
  }

  const parsed = parseResumeContent(text, resumeId, createId);

  return {
    id: resumeId,
    filename: file.name,
    uploadedAt: new Date().toISOString(),
    ...parsed,
  };
}

/** Exposed for parser tests without reading DOCX files. */
export function parseResumeTextForTest(
  text: string,
  resumeId = "test-resume",
): ParsedResume {
  return {
    id: resumeId,
    filename: "test.docx",
    uploadedAt: new Date().toISOString(),
    ...parseResumeContent(text, resumeId, createId),
  };
}

export { parseResumeContent } from "@/lib/parser/pipeline";
