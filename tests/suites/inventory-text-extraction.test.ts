import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { buildActiveCollatedInventory } from "../../src/lib/inventory/active-collated";
import { buildTextImportBulletKey, normalizeInventoryEdits } from "../../src/lib/inventory/edits";
import {
  auditProjectLikeOverlayPollution,
  moveProjectOverlayToAdditionalExperience,
} from "../../src/lib/inventory/project-overlay-audit";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { applyAcceptedInventoryTextSuggestions } from "../../src/lib/inventory-text-extraction/apply";
import { classifyInventoryTextSuggestionApplyability } from "../../src/lib/inventory-text-extraction/classify";
import { flagDuplicateInventoryTextSuggestions } from "../../src/lib/inventory-text-extraction/duplicate-preview";
import { extractInventoryTextWithMock } from "../../src/lib/inventory-text-extraction/mock";
import {
  InventoryTextExtractionParseError,
  parseInventoryTextExtractionJson,
} from "../../src/lib/inventory-text-extraction/parse";
import {
  buildInventoryTextExtractionPrompt,
  promptForbidsFabrication,
  promptKeepsProjectsOutOfWorkExperience,
} from "../../src/lib/inventory-text-extraction/prompt";
import { createEmptyInventoryEdits } from "../../src/types/inventory-edits";
import type { InventoryState } from "../../src/types/resume";
import type { ReviewedInventoryTextSuggestion } from "../../src/types/inventory-text-extraction";

function buildSampleInventory(): InventoryState {
  return {
    resumes: [
      {
        id: "resume-1",
        filename: "resume.docx",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        workExperiences: [
          {
            id: "exp-1",
            sourceResumeId: "resume-1",
            company: "Acme Corp",
            descriptor: "",
            location: "",
            role: "Product Manager",
            dateRange: "2020 - 2024",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "b-1",
                parentId: "exp-1",
                keyword: "Growth",
                description: "Grew annual revenue 40% through enterprise partnerships",
                rawBulletText: "Grew annual revenue 40% through enterprise partnerships",
              },
            ],
          },
        ],
        education: [],
        additionalExperience: {
          id: "additional-1",
          sourceResumeId: "resume-1",
          title: "Additional",
          lines: [],
          rawText: "",
          parseWarnings: [],
        },
        skills: {
          id: "skills-1",
          sourceResumeId: "resume-1",
          languages: [],
          technicalSkills: ["SQL"],
          interests: [],
          other: [],
          rawText: "",
          parseWarnings: [],
        },
        unparsedSections: [],
        parseWarnings: [],
      },
    ],
    failures: [],
    enrichment: createEmptyEnrichmentState(),
    edits: createEmptyInventoryEdits(),
  };
}

function reviewed(
  suggestion: Omit<ReviewedInventoryTextSuggestion, "reviewStatus"> & {
    reviewStatus?: ReviewedInventoryTextSuggestion["reviewStatus"];
  },
): ReviewedInventoryTextSuggestion {
  return {
    ...suggestion,
    reviewStatus: suggestion.reviewStatus ?? "accepted",
  };
}

function main() {
  const inventory = buildSampleInventory();
  const collated = buildCollatedInventory(inventory);
  const experienceKey = "acme corp::product manager";

  const prompt = buildInventoryTextExtractionPrompt({
    pastedText: "Led CRM automation for partner onboarding at Acme Corp.",
    existingExperiences: [
      {
        company: "Acme Corp",
        role: "Product Manager",
        experienceKey,
      },
    ],
  });

  let parseError: InventoryTextExtractionParseError | null = null;
  try {
    parseInventoryTextExtractionJson("{ not json", "mock");
  } catch (error) {
    parseError = error as InventoryTextExtractionParseError;
  }

  const emptyParse = parseInventoryTextExtractionJson(
    JSON.stringify({ sufficient: false, suggestions: [] }),
    "mock",
  );

  const mockExtract = extractInventoryTextWithMock({
    pastedText: [
      "Skills: Python, Stakeholder Management",
      "Keywords: Product Operations, CRM",
      "- Built partner onboarding automation reducing cycle time 30%",
    ].join("\n"),
    existingExperiences: [
      {
        company: "Acme Corp",
        role: "Product Manager",
        experienceKey,
      },
    ],
  });

  const duplicateSuggestion = flagDuplicateInventoryTextSuggestions(
    [
      {
        id: "dup-1",
        kind: "bullet_existing_experience",
        category: "bullets",
        text: "Grew annual revenue 40% through enterprise partnerships",
        company: "Acme Corp",
        role: "Product Manager",
        matchLabel: "add_to_existing",
        mappedExperienceKey: experienceKey,
        warnings: [],
        applyability: "applyable",
      },
    ],
    collated,
  )[0];

  const acceptedBullet = reviewed({
    id: "apply-1",
    kind: "bullet_existing_experience",
    category: "bullets",
    text: "Automated partner onboarding workflows with CRM integrations",
    company: "Acme Corp",
    role: "Product Manager",
    matchLabel: "add_to_existing",
    mappedExperienceKey: experienceKey,
    warnings: [],
    applyability: "applyable",
  });

  const rejectedBullet = reviewed({
    id: "reject-1",
    kind: "bullet_existing_experience",
    category: "bullets",
    text: "Should not apply",
    company: "Acme Corp",
    role: "Product Manager",
    matchLabel: "add_to_existing",
    mappedExperienceKey: experienceKey,
    warnings: [],
    applyability: "applyable",
    reviewStatus: "rejected",
  });

  const acceptedKeyword = reviewed({
    id: "kw-1",
    kind: "keyword",
    category: "keywords",
    text: "Product Operations",
    matchLabel: "standalone",
    warnings: [],
    applyability: "applyable",
  });

  const applyResult = applyAcceptedInventoryTextSuggestions(
    [acceptedBullet, rejectedBullet, acceptedKeyword],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const newExperience = reviewed({
    id: "exp-new",
    kind: "new_work_experience",
    category: "work_experience",
    text: "Growth Lead at Socius — 2022-2024",
    company: "Socius",
    role: "Growth Lead",
    dateRange: "2022 - 2024",
    matchLabel: "new_experience",
    warnings: [],
    applyability: "applyable",
  });

  const newExperienceBullet = reviewed({
    id: "bullet-new",
    kind: "bullet_new_experience",
    category: "bullets",
    text: "Scaled partner channel revenue 2x in 18 months",
    company: "Socius",
    role: "Growth Lead",
    matchLabel: "new_experience",
    warnings: [],
    applyability: "applyable",
  });

  const duplicateAcceptedBullet = reviewed({
    id: "dup-apply",
    kind: "bullet_existing_experience",
    category: "bullets",
    text: "Grew annual revenue 40% through enterprise partnerships",
    company: "Acme Corp",
    role: "Product Manager",
    matchLabel: "add_to_existing",
    mappedExperienceKey: experienceKey,
    warnings: [],
    applyability: "applyable",
    duplicateOfBulletKey: "existing-dup-key",
  });

  const newExperienceApply = applyAcceptedInventoryTextSuggestions(
    [newExperience, newExperienceBullet],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const inventoryWithNewExperience = {
    ...inventory,
    edits: newExperienceApply.edits,
  };
  const activeWithNewExperience = buildActiveCollatedInventory(inventoryWithNewExperience);
  const sociusExperience = activeWithNewExperience.experiences.find(
    (item) => item.company === "Socius",
  );

  const duplicateApply = applyAcceptedInventoryTextSuggestions(
    [acceptedBullet, duplicateAcceptedBullet],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const needsManual = classifyInventoryTextSuggestionApplyability(
    {
      id: "manual-1",
      kind: "bullet_new_experience",
      category: "bullets",
      text: "Built dashboards",
      matchLabel: "new_experience",
      warnings: [],
      applyability: "applyable",
    },
    collated,
    createEmptyInventoryEdits(),
  );

  const parsedProject = parseInventoryTextExtractionJson(
    JSON.stringify({
      sufficient: true,
      suggestions: [
        {
          kind: "new_work_experience",
          text: "Built Resume Copilot AI demo with Gemini",
          company: "Projects",
          role: "Resume Copilot",
          matchLabel: "new_experience",
          warnings: [],
        },
      ],
    }),
    "mock",
  ).suggestions[0];

  const projectWorkSuggestion = reviewed({
    id: "project-work",
    kind: "new_work_experience",
    category: "work_experience",
    text: "Built Resume Copilot AI demo with Gemini",
    company: "Projects",
    role: "Resume Copilot",
    matchLabel: "new_experience",
    warnings: [],
    applyability: "applyable",
  });

  const projectBulletSuggestion = reviewed({
    id: "project-bullet",
    kind: "bullet_new_experience",
    category: "bullets",
    text: "Shipped portfolio analytics dashboard",
    company: "Personal Projects",
    role: "Analytics Dashboard",
    matchLabel: "new_experience",
    warnings: [],
    applyability: "applyable",
  });

  const projectApply = applyAcceptedInventoryTextSuggestions(
    [projectWorkSuggestion, projectBulletSuggestion],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const inventoryWithProject = {
    ...inventory,
    edits: projectApply.edits,
  };
  const activeWithProject = buildActiveCollatedInventory(inventoryWithProject);
  const projectExperience = activeWithProject.experiences.find(
    (item) => item.company === "Projects" || item.role === "Resume Copilot",
  );
  const projectAdditional = activeWithProject.additionalExperienceItems.filter((item) =>
    item.text.toLowerCase().includes("resume copilot"),
  );

  const freelanceSuggestion = reviewed({
    id: "freelance-1",
    kind: "new_work_experience",
    category: "work_experience",
    text: "Led product discovery and delivery for ClientCo",
    company: "ClientCo",
    role: "Freelance Product Consultant",
    matchLabel: "new_experience",
    warnings: [],
    applyability: "applyable",
  });

  const freelanceApply = applyAcceptedInventoryTextSuggestions(
    [freelanceSuggestion],
    createEmptyInventoryEdits(),
    inventory.enrichment,
    collated,
  );

  const inventoryWithFreelance = {
    ...inventory,
    edits: freelanceApply.edits,
  };
  const activeWithFreelance = buildActiveCollatedInventory(inventoryWithFreelance);
  const freelanceExperience = activeWithFreelance.experiences.find(
    (item) => item.company === "ClientCo",
  );

  const projectPayloadInput = buildResumeDraftGenerationInput({
    collated: activeWithProject,
    enrichment: inventory.enrichment,
    jobDescription: {
      id: "jd-project",
      rawText: "Need product and project delivery experience.",
      companyName: "Hiring Co",
      roleTitle: "PM",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    referenceResume: inventory.resumes[0]!,
    maxBullets: 40,
  });

  const pollutedEdits = normalizeInventoryEdits({
    ...createEmptyInventoryEdits(),
    addedExperiences: [
      {
        id: "overlay-project-exp",
        company: "Projects",
        role: "Personal Projects",
        descriptor: "Resume Copilot: built an AI resume tailoring demo",
        addedAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    addedBulletsByExperienceKey: {
      "projects::personal projects": [
        {
          id: "overlay-project-bullet",
          description: "Integrated Gemini extraction for pasted career notes",
          addedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    },
  });

  const auditItems = auditProjectLikeOverlayPollution(pollutedEdits);
  const migratedEdits = moveProjectOverlayToAdditionalExperience(
    pollutedEdits,
    "overlay-project-exp",
  );

  const migratedActive = buildActiveCollatedInventory({
    ...inventory,
    edits: migratedEdits,
  });

  const inventoryWithApplied = {
    ...inventory,
    edits: applyResult.edits,
    enrichment: applyResult.enrichment,
  };
  const activeCollated = buildActiveCollatedInventory(inventoryWithApplied);
  const acmeExperience = activeCollated.experiences.find(
    (item) => item.company === "Acme Corp",
  );
  const importedBullet = acmeExperience?.bullets.find((bullet) =>
    bullet.description.includes("CRM integrations"),
  );

  const inventoryPage = readFileSync(
    join(process.cwd(), "src/components/pages/InventoryPageClient.tsx"),
    "utf8",
  );
  const extractionPanel = readFileSync(
    join(process.cwd(), "src/components/setup/InventoryTextExtractionPanel.tsx"),
    "utf8",
  );
  const apiRoute = readFileSync(
    join(process.cwd(), "src/app/api/ai/extract-inventory-from-text/route.ts"),
    "utf8",
  );

  const cleanupPanel = readFileSync(
    join(process.cwd(), "src/components/setup/InventoryProjectCleanupPanel.tsx"),
    "utf8",
  );

  const checks: [string, boolean][] = [
    ["prompt forbids fabrication", promptForbidsFabrication(prompt)],
    ["prompt keeps projects out of work experience", promptKeepsProjectsOutOfWorkExperience(prompt)],
    ["parsed project suggestion becomes additional_experience", parsedProject?.kind === "additional_experience"],
    ["project-like work suggestion coerced on apply", projectApply.edits.addedExperiences?.length === 0],
    ["project additional items stored not in experiences", projectAdditional.length >= 1 && !projectExperience],
    ["project bullet does not create work experience", !activeWithProject.experiences.some((item) => item.company === "Personal Projects")],
    ["freelance client still applies as work experience", Boolean(freelanceExperience)],
    ["audit detects project-like overlay experience", auditItems.length === 1],
    ["audit proposes additional experience line", auditItems[0]?.proposedAdditionalExperienceLine.includes("Resume Copilot") ?? false],
    ["normalize does not auto-migrate project overlay", pollutedEdits.addedExperiences?.length === 1],
    ["cleanup move removes addedExperiences row", migratedEdits.addedExperiences?.length === 0],
    ["cleanup move removes bullet bucket", !migratedEdits.addedBulletsByExperienceKey?.["projects::personal projects"]],
    ["cleanup move creates addedAdditionalExperienceItems", (migratedEdits.addedAdditionalExperienceItems?.length ?? 0) >= 1],
    ["freelance overlay not flagged by audit", auditProjectLikeOverlayPollution(freelanceApply.edits).length === 0],
    ["migrated project in additional not work experience", !migratedActive.experiences.some((item) => item.company === "Projects") && migratedActive.additionalExperienceItems.some((item) => item.category === "Projects")],
    ["inventory page wires project cleanup panel", inventoryPage.includes("InventoryProjectCleanupPanel")],
    ["cleanup panel visible when polluted", cleanupPanel.includes('data-testid="inventory-project-cleanup-panel"')],
    ["cleanup panel shows regenerate warning", cleanupPanel.includes("inventory-project-cleanup-regenerate-warning")],
    ["overlay project experience migrates to additional", migratedEdits.addedExperiences?.length === 0],
    ["migrated project appears in additionalExperienceItems", migratedActive.additionalExperienceItems.some((item) => item.category === "Projects")],
    ["generation payload sends projects under additionalExperience", projectPayloadInput.additionalExperience.some((item) => item.text.includes("Resume Copilot"))],
    ["generation payload keeps projects out of experiences", !projectPayloadInput.experiences.some((item) => item.company === "Projects")],
    ["prompt references existing experience index only", prompt.includes("matching index only")],
    ["malformed JSON throws parse error", parseError instanceof InventoryTextExtractionParseError],
    ["empty sufficient=false handled safely", !emptyParse.sufficient && emptyParse.suggestions.length === 0],
    ["mock extract returns suggestions", mockExtract.suggestions.length >= 3],
    ["duplicate preview flags similar bullet", Boolean(duplicateSuggestion?.duplicateOfBulletKey)],
    ["accepted bullet applies to overlay", applyResult.appliedCount === 2],
    ["rejected bullet does not apply", applyResult.appliedCount < 3],
    ["imported bullet appears in active collated", Boolean(importedBullet)],
    [
      "imported bullet has stable text-import key",
      Boolean(
        importedBullet?.inventoryBulletKey?.startsWith("text-import::") &&
          importedBullet.inventoryBulletKey ===
            buildTextImportBulletKey("Acme Corp", "Product Manager", importedBullet.id),
      ),
    ],
    ["keyword lands in enrichment bank", applyResult.enrichment.keywordBank.some((item) => item.approved && item.keyword === "Product Operations")],
    ["new work experience applied to overlay", (newExperienceApply.edits.addedExperiences?.length ?? 0) === 1],
    ["new experience appears in active collated", Boolean(sociusExperience)],
    ["bullet for new experience appears in active collated", sociusExperience?.bullets.some((bullet) => bullet.description.includes("partner channel")) ?? false],
    ["duplicate accepted bullet skipped with reason", duplicateApply.skippedCount >= 1 && duplicateApply.skippedItems.some((item) => item.reason.includes("Duplicate"))],
    ["missing company/role classified needs manual placement", needsManual === "needs_manual_placement"],
    ["skipped items include user-facing reason", duplicateApply.skippedItems.every((item) => item.reason.length > 0)],
    ["panel shows applyability label", extractionPanel.includes("applyabilityLabel")],
    ["panel shows skipped suggestions list", extractionPanel.includes('data-testid="inventory-text-skipped-suggestions"')],
    ["inventory page wires Add from text", inventoryPage.includes("InventoryTextExtractionPanel")],
    ["panel exposes Add from text CTA", extractionPanel.includes('data-testid="inventory-add-from-text"')],
    ["panel exposes Extract suggestions", extractionPanel.includes('data-testid="inventory-extract-suggestions"')],
    ["panel exposes Apply accepted suggestions", extractionPanel.includes('data-testid="inventory-apply-accepted-suggestions"')],
    [
      "education preview only cannot be accepted",
      extractionPanel.includes('suggestion.applyability === "preview_only"') &&
        extractionPanel.includes("disabled={suggestion.applyability === \"preview_only\"}"),
    ],
    [
      "preview only applyability label",
      readFileSync(
        join(process.cwd(), "src/lib/inventory-text-extraction/classify.ts"),
        "utf8",
      ).includes("Preview only — not saved yet"),
    ],
    ["API route uses shared provider", apiRoute.includes("extractInventoryTextWithAI")],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll inventory text extraction checks passed.");
}

main();
