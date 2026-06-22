import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
  ResumeDraftGenerationInput,
} from "@/types/resume-draft";

export type UnavailableForcedKeyReason =
  | "excluded"
  | "hidden"
  | "not_in_active_inventory"
  | "unknown";

export type UnavailableForcedKeyEntry = {
  key: string;
  reason: UnavailableForcedKeyReason;
  message: string;
};

export type ForcedBulletAudit = {
  requestedKeys: string[];
  unavailableKeys: UnavailableForcedKeyEntry[];
  alreadyInPayloadKeys: string[];
  includedInOutput: string[];
  missingFromOutput: string[];
  removedDuringRepair: string[];
  unableToPreserveDuringRepair: string[];
};

export type RegenerationOutcomeSummary = {
  lines: string[];
  workExperienceBulletsChanged: number;
  forcedIncludedCount: number;
  forcedUnavailableCount: number;
  forcedMissingFromOutputCount: number;
};

const UNAVAILABLE_REASON_MESSAGES: Record<UnavailableForcedKeyReason, string> = {
  excluded:
    "Excluded from regeneration — uncheck it under Generated work experience bullets or remove it from exclusions.",
  hidden: "Hidden in inventory — restore the bullet in inventory edits before forcing it.",
  not_in_active_inventory:
    "Not found in active inventory — the bullet key may be outdated or the source was removed.",
  unknown: "Unavailable — could not be added to the generation payload.",
};

export function normalizeForcedBulletKeys(keys: readonly string[] | undefined): string[] {
  if (!keys?.length) {
    return [];
  }
  return [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
}

export function collectOutputBulletKeys(content: ResumeDraftContent): Set<string> {
  const keys = new Set<string>();
  for (const role of content.experience) {
    for (const bullet of role.bullets) {
      for (const ref of bullet.sourceRefs) {
        const key = ref.bulletKey?.trim();
        if (key) {
          keys.add(key);
        }
      }
    }
  }
  return keys;
}

export function bulletReferencesForcedKey(
  bullet: ResumeDraftExperienceBullet,
  forcedKeys: ReadonlySet<string>,
): boolean {
  return bullet.sourceRefs.some((ref) => {
    const key = ref.bulletKey?.trim();
    return Boolean(key && forcedKeys.has(key));
  });
}

export function collectForcedKeysFromBullets(
  bullets: readonly ResumeDraftExperienceBullet[],
  forcedKeys: readonly string[],
): string[] {
  const forcedSet = new Set(normalizeForcedBulletKeys(forcedKeys));
  if (forcedSet.size === 0) {
    return [];
  }

  const present = new Set<string>();
  for (const bullet of bullets) {
    for (const ref of bullet.sourceRefs) {
      const key = ref.bulletKey?.trim();
      if (key && forcedSet.has(key)) {
        present.add(key);
      }
    }
  }
  return [...present];
}

export function collectForcedKeysPresentInOutput(
  content: ResumeDraftContent,
  forcedKeys: readonly string[],
): string[] {
  return collectForcedKeysFromBullets(
    content.experience.flatMap((role) => role.bullets),
    forcedKeys,
  );
}

export function explainUnavailableForcedKeys(options: {
  unavailableKeys: readonly string[];
  excludedBulletKeys?: readonly string[];
  hiddenBulletKeys?: readonly string[];
}): UnavailableForcedKeyEntry[] {
  const excluded = new Set(normalizeForcedBulletKeys(options.excludedBulletKeys));
  const hidden = new Set(normalizeForcedBulletKeys(options.hiddenBulletKeys));

  return normalizeForcedBulletKeys(options.unavailableKeys).map((key) => {
    let reason: UnavailableForcedKeyReason = "unknown";
    if (excluded.has(key)) {
      reason = "excluded";
    } else if (hidden.has(key)) {
      reason = "hidden";
    } else {
      reason = "not_in_active_inventory";
    }

    return {
      key,
      reason,
      message: UNAVAILABLE_REASON_MESSAGES[reason],
    };
  });
}

export function auditForcedBullets(options: {
  forcedKeys: readonly string[];
  unavailableKeys?: readonly string[];
  excludedBulletKeys?: readonly string[];
  hiddenBulletKeys?: readonly string[];
  alreadyInPayloadKeys?: readonly string[];
  contentBeforeRepair: ResumeDraftContent;
  contentAfterRepair: ResumeDraftContent;
  removedDuringRepair?: readonly string[];
  unableToPreserveDuringRepair?: readonly string[];
}): ForcedBulletAudit {
  const requestedKeys = normalizeForcedBulletKeys(options.forcedKeys);
  const unavailableKeys = explainUnavailableForcedKeys({
    unavailableKeys: options.unavailableKeys ?? [],
    excludedBulletKeys: options.excludedBulletKeys,
    hiddenBulletKeys: options.hiddenBulletKeys,
  });

  const includedInOutput = collectForcedKeysPresentInOutput(
    options.contentAfterRepair,
    requestedKeys,
  );
  const includedSet = new Set(includedInOutput);
  const missingFromOutput = requestedKeys.filter((key) => !includedSet.has(key));

  return {
    requestedKeys,
    unavailableKeys,
    alreadyInPayloadKeys: normalizeForcedBulletKeys(options.alreadyInPayloadKeys),
    includedInOutput,
    missingFromOutput,
    removedDuringRepair: normalizeForcedBulletKeys(options.removedDuringRepair),
    unableToPreserveDuringRepair: normalizeForcedBulletKeys(
      options.unableToPreserveDuringRepair,
    ),
  };
}

export function validateForcedBulletsInOutput(
  audit: ForcedBulletAudit,
): GenerationForcedBulletValidationIssue[] {
  const issues: GenerationForcedBulletValidationIssue[] = [];

  for (const entry of audit.unavailableKeys) {
    issues.push({
      code: "forced_bullet_unavailable",
      severity: "warning",
      message: `Forced bullet unavailable (${entry.key.slice(0, 48)}): ${entry.message}`,
      bulletKey: entry.key,
    });
  }

  for (const key of audit.missingFromOutput) {
    if (audit.unavailableKeys.some((entry) => entry.key === key)) {
      continue;
    }

    const removedDuringRepair = audit.removedDuringRepair.includes(key);
    issues.push({
      code: removedDuringRepair ? "forced_bullet_removed_during_repair" : "forced_bullet_missing_from_output",
      severity: "warning",
      message: removedDuringRepair
        ? `Forced bullet was removed during structure repair (${key.slice(0, 48)}).`
        : `Forced bullet missing from generated Work Experience (${key.slice(0, 48)}).`,
      bulletKey: key,
    });
  }

  for (const key of audit.unableToPreserveDuringRepair) {
    issues.push({
      code: "forced_bullet_unable_to_preserve",
      severity: "warning",
      message: `Forced bullet could not be preserved during repair due to structure limits (${key.slice(0, 48)}).`,
      bulletKey: key,
    });
  }

  return issues;
}

export type GenerationForcedBulletValidationIssue = {
  code: string;
  severity: "warning";
  message: string;
  bulletKey?: string;
};

export function collectWorkExperienceBulletTexts(content: ResumeDraftContent): string[] {
  return content.experience.flatMap((role) => role.bullets.map((bullet) => bullet.text.trim()));
}

export function countWorkExperienceBulletTextChanges(
  before: ResumeDraftContent,
  after: ResumeDraftContent,
): number {
  const beforeTexts = collectWorkExperienceBulletTexts(before);
  const afterTexts = collectWorkExperienceBulletTexts(after);
  const maxLength = Math.max(beforeTexts.length, afterTexts.length);
  let changed = 0;

  for (let index = 0; index < maxLength; index += 1) {
    if (beforeTexts[index] !== afterTexts[index]) {
      changed += 1;
    }
  }

  if (beforeTexts.length !== afterTexts.length) {
    changed = Math.max(changed, Math.abs(beforeTexts.length - afterTexts.length));
  }

  return changed;
}

export function buildRegenerationOutcomeSummary(options: {
  priorContent: ResumeDraftContent;
  newContent: ResumeDraftContent;
  audit: ForcedBulletAudit;
}): RegenerationOutcomeSummary {
  const { audit } = options;
  const workExperienceBulletsChanged = countWorkExperienceBulletTextChanges(
    options.priorContent,
    options.newContent,
  );
  const lines: string[] = [];

  if (audit.requestedKeys.length === 0) {
    if (workExperienceBulletsChanged === 0) {
      lines.push("Regeneration complete — 0 work experience bullets changed.");
    } else {
      lines.push(
        `Regeneration complete — ${workExperienceBulletsChanged} work experience bullet change(s) detected.`,
      );
    }
  } else {
    if (audit.includedInOutput.length > 0) {
      lines.push(
        `${audit.includedInOutput.length} forced bullet(s) included in the resume.`,
      );
    }

    if (audit.alreadyInPayloadKeys.length > 0) {
      lines.push(
        `${audit.alreadyInPayloadKeys.length} forced bullet(s) were already in the generation payload — forcing may not change selection.`,
      );
    }

    if (audit.unavailableKeys.length > 0) {
      lines.push(`${audit.unavailableKeys.length} forced bullet(s) unavailable for generation.`);
    }

    if (audit.missingFromOutput.length > 0) {
      lines.push(
        `${audit.missingFromOutput.length} forced bullet(s) missing from the final resume.`,
      );
    }

    if (workExperienceBulletsChanged === 0) {
      lines.push("0 work experience bullets changed compared to before regeneration.");
    } else {
      lines.push(
        `${workExperienceBulletsChanged} work experience bullet change(s) compared to before regeneration.`,
      );
    }
  }

  return {
    lines,
    workExperienceBulletsChanged,
    forcedIncludedCount: audit.includedInOutput.length,
    forcedUnavailableCount: audit.unavailableKeys.length,
    forcedMissingFromOutputCount: audit.missingFromOutput.length,
  };
}

/**
 * Prompt addendum when the user forced inventory bullets during regeneration.
 * Forced bullets must survive model selection; one-page tradeoffs drop non-forced evidence first.
 */
export function buildForcedBulletPromptSection(forcedBulletKeys: readonly string[]): string {
  const keys = normalizeForcedBulletKeys(forcedBulletKeys);
  if (keys.length === 0) {
    return "";
  }

  return `

## Forced inventory bullets (critical — regeneration controls)
The input payload includes regenerationControls.forcedBulletKeys. These are user-mandated evidence bullets.
- Every forced bulletKey MUST appear in Work Experience with a matching sourceRefs.bulletKey entry.
- Include the forced evidence even when one-page compression would normally omit similar bullets.
- When tradeoffs are required for one-page fit, remove or compress NON-FORCED bullets before dropping forced bullets.
- List all forced bulletKeys in rationale.selectionAudit.selectedBulletKeys.
- If a forced bullet cannot fit without breaking structure rules, keep it when possible and note the conflict in rationale.omissions.
Forced bulletKeys: ${JSON.stringify(keys)}`;
}

export function buildForcedBulletPromptSectionFromInput(
  input: ResumeDraftGenerationInput,
): string {
  return buildForcedBulletPromptSection(input.regenerationControls?.forcedBulletKeys ?? []);
}

export function promptIncludesForcedBulletRules(prompt: string): boolean {
  return (
    prompt.includes("Forced inventory bullets (critical — regeneration controls)") &&
    prompt.includes("regenerationControls.forcedBulletKeys") &&
    prompt.includes("NON-FORCED bullets before dropping forced bullets")
  );
}

export function collectPayloadBulletKeys(input: ResumeDraftGenerationInput): Set<string> {
  const keys = new Set<string>();
  for (const experience of input.experiences) {
    for (const bullet of experience.bullets) {
      keys.add(bullet.bulletKey);
    }
  }
  return keys;
}

export function findForcedKeysAlreadyInPayload(options: {
  forcedKeys: readonly string[];
  baselinePayloadKeys: ReadonlySet<string>;
}): string[] {
  return normalizeForcedBulletKeys(options.forcedKeys).filter((key) =>
    options.baselinePayloadKeys.has(key),
  );
}
