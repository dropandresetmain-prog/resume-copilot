export const GENERATION_PROGRESS_STAGES = [
  "Reading job description",
  "Saving job record",
  "Researching company context",
  "Selecting relevant experience",
  "Drafting tailored resume",
  "Checking resume structure",
  "Drafting formal cover letter",
  "Preparing preview",
] as const;

export type GenerationProgressStage = (typeof GENERATION_PROGRESS_STAGES)[number];

export function generationProgressPercent(stageIndex: number): number {
  const total = GENERATION_PROGRESS_STAGES.length;
  if (total <= 1) {
    return 100;
  }
  const clamped = Math.min(Math.max(stageIndex, 0), total - 1);
  return Math.round(((clamped + 1) / total) * 100);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
