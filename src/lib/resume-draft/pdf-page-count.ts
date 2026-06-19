import { PDFDocument } from "pdf-lib";

/** Count pages in a generated PDF buffer (server export truth). */
export async function countPdfPages(buffer: Buffer | Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}
