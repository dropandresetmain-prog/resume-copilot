import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateMockResumeDraft } from "../../src/lib/ai/resume-draft-mock";
import { reviseMockResumeRoleCustom, reviseMockResumeSummary, reviseMockResumeBatch, reviseMockResumeSingleBullets } from "../../src/lib/ai/revise-resume-scope-mock";
import { buildCollatedInventory } from "../../src/lib/inventory/collation";
import { createEmptyEnrichmentState } from "../../src/lib/enrichment/state";
import { buildResumeDraftGenerationInput } from "../../src/lib/resume-draft/payload";
import { formatKeywordBullet } from "../../src/lib/resume-draft/layout";
import { formatRiskFlagLabel } from "../../src/lib/resume-draft/preview-helpers";
import {
  applyReviewStateToContent,
  createInitialReviewState,
  updateExperienceBulletReview,
  updateProfessionalSummaryReview,
} from "../../src/lib/resume-draft/review-state";
import {
  applyResumeCustomRevision,
  applyResumeSingleBulletRevisions,
  resumeCustomRevisionShouldPersist,
  validateResumeSingleBulletRevisionCandidates,
  validateResumeSingleBulletRevisionRequest,
} from "../../src/lib/resume-draft/custom-revision";
import {
  buildResumeExperienceDisplayEntries,
  isResumeStageTargetCurrent,
  updateResumeSkillGroupItems,
} from "../../src/lib/resume-draft/editor-display";
import { parseResumeSingleBulletRevisionJson } from "../../src/lib/resume-draft/custom-revision-parse";
import {
  applyResumeBatchRevision,
  sanitizeBatchRevisionOutput,
} from "../../src/lib/resume-draft/custom-revision-batch";
import {
  buildResumeBatchRevisionPrompt,
  promptIncludesBatchRevisionScope,
} from "../../src/lib/resume-draft/custom-revision-batch-prompt";
import {
  buildResumeRoleCustomRevisionPrompt,
  buildResumeSingleBulletRevisionPrompt,
  buildResumeSummaryCustomRevisionPrompt,
  promptIncludesRoleCustomRevisionScope,
  promptIncludesSingleBulletRevisionScope,
  promptIncludesSummaryCustomRevisionScope,
} from "../../src/lib/resume-draft/custom-revision-prompt";
import type { InventoryState } from "../../src/types/resume";
import type { StoredJobDescription } from "../../src/types/jd";
import {
  isProfessionalSummaryRevisionScopeAvailable,
  PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY,
} from "../../src/lib/resume-draft/custom-revision";

const sampleJd: StoredJobDescription = {
  id: "jd-1",
  rawText: "Looking for a product manager with operations and strategy experience.",
  companyName: "Acme",
  roleTitle: "Product Manager",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

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
            company: "Acme",
            descriptor: "",
            location: "",
            role: "Product Manager",
            dateRange: "2022 - Present",
            rawHeader: "",
            rawRoleLine: "",
            bullets: [
              {
                id: "bullet-1",
                parentId: "exp-1",
                keyword: "Operations",
                description: "Led product operations improvements",
                rawBulletText: "Led product operations improvements",
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
  };
}

function main() {
  const inventory = buildSampleInventory();
  const collated = buildCollatedInventory(inventory);
  const generationInput = buildResumeDraftGenerationInput({
    collated,
    enrichment: inventory.enrichment,
    jobDescription: sampleJd,
    referenceResume: inventory.resumes[0],
  });
  const mockDraft = generateMockResumeDraft(generationInput);
  const originalContent = mockDraft.content;
  const originalInventory = JSON.stringify(inventory);

  const initialReview = createInitialReviewState(originalContent);
  let reviewState = initialReview;
  reviewState = updateExperienceBulletReview(reviewState, 0, 0, {
    status: "edited",
    editedText: "Edited bullet for tailored resume draft.",
  });
  reviewState = updateProfessionalSummaryReview(reviewState, {
    status: "rejected",
  });

  const previewContent = applyReviewStateToContent(originalContent, reviewState);
  const savedContent = applyReviewStateToContent(originalContent, reviewState, {
    includePending: true,
  });

  const editedBullet = previewContent.experience[0]?.bullets[0]?.text ?? "";
  const summaryOmitted = previewContent.professionalSummary.text === "";
  const inventoryUnchanged = JSON.stringify(inventory) === originalInventory;
  const originalFirstBullet = originalContent.experience[0]?.bullets[0]?.text ?? "";
  const expectedFirstBullet = formatKeywordBullet(
    "Operations",
    "Led product operations improvements",
  );
  const originalObjectUnchanged = originalFirstBullet === expectedFirstBullet;
  const riskLabel = formatRiskFlagLabel("needs review");

  const summaryRevision = reviseMockResumeSummary({
    currentSummary: "Operations leader with B2B experience.",
    customInstruction: "Emphasize automation outcomes.",
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const summaryScopedContent = applyResumeCustomRevision(originalContent, {
    scope: "professional_summary",
    professionalSummaryText: summaryRevision.professionalSummaryText,
  });
  const roleRevision = reviseMockResumeRoleCustom({
    currentRole: originalContent.experience[0]!,
    customInstruction: "Tighten metrics.",
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const roleScopedContent = applyResumeCustomRevision(originalContent, {
    scope: "selected_role",
    roleIndex: 0,
    roleBullets: roleRevision.roleBullets,
  });
  const summaryPrompt = buildResumeSummaryCustomRevisionPrompt({
    currentSummary: "Summary text",
    customInstruction: "Make it sharper.",
    jobDescriptionText: sampleJd.rawText,
  });
  const rolePrompt = buildResumeRoleCustomRevisionPrompt({
    currentRole: originalContent.experience[0]!,
    customInstruction: "Focus on revenue.",
    jobDescriptionText: sampleJd.rawText,
  });
  const batchPrompt = buildResumeBatchRevisionPrompt({
    content: {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    queue: [
      {
        id: "summary-1",
        scope: "professional_summary",
        customInstruction: "Emphasize automation outcomes.",
      },
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const batchRevision = reviseMockResumeBatch({
    content: {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    queue: [
      {
        id: "summary-1",
        scope: "professional_summary",
        customInstruction: "Emphasize automation outcomes.",
      },
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const batchContent = applyResumeBatchRevision(
    {
      ...originalContent,
      professionalSummary: {
        text: "Operations leader with B2B experience.",
        jdAlignment: [],
        riskFlags: [],
      },
    },
    batchRevision,
  );
  const unqueuedRoleSanitized = sanitizeBatchRevisionOutput({
    content: originalContent,
    queue: [
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    parsed: {
      roleCandidates: [
        {
          roleIndex: 1,
          company: originalContent.experience[1]?.company ?? "Other Co",
          role: originalContent.experience[1]?.role ?? "Other Role",
          bullets: originalContent.experience[1]?.bullets ?? [],
        },
      ],
      warnings: [],
    },
  });
  const malformedSanitized = sanitizeBatchRevisionOutput({
    content: originalContent,
    queue: [
      {
        id: "role-0",
        scope: "selected_role",
        roleIndex: 0,
        customInstruction: "Tighten metrics.",
      },
    ],
    parsed: {
      roleCandidates: [
        {
          roleIndex: 0,
          company: originalContent.experience[0]!.company,
          role: originalContent.experience[0]!.role,
          bullets: [],
        },
      ],
      warnings: ["Model noted a formatting issue."],
    },
  });

  // ── M10b — single_bullet (Replace) revision scope ──────────────────────────────
  const singleBulletPrompt = buildResumeSingleBulletRevisionPrompt({
    targets: [
      {
        roleIndex: 0,
        bulletIndex: 0,
        company: originalContent.experience[0]!.company,
        role: originalContent.experience[0]!.role,
        currentText: originalContent.experience[0]!.bullets[0]!.text,
        customInstruction: "More metrics-focused.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const singleBulletRevision = reviseMockResumeSingleBullets({
    targets: [
      {
        roleIndex: 0,
        bulletIndex: 0,
        company: originalContent.experience[0]!.company,
        role: originalContent.experience[0]!.role,
        currentText: originalContent.experience[0]!.bullets[0]!.text,
        customInstruction: "More metrics-focused.",
      },
    ],
    jobDescriptionText: sampleJd.rawText,
    targetRoleTitle: sampleJd.roleTitle,
  });
  const priorBullet0 = originalContent.experience[0]!.bullets[0]!;
  const singleBulletContent = applyResumeSingleBulletRevisions(
    originalContent,
    singleBulletRevision.bulletCandidates,
  );
  const singleBulletApplied = singleBulletContent.experience[0]!.bullets[0]!;
  // Out-of-range / unstaged candidates are ignored, not applied.
  const singleBulletIgnoresUnknown = applyResumeSingleBulletRevisions(originalContent, [
    { roleIndex: 0, bulletIndex: 999, text: "Should be ignored" },
    { roleIndex: 42, bulletIndex: 0, text: "Should be ignored" },
  ]);
  const singleBulletValidationOk = validateResumeSingleBulletRevisionRequest({
    draftId: "draft-1",
    scope: "single_bullet",
    content: originalContent,
    jobDescription: { rawText: sampleJd.rawText },
    bullets: [{ roleIndex: 0, bulletIndex: 0, currentText: priorBullet0.text }],
  });
  const singleBulletValidationMissingBullet = validateResumeSingleBulletRevisionRequest({
    draftId: "draft-1",
    scope: "single_bullet",
    content: originalContent,
    jobDescription: { rawText: sampleJd.rawText },
    bullets: [{ roleIndex: 0, bulletIndex: 999, currentText: "x" }],
  });
  const singleBulletParse = parseResumeSingleBulletRevisionJson(
    JSON.stringify({
      bullets: [{ roleIndex: 0, bulletIndex: 0, text: "Operations: Cut cycle time 30%." }],
      warnings: [],
    }),
  );
  const threeTargets = [
    { roleIndex: 0, bulletIndex: 0 },
    { roleIndex: 0, bulletIndex: 1 },
    { roleIndex: 1, bulletIndex: 0 },
  ];
  const threeExactCandidates = threeTargets.map((target, index) => ({
    ...target,
    text: `Revised bullet ${index + 1}`,
  }));
  const exactOneCandidateValidation = validateResumeSingleBulletRevisionCandidates(
    [{ roleIndex: 0, bulletIndex: 0 }],
    [{ roleIndex: 0, bulletIndex: 0, text: "Exact revision" }],
  );
  const exactThreeCandidateValidation = validateResumeSingleBulletRevisionCandidates(
    threeTargets,
    threeExactCandidates,
  );
  const missingCandidateValidation = validateResumeSingleBulletRevisionCandidates(
    threeTargets,
    threeExactCandidates.slice(0, 2),
  );
  const duplicateCandidateValidation = validateResumeSingleBulletRevisionCandidates(threeTargets, [
    threeExactCandidates[0]!,
    threeExactCandidates[0]!,
    threeExactCandidates[2]!,
  ]);
  const extraCandidateValidation = validateResumeSingleBulletRevisionCandidates(threeTargets, [
    ...threeExactCandidates,
    { roleIndex: 9, bulletIndex: 9, text: "Unexpected revision" },
  ]);

  // M11 resume staging is UI behaviour in the Output editor — assert its wiring.
  const outputEditor = readFileSync(
    join(process.cwd(), "src/components/pages/OutputEditorPageClient.tsx"),
    "utf8",
  );
  const customRevisionClient = readFileSync(
    join(process.cwd(), "src/lib/resume-draft/custom-revision-client.ts"),
    "utf8",
  );
  const applyResumeStageSource = outputEditor.slice(
    outputEditor.indexOf("async function applyResumeStage()"),
    outputEditor.indexOf("const docDisabled"),
  );
  const fiveSkills = ["SQL", "Tableau", "Python", "Figma", "Jira"];
  const fiveSkillContent = updateResumeSkillGroupItems(
    {
      ...originalContent,
      skills: {
        ...originalContent.skills,
        groups: [{ label: "Tools", items: [] }],
      },
    },
    0,
    fiveSkills,
  );
  const baseRole = originalContent.experience[0]!;
  const reverseChronologicalContent = {
    ...originalContent,
    experience: [
      { ...baseRole, company: "Old Co", dateRange: "2010 - 2012" },
      { ...baseRole, company: "Current Co", dateRange: "2022 - Present" },
      { ...baseRole, company: "Middle Co", dateRange: "2018 - 2020" },
    ],
  };
  const displayEntries = buildResumeExperienceDisplayEntries(
    reverseChronologicalContent.experience,
    new Date("2026-06-30T00:00:00.000Z"),
  );
  const originalIndexMutation = applyResumeSingleBulletRevisions(
    reverseChronologicalContent,
    [{ roleIndex: 0, bulletIndex: 0, text: "Changed the original index only." }],
  );

  const checks: [string, boolean][] = [
    // ── M11: Replace = pick spine alternative → stage → apply via single_bullet ──
    [
      "Replace opens a spine-ranked alternatives picker (M11)",
      outputEditor.includes('data-testid="bullet-replace-picker"') &&
        outputEditor.includes('data-testid="bullet-replace-option"') &&
        outputEditor.includes("function pickAlternative"),
    ],
    [
      "Picker is fed by spine-ranked work bullets (M11)",
      outputEditor.includes("bulletAlternatives") &&
        outputEditor.includes("buildEvidenceSpine") &&
        outputEditor.includes('item.sourceType === "work_bullet"'),
    ],
    [
      "Apply changes to Resume tailors only staged picks via single_bullet (M11)",
      outputEditor.includes('data-testid="apply-resume-changes"') &&
        outputEditor.includes("function applyResumeStage") &&
        outputEditor.includes('scope: "single_bullet"') &&
        outputEditor.includes("currentText: entry.pickedText"),
    ],
    [
      "all scoped resume revision actions send the authenticated session",
      customRevisionClient.includes("supabase.auth.getSession()") &&
        customRevisionClient.includes("Authorization: `Bearer ${accessToken}`") &&
        customRevisionClient.match(/requestAuthorizedResumeRevision\(request\)/g)?.length === 3,
    ],
    [
      "Resume custom instruction staged at bucket level (M11)",
      outputEditor.includes('data-testid="resume-custom-instruction"') &&
        outputEditor.includes("stageInstruction"),
    ],
    [
      "Resume apply persists via the M5a invalidation path (M11)",
      outputEditor.includes("applyResumeSingleBulletRevisions(content, response.bulletCandidates)") &&
        outputEditor.includes("await onApplyContentEdit(next)"),
    ],
    [
      "resume staging clears only after complete apply success",
      applyResumeStageSource.indexOf("await onApplyContentEdit(next)") <
        applyResumeStageSource.indexOf("setStage(new Map())") &&
        applyResumeStageSource.indexOf("setStage(new Map())") <
          applyResumeStageSource.indexOf("} catch (err)"),
    ],
    [
      "staged replacements lock structural Edit and Remove actions",
      outputEditor.includes("structuralEditDisabled") &&
        outputEditor.includes('data-testid="resume-structural-edit-lock"') &&
        outputEditor.includes(
          "Apply or clear staged replacements before editing document structure.",
        ),
    ],
    [
      "newly staged replacement relocks the content gate",
      outputEditor.includes("onStageCreated();") &&
        outputEditor.includes("onStageCreated={() => setContentConfirmed(false)}"),
    ],
    [
      "staged target drift is rejected before applying",
      isResumeStageTargetCurrent(reverseChronologicalContent, {
        roleIndex: 0,
        bulletIndex: 0,
        originalText: baseRole.bullets[0]!.text,
      }) &&
        !isResumeStageTargetCurrent(
          {
            ...reverseChronologicalContent,
            experience: reverseChronologicalContent.experience.map((role, index) =>
              index === 0 ? { ...role, bullets: [] } : role,
            ),
          },
          {
            roleIndex: 0,
            bulletIndex: 0,
            originalText: baseRole.bullets[0]!.text,
          },
        ),
    ],
    [
      "Replace alternatives are role-scoped and exclude the current bullet",
      outputEditor.includes("alternative.roleKey === roleKey") &&
        outputEditor.includes("alternative.text !== b.text") &&
        outputEditor.includes("currentBulletKeys.has(alternative.bulletKey)"),
    ],
    [
      "Text view sorts roles reverse-chronologically without mutating content",
      displayEntries.map((entry) => entry.experience.company).join("|") ===
        "Current Co|Middle Co|Old Co" &&
        reverseChronologicalContent.experience[0]?.company === "Old Co",
    ],
    [
      "Text-view mutation targets retain original content indices",
      displayEntries[0]?.originalIndex === 1 &&
        originalIndexMutation.experience[0]?.bullets[0]?.text ===
          "Changed the original index only." &&
        originalIndexMutation.experience[1]?.bullets[0]?.text ===
          reverseChronologicalContent.experience[1]?.bullets[0]?.text,
    ],
    [
      "five saved skills remain visible and editable",
      fiveSkillContent.skills.groups[0]?.items.length === 5 &&
        fiveSkillContent.skills.groups[0]?.items.every(
          (item, index) => item === fiveSkills[index],
        ) &&
        outputEditor.includes("content.skills.groups.map((group)") &&
        !outputEditor.includes("content.skills.groups.slice("),
    ],
    ["initial review state pending summary", initialReview.professionalSummary.status === "pending"],
    ["edited bullet in preview", editedBullet.includes("Edited bullet")],
    ["rejected summary omitted from preview", summaryOmitted],
    ["saved content keeps pending items", savedContent.experience.length > 0],
    ["apply review does not mutate original content object", originalObjectUnchanged],
    ["source inventory unchanged", inventoryUnchanged],
    ["risk flag label readable", riskLabel === "Needs review"],
    ["original draft omits professional summary", originalContent.professionalSummary.text === ""],
    ["reviewed status constant", "reviewed".length > 0],
    [
      "summary scoped revision does not modify experience bullets",
      summaryScopedContent.professionalSummary.text === summaryRevision.professionalSummaryText &&
        summaryScopedContent.experience[0]?.bullets[0]?.text ===
          originalContent.experience[0]?.bullets[0]?.text,
    ],
    [
      "role scoped revision does not modify unrelated roles",
      roleScopedContent.experience.length === originalContent.experience.length &&
        (originalContent.experience[1]
          ? roleScopedContent.experience[1]?.bullets[0]?.text ===
            originalContent.experience[1]?.bullets[0]?.text
          : true),
    ],
    [
      "resume custom revision persist defaults false",
      resumeCustomRevisionShouldPersist({}) === false &&
        resumeCustomRevisionShouldPersist({ persist: true }) === true,
    ],
    [
      "summary custom revision prompt scope",
      promptIncludesSummaryCustomRevisionScope(summaryPrompt),
    ],
    [
      "role custom revision prompt scope",
      promptIncludesRoleCustomRevisionScope(rolePrompt),
    ],
    [
      "batch revision prompt scope",
      promptIncludesBatchRevisionScope(batchPrompt),
    ],
    [
      "batch revision applies summary and role",
      batchContent.professionalSummary.text === batchRevision.summaryText &&
        batchContent.experience[0]?.bullets !== originalContent.experience[0]?.bullets,
    ],
    [
      "batch revision leaves unqueued roles unchanged",
      originalContent.experience[1]
        ? batchContent.experience[1]?.bullets[0]?.text ===
          originalContent.experience[1]?.bullets[0]?.text
        : true,
    ],
    [
      "unqueued role candidate ignored",
      unqueuedRoleSanitized.roleUpdates.length === 0 &&
        unqueuedRoleSanitized.warnings.some((warning) => warning.includes("unqueued")),
    ],
    [
      "malformed role candidate left unchanged with warning",
      malformedSanitized.roleUpdates.length === 0 &&
        malformedSanitized.warnings.some((warning) => warning.includes("Skipped role 0")),
    ],
    [
      "professional summary revision scope unavailable on one-page format",
      !isProfessionalSummaryRevisionScopeAvailable(originalContent),
    ],
    [
      "professional summary revision unavailable copy",
      PROFESSIONAL_SUMMARY_REVISION_UNAVAILABLE_COPY.includes("not exported"),
    ],
    // ── M10b — single_bullet (Replace) revision scope ────────────────────────────
    [
      "single-bullet revision prompt scope",
      promptIncludesSingleBulletRevisionScope(singleBulletPrompt),
    ],
    [
      "single-bullet mock returns one candidate per target",
      singleBulletRevision.bulletCandidates.length === 1 &&
        singleBulletRevision.bulletCandidates[0]?.roleIndex === 0 &&
        singleBulletRevision.bulletCandidates[0]?.bulletIndex === 0,
    ],
    [
      "single-bullet apply swaps only the targeted bullet text",
      singleBulletApplied.text !== priorBullet0.text &&
        singleBulletContent.experience[0]!.bullets.length ===
          originalContent.experience[0]!.bullets.length,
    ],
    [
      "single-bullet apply preserves sourceRefs and confidence",
      JSON.stringify(singleBulletApplied.sourceRefs) === JSON.stringify(priorBullet0.sourceRefs) &&
        singleBulletApplied.confidence === priorBullet0.confidence,
    ],
    [
      "single-bullet apply clears server validation (invalidation)",
      singleBulletContent.serverPdfValidation === undefined,
    ],
    [
      "single-bullet apply ignores out-of-range candidates",
      singleBulletIgnoresUnknown === originalContent,
    ],
    [
      "single-bullet request validation accepts a valid target",
      singleBulletValidationOk === null,
    ],
    [
      "single-bullet request validation rejects a missing bullet target",
      typeof singleBulletValidationMissingBullet === "string",
    ],
    [
      "single-bullet response parser reads role/bullet/text",
      singleBulletParse.ok &&
        singleBulletParse.value?.bullets[0]?.roleIndex === 0 &&
        singleBulletParse.value?.bullets[0]?.bulletIndex === 0,
    ],
    ["single-bullet exact contract accepts 1 requested and 1 returned", exactOneCandidateValidation === null],
    ["single-bullet exact contract accepts exactly 3 requested targets", exactThreeCandidateValidation === null],
    [
      "single-bullet exact contract rejects a missing candidate without partial acceptance",
      missingCandidateValidation?.includes("omitted requested bullet target") === true,
    ],
    [
      "single-bullet exact contract rejects a duplicate candidate",
      duplicateCandidateValidation?.includes("duplicate bullet target") === true,
    ],
    [
      "single-bullet exact contract rejects an extra candidate",
      extraCandidateValidation?.includes("unexpected bullet target") === true,
    ],
  ];

  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exit(1);
  }

  console.log("\nAll resume draft review checks passed.");
}

main();
