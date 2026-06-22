import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatApplicationLabel } from "../src/lib/application/labels";
import { splitCoverLetterParagraphs } from "../src/lib/cover-letter/format-body";
import {
  formatCompanyNameForDisplay,
  isUrlLikeCompanyName,
} from "../src/lib/cover-letter/company-name";
import {
  buildCoverLetterDocxFileName,
  buildResumeExportFileNameInput,
  buildResumePdfFileName,
} from "../src/lib/resume-draft/export-filename";
import { formatSavedJobLabel } from "../src/lib/jd/labels";

function main() {
  const coverLetterPanel = readFileSync(
    join(process.cwd(), "src/components/application-package/ApplicationPackageCoverLetterPanel.tsx"),
    "utf8",
  );
  const companyPanel = readFileSync(
    join(process.cwd(), "src/components/company-context/CompanyContextPreviewPanel.tsx"),
    "utf8",
  );
  const coverLetterPreview = readFileSync(
    join(process.cwd(), "src/components/pages/CoverLetterPreviewPageClient.tsx"),
    "utf8",
  );
  const resumeEdit = readFileSync(
    join(process.cwd(), "src/components/pages/ResumeDraftEditPageClient.tsx"),
    "utf8",
  );
  const resolveExport = readFileSync(
    join(process.cwd(), "src/lib/resume-draft/resolve-export-request.ts"),
    "utf8",
  );

  const urlCompany = "https://shelfperfect.com/";
  const savedDisplay = "ShelfPerfect";

  const displayChecks: [string, boolean][] = [
    [
      "URL company name normalizes with saved display",
      formatCompanyNameForDisplay({
        rawName: urlCompany,
        website: urlCompany,
        savedDisplayName: savedDisplay,
      }) === "ShelfPerfect",
    ],
    [
      "URL-only job label uses brand not hostname",
      formatSavedJobLabel({
        companyName: urlCompany,
        roleTitle: "B2B Sales Manager",
        rawText: "",
        jobUrl: urlCompany,
      }).includes("Shelfperfect"),
    ],
    [
      "application record label uses display name",
      formatApplicationLabel(
        {
          id: "app-1",
          companyName: urlCompany,
          roleTitle: "B2B Sales Manager",
          status: "resume_generated",
          createdAt: "",
          updatedAt: "",
          companyContext: {
            companyName: urlCompany,
            displayName: savedDisplay,
            website: urlCompany,
            sourceType: "website_research",
            companySummary: "FMCG retail execution platform.",
            productsAndServices: [],
            likelyHiringPriorities: [],
            suggestedNarrativeAngles: [],
            confidence: "medium",
            limitations: [],
            generatedAt: "2026-06-18T00:00:00.000Z",
          },
        },
        {
          id: "jd-1",
          rawText: "",
          companyName: urlCompany,
          roleTitle: "B2B Sales Manager",
          createdAt: "",
          updatedAt: "",
        },
      ) === "B2B Sales Manager @ ShelfPerfect",
    ],
    ["URL-like detection", isUrlLikeCompanyName(urlCompany)],
  ];

  const exportChecks: [string, boolean][] = [
    [
      "resume PDF export filename",
      buildResumePdfFileName(
        buildResumeExportFileNameInput({
          fullName: "Hset Min Htet",
          job: { companyName: urlCompany, roleTitle: "B2B Sales Manager", jobUrl: urlCompany },
          companyContext: { displayName: savedDisplay, website: urlCompany },
        }),
      ) === "Hset Min Htet - Resume_ShelfPerfect_B2B Sales Manager.pdf",
    ],
    [
      "cover letter DOCX export filename",
      buildCoverLetterDocxFileName({
        fullName: "Hset Min Htet",
        companyName: savedDisplay,
        roleTitle: "B2B Sales Manager",
      }) === "Hset Min Htet - Cover Letter_ShelfPerfect_B2B Sales Manager.pdf".replace(
        ".pdf",
        ".docx",
      ),
    ],
  ];

  const uxChecks: [string, boolean][] = [
    ["cover letter paragraphs split for inline view", coverLetterPanel.includes("splitCoverLetterParagraphs")],
    ["cover letter serif readable styling", coverLetterPanel.includes("font-serif")],
    ["company research summary preview when collapsed", companyPanel.includes("summaryPreview")],
    ["company research feeds cover letter note", companyPanel.includes("Feeds cover letter generation")],
    ["cover letter preview uses display company", coverLetterPreview.includes("formatCompanyNameForDisplay")],
    ["resume editor back to application package", resumeEdit.includes("Back to application package")],
    ["export resolver loads company context", resolveExport.includes("loadCompanyContextForDraft")],
    [
      "cover letter paragraph splitter handles blank lines",
      splitCoverLetterParagraphs("Dear team,\n\nI am excited to apply.").length === 2,
    ],
  ];

  for (const [name, ok] of [...displayChecks, ...exportChecks, ...uxChecks]) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if ([...displayChecks, ...exportChecks, ...uxChecks].some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll workflow paper cuts checks passed.");
}

main();
