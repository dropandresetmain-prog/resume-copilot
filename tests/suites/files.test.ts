import { computeBufferHash } from "../../src/lib/storage/file-hash";
import {
  formatStorageBytes,
  normalizeGeneratedDocumentMetadata,
  normalizeOriginalResumeFileMetadata,
} from "../../src/lib/storage/file-metadata";

async function main() {
  const sample = new TextEncoder().encode("resume-copilot-file-hash-test");
  const hashA = await computeBufferHash(
    sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength),
  );
  const hashB = await computeBufferHash(
    sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength),
  );

  const checks: [string, boolean][] = [
    ["hash is 64-char hex", hashA.length === 64],
    ["hash is deterministic", hashA === hashB],
    ["hash is lowercase hex", hashA === hashA.toLowerCase()],
    [
      "normalize original metadata",
      normalizeOriginalResumeFileMetadata({
        fileName: "resume.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 1200,
        uploadedAt: new Date().toISOString(),
        resumeId: "resume-1",
      }).fileName === "resume.docx",
    ],
    [
      "reject empty original filename",
      (() => {
        try {
          normalizeOriginalResumeFileMetadata({
            fileName: "   ",
            fileType: "application/octet-stream",
            fileSize: 1,
            uploadedAt: new Date().toISOString(),
          });
          return false;
        } catch {
          return true;
        }
      })(),
    ],
    [
      "normalize generated metadata",
      normalizeGeneratedDocumentMetadata({
        documentType: "resume_docx",
        fileName: "tailored-resume.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 2048,
        createdAt: new Date().toISOString(),
      }).documentType === "resume_docx",
    ],
    [
      "format storage bytes",
      formatStorageBytes(1536) === "1.5 KB",
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
