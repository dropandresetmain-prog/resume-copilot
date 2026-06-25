import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import {
  measureResumePdfFitFromContentHeight,
  type PdfFitMeasurement,
} from "@/lib/resume-draft/pdf-fit-measurement";
import { countPdfPages } from "@/lib/resume-draft/pdf-page-count";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/resume-draft/preview-settings";
import { renderResumePdfHtml } from "@/lib/resume-draft/pdf-html";
import { RESUME_PDF_HTML_A4_MARKER } from "@/lib/resume-draft/resume-layout-styles";

export const RESUME_PDF_MIME = "application/pdf";

export type ResumePdfGenerationResult = {
  buffer: Buffer;
  pageCount: number;
  fitMeasurement: PdfFitMeasurement;
};

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

/** Wait for font layout to settle before print; no-op when FontFaceSet is unavailable. */
export async function waitForPdfDocumentFonts(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>["newPage"]>>,
): Promise<void> {
  await page.evaluate(async () => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}

/** Measure rendered content height in Puppeteer — same scrollHeight marker as browser preview. */
export async function measureResumePdfFitInPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>["newPage"]>>,
  pageMarkerClass: string = RESUME_PDF_HTML_A4_MARKER,
): Promise<PdfFitMeasurement> {
  const contentHeightPx = await page.evaluate((markerClass) => {
    const el = document.querySelector(`.${markerClass}`);
    return el ? el.scrollHeight : 0;
  }, pageMarkerClass);

  return measureResumePdfFitFromContentHeight(contentHeightPx);
}

/**
 * Generate a PDF buffer and page count from the canonical resume document model.
 * Uses HTML/CSS rendering — not DOCX conversion.
 */
export async function generateResumePdfResult(
  model: ResumeDocumentModel,
): Promise<ResumePdfGenerationResult> {
  const html = renderResumePdfHtml(model);
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await waitForPdfDocumentFonts(page);
    const fitMeasurement = await measureResumePdfFitInPage(page);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    const buffer = Buffer.from(pdf);
    const pageCount = await countPdfPages(buffer);
    return { buffer, pageCount, fitMeasurement };
  } finally {
    await browser.close();
  }
}

/**
 * Generate a PDF buffer directly from the canonical resume document model.
 * Uses HTML/CSS rendering — not DOCX conversion.
 */
export async function generateResumePdfBuffer(model: ResumeDocumentModel): Promise<Buffer> {
  const result = await generateResumePdfResult(model);
  return result.buffer;
}
