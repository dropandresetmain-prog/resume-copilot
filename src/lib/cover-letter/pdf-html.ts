import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderCoverLetterPdfHtml(content: string): string {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const body = paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => escapeHtml(line));
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${A4_WIDTH_MM}mm ${A4_HEIGHT_MM}mm; margin: 25mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111;
      margin: 0;
    }
    p { margin: 0 0 12pt; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}
