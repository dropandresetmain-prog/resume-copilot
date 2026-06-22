import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

import { renderCoverLetterPdfHtml } from "@/lib/cover-letter/pdf-html";
import { countPdfPages } from "@/lib/resume-draft/pdf-page-count";
import { waitForPdfDocumentFonts } from "@/lib/resume-draft/pdf-export";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";

export const COVER_LETTER_PDF_MIME = "application/pdf";

const LOCAL_CHROME_CANDIDATES = [
  process.env.LOCAL_CHROME_PATH,
  process.env.CHROME_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

async function resolveExecutablePath(): Promise<string> {
  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return chromium.executablePath();
}

export async function generateCoverLetterPdfBuffer(content: string): Promise<Buffer> {
  const html = renderCoverLetterPdfHtml(content);
  const executablePath = await resolveExecutablePath();
  const isServerlessBundle = executablePath.includes("chromium");
  const browser = await puppeteer.launch({
    args: isServerlessBundle ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: {
      width: Math.round((A4_WIDTH_MM / 25.4) * 96),
      height: Math.round((A4_HEIGHT_MM / 25.4) * 96),
      deviceScaleFactor: 1,
    },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await waitForPdfDocumentFonts(page);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    const buffer = Buffer.from(pdf);
    const pageCount = await countPdfPages(buffer);
    if (pageCount > 1) {
      throw new Error("Cover letter PDF exceeded one page.");
    }
    return buffer;
  } finally {
    await browser.close();
  }
}
