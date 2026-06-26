import { buildBulletEnrichmentKey } from "@/lib/enrichment/keys";
import { extractJdMatchTerms } from "@/lib/resume-draft/bullet-payload";
import { buildAcceptedWordingByBulletKey } from "@/lib/resume-draft/enrichment-wording";
import {
  buildEvidenceRationale,
  scoreEvidenceText,
} from "@/lib/evidence/scoring";
import type { EvidenceItem, EvidenceItemState } from "@/lib/evidence/types";
import type { CompanyContext } from "@/types/company-context";
import type { CollatedInventory } from "@/types/collated";
import type { EnrichmentState } from "@/types/enrichment";
import type { ResumeDraftRegenerationControls } from "@/types/resume-draft";

export type CollectEvidenceOptions = {
  collated: CollatedInventory;
  enrichment: EnrichmentState;
  jdText: string;
  regenerationControls?: ResumeDraftRegenerationControls;
  companyContext?: CompanyContext;
  referenceDate?: Date;
  acceptedWordingByBulletKey?: ReadonlyMap<string, string>;
};

function resolveInventoryBulletKey(
  experience: { company: string; role: string },
  bullet: { description: string; inventoryBulletKey?: string },
): string {
  return (
    bullet.inventoryBulletKey ??
    buildBulletEnrichmentKey(experience.company, experience.role, bullet.description)
  );
}

function resolveItemState(
  bulletKey: string | undefined,
  forcedSet: ReadonlySet<string>,
  excludedSet: ReadonlySet<string>,
): EvidenceItemState {
  if (bulletKey && forcedSet.has(bulletKey)) {
    return "forced";
  }
  if (bulletKey && excludedSet.has(bulletKey)) {
    return "excluded";
  }
  return "default";
}

function approvedKeywordSet(enrichment: EnrichmentState): Set<string> {
  return new Set(
    enrichment.keywordBank
      .filter((item) => item.approved)
      .map((item) => item.keyword.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isKeywordEvidenceTied(
  keyword: string,
  approved: ReadonlySet<string>,
  evidenceText: string,
): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized || !approved.has(normalized)) {
    return false;
  }
  return evidenceText.toLowerCase().includes(normalized);
}

export function collectEvidenceItems(options: CollectEvidenceOptions): EvidenceItem[] {
  const jdTerms = extractJdMatchTerms(options.jdText);
  const referenceDate = options.referenceDate ?? new Date();
  const forcedSet = new Set(options.regenerationControls?.forcedBulletKeys ?? []);
  const excludedSet = new Set(options.regenerationControls?.excludedBulletKeys ?? []);
  const acceptedWordingByBulletKey =
    options.acceptedWordingByBulletKey ??
    buildAcceptedWordingByBulletKey(options.enrichment);
  const approvedKeywords = approvedKeywordSet(options.enrichment);
  const items: EvidenceItem[] = [];

  for (const experience of options.collated.experiences) {
    for (const bullet of experience.bullets) {
      const bulletKey = resolveInventoryBulletKey(experience, bullet);
      const state = resolveItemState(bulletKey, forcedSet, excludedSet);
      if (state === "excluded") {
        continue;
      }

      const acceptedWording = acceptedWordingByBulletKey.get(bulletKey);
      const text = `${bullet.keyword ?? ""} ${bullet.description}`.trim();
      const scored = scoreEvidenceText(text, {
        jdTerms,
        hasAcceptedWording: Boolean(acceptedWording),
        hasCitation: bullet.sourceCitations.length > 0,
        dateRange: experience.dateRange,
        experience,
        referenceDate,
      });

      const displayLabel = `${experience.company} · ${experience.role}`;
      items.push({
        id: `work_bullet:${bulletKey}`,
        sourceType: "work_bullet",
        sourceId: bullet.id,
        originalText: bullet.description,
        displayLabel,
        editedText: acceptedWording,
        state,
        provenance: "inventory",
        confidence: scored.hasMetrics ? "high" : bullet.sourceCitations.length > 0 ? "medium" : "low",
        relevanceScore: scored.score,
        matchedJdSignals: scored.matchedJdSignals,
        rationale: buildEvidenceRationale(displayLabel, scored.matchedJdSignals, scored.hasMetrics),
        eligibility: "both",
        hasMetrics: scored.hasMetrics,
        recencySortKey: scored.recencySortKey,
        bulletKey,
        experience,
        bullet,
        acceptedWording,
      });

      if (
        bullet.keyword &&
        isKeywordEvidenceTied(bullet.keyword, approvedKeywords, text)
      ) {
        const keywordScored = scoreEvidenceText(bullet.keyword, { jdTerms });
        items.push({
          id: `keyword_tied:${bulletKey}:${bullet.keyword}`,
          sourceType: "keyword_tied",
          sourceId: bullet.id,
          originalText: bullet.keyword,
          displayLabel: `${displayLabel} · keyword`,
          state,
          provenance: "inventory",
          confidence: "medium",
          relevanceScore: keywordScored.score,
          matchedJdSignals: keywordScored.matchedJdSignals,
          rationale: `Evidence-tied keyword "${bullet.keyword}" on ${displayLabel}.`,
          eligibility: "both",
          hasMetrics: false,
          bulletKey,
          experience,
          bullet,
        });
      }
    }
  }

  for (const item of options.collated.additionalExperienceItems) {
    const scored = scoreEvidenceText(item.text, { jdTerms });
    const displayLabel = item.category
      ? `${item.category}: ${item.text.slice(0, 60)}`
      : item.text.slice(0, 80);
    items.push({
      id: `additional:${item.id}`,
      sourceType: "additional_experience",
      sourceId: item.id,
      originalText: item.text,
      displayLabel,
      state: "default",
      provenance: "inventory",
      confidence: scored.hasMetrics ? "high" : item.sourceCitations.length > 0 ? "medium" : "low",
      relevanceScore: scored.score,
      matchedJdSignals: scored.matchedJdSignals,
      rationale: buildEvidenceRationale("Additional experience", scored.matchedJdSignals, scored.hasMetrics),
      eligibility: "both",
      hasMetrics: scored.hasMetrics,
    });
  }

  for (const item of options.collated.educationItems) {
    const text = [
      item.institution,
      ...item.programmes,
      ...item.bullets,
    ]
      .filter(Boolean)
      .join(" ");
    const scored = scoreEvidenceText(text, {
      jdTerms,
      hasCitation: item.sourceCitations.length > 0,
      dateRange: item.dateRange,
    });
    const displayLabel = item.institution;
    items.push({
      id: `education:${item.id}`,
      sourceType: "education",
      sourceId: item.id,
      originalText: text,
      displayLabel,
      state: "default",
      provenance: "inventory",
      confidence: item.sourceCitations.length > 0 ? "medium" : "low",
      relevanceScore: scored.score,
      matchedJdSignals: scored.matchedJdSignals,
      rationale: buildEvidenceRationale(`Education at ${displayLabel}`, scored.matchedJdSignals, scored.hasMetrics),
      eligibility: "both",
      hasMetrics: scored.hasMetrics,
      recencySortKey: scored.recencySortKey,
    });
  }

  for (const item of options.collated.skillItems) {
    const scored = scoreEvidenceText(item.text, { jdTerms });
    const eligibility = item.category === "Technical Skills" ? "both" : "cover_letter";
    items.push({
      id: `skill:${item.id}`,
      sourceType: "skill",
      sourceId: item.id,
      originalText: item.text,
      displayLabel: `${item.category}: ${item.text}`,
      state: "default",
      provenance: "inventory",
      confidence: "low",
      relevanceScore: scored.score,
      matchedJdSignals: scored.matchedJdSignals,
      rationale: buildEvidenceRationale(`Skill (${item.category})`, scored.matchedJdSignals, false),
      eligibility,
      hasMetrics: false,
    });
  }

  const context = options.companyContext;
  if (context) {
    for (const priority of (context.likelyHiringPriorities ?? []).slice(0, 3)) {
      const scored = scoreEvidenceText(priority, { jdTerms });
      items.push({
        id: `company_context:priority:${priority.slice(0, 40)}`,
        sourceType: "company_context",
        sourceId: priority,
        originalText: priority,
        displayLabel: `Hiring priority: ${priority}`,
        state: "default",
        provenance: "context",
        confidence: context.confidence ?? "medium",
        relevanceScore: scored.score,
        matchedJdSignals: scored.matchedJdSignals,
        rationale: `Company hiring priority for positioning — not standalone proof.`,
        eligibility: "positioning_only",
        hasMetrics: false,
      });
    }
    for (const angle of (context.suggestedNarrativeAngles ?? []).slice(0, 2)) {
      const scored = scoreEvidenceText(angle, { jdTerms });
      items.push({
        id: `company_context:angle:${angle.slice(0, 40)}`,
        sourceType: "company_context",
        sourceId: angle,
        originalText: angle,
        displayLabel: `Narrative angle: ${angle}`,
        state: "default",
        provenance: "context",
        confidence: context.confidence ?? "medium",
        relevanceScore: scored.score,
        matchedJdSignals: scored.matchedJdSignals,
        rationale: `Suggested narrative angle for framing — claims must stay inventory-backed.`,
        eligibility: "positioning_only",
        hasMetrics: false,
      });
    }
  }

  return items;
}

export { extractJdMatchTerms };
