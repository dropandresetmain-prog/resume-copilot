export type ParseConfidence = "high" | "medium" | "low";

export type ProfileParseResult<TBlock> = {
  blocks: TBlock[];
  confidence: ParseConfidence;
  score: number;
  warnings: string[];
  unconsumedLines: string[];
  profileId: string;
  profileName: string;
};

export type ExperienceParseProfile<TBlock> = {
  id: string;
  name: string;
  parse: (lines: string[]) => ProfileParseResult<TBlock>;
};
