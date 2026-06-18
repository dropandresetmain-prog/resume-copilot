import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";

export const RESUME_PDF_MIME = "application/pdf";

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

async function launchPdfBrowser() {
  const executablePath = await resolveExecutablePath();
  const isServerlessBundle = executablePath.includes("chromium");

  return puppeteer.launch({
    args: isServerlessBundle ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: {
      width: Math.round((A4_WIDTH_MM / 25.4) * 96),
      height: Math.round((A4_HEIGHT_MM / 25.4) * 96),
      deviceScaleFactor: 1,
    },
    executablePath,
    headless: true,
  });
}

/**
 * Generate a PDF buffer directly from the canonical resume document model.
 * Uses HTML/CSS rendering — not DOCX conversion.
 */
export async function generateResumePdfBuffer(model: ResumeDocumentModel): Promise<Buffer> {
  const html = renderResumePdfHtml(model);
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
