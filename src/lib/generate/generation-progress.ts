export {
  buildCombinedProgressStages,
  combinedProgressResearchStageIndex,
  getGenerationStageIndices,
  researchProgressLabelAfterEnsure,
  researchProgressLabelForPlan,
  RESUME_ONLY_PROGRESS_STAGES,
} from "@/lib/company-context/research-plan";

export function generationProgressPercent(stageIndex: number, totalStages: number): number {
  if (totalStages <= 1) {
    return 100;
  }
  const clamped = Math.min(Math.max(stageIndex, 0), totalStages - 1);
  return Math.round(((clamped + 1) / totalStages) * 100);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
