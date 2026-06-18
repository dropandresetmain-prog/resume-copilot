export type CompanyLineSegment = {
  text: string;
  bold: boolean;
};

/** Company name bold; parenthetical descriptor normal weight. */
export function buildCompanyLineSegments(
  company: string,
  companyDescriptor?: string,
): CompanyLineSegment[] {
  const cleanCompany = company.trim();
  const cleanDescriptor = companyDescriptor?.trim();
  const segments: CompanyLineSegment[] = [{ text: cleanCompany, bold: true }];

  if (cleanDescriptor) {
    segments.push({ text: ` (${cleanDescriptor})`, bold: false });
  }

  return segments;
}

export const DOCX_TWO_COLUMN_LAYOUT = "borderless-table" as const;
