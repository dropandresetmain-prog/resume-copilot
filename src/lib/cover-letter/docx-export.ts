import { Document, Packer, Paragraph, TextRun } from "docx";

export const COVER_LETTER_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function generateCoverLetterDocxBuffer(content: string): Promise<Buffer> {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lines = part.split("\n");
      return new Paragraph({
        spacing: { after: 200 },
        children: lines.flatMap((line, index) => {
          const runs = [new TextRun({ text: line, font: "Times New Roman", size: 22 })];
          if (index < lines.length - 1) {
            runs.push(new TextRun({ break: 1 }));
          }
          return runs;
        }),
      });
    });

  const document = new Document({
    sections: [{ children: paragraphs }],
  });

  return Buffer.from(await Packer.toBuffer(document));
}
