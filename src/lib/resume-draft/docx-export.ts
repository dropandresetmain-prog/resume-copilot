import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertMillimetersToTwip,
} from "docx";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { resolveDocxFontSizes } from "@/lib/resume-draft/docx-font";
import { buildCompanyLineSegments } from "@/lib/resume-draft/docx-layout-helpers";
import { formatCandidateDisplayName } from "@/lib/resume-draft/resume-layout-styles";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

function remToTwip(rem: number): number {
  return Math.round(rem * 12 * 20);
}

function lineSpacingMultiple(value: number) {
  return {
    line: Math.round(value * 240),
    lineRule: "auto" as const,
  };
}

function sectionSpacingBefore(sectionSpacingRem: number): number {
  return remToTwip(sectionSpacingRem * 0.55);
}

function makeRun(
  text: string,
  font: string,
  sizeHalfPoints: number,
  options?: {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
  },
): TextRun {
  return new TextRun({
    text,
    font,
    size: sizeHalfPoints,
    bold: options?.bold,
    italics: options?.italics,
    underline: options?.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function twoColumnTable(
  leftRuns: TextRun[],
  rightText: string | undefined,
  font: string,
  sizeHalfPoints: number,
  options?: { spacingAfter?: number },
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            margins: { top: 0, bottom: 0, left: 0, right: 80 },
            children: [
              new Paragraph({
                spacing: options?.spacingAfter ? { after: options.spacingAfter } : { after: 0 },
                children: leftRuns,
              }),
            ],
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            margins: { top: 0, bottom: 0, left: 80, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: options?.spacingAfter ? { after: options.spacingAfter } : { after: 0 },
                children: rightText?.trim()
                  ? [makeRun(rightText.trim(), font, sizeHalfPoints)]
                  : [],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function sectionHeading(
  text: string,
  headerHalfPoints: number,
  font: string,
  spacingBefore: number,
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: spacingBefore, after: 60 },
    border: {
      bottom: {
        color: "999999",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      makeRun(text.toUpperCase(), font, headerHalfPoints, { bold: true }),
    ],
  });
}

function keywordBulletParagraph(
  keyword: string,
  statement: string,
  bodyHalfPoints: number,
  font: string,
  lineSpacing: number,
): Paragraph {
  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: { ...lineSpacingMultiple(lineSpacing), after: 20 },
    children: [
      makeRun(`${keyword}:`, font, bodyHalfPoints, { underline: true }),
      makeRun(` ${statement}`, font, bodyHalfPoints),
    ],
  });
}

function achievementBulletParagraph(
  prefix: string | undefined,
  underlinePrefix: boolean,
  text: string,
  bodyHalfPoints: number,
  font: string,
  lineSpacing: number,
): Paragraph {
  const children: TextRun[] = prefix
    ? [
        makeRun(prefix, font, bodyHalfPoints, { underline: underlinePrefix }),
        makeRun(` ${text}`, font, bodyHalfPoints),
      ]
    : [makeRun(text, font, bodyHalfPoints)];

  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: { ...lineSpacingMultiple(lineSpacing), after: 20 },
    children,
  });
}

function labeledCompactParagraph(
  label: string,
  value: string,
  bodyHalfPoints: number,
  font: string,
  lineSpacing: number,
): Paragraph {
  return new Paragraph({
    spacing: { ...lineSpacingMultiple(lineSpacing), after: 20 },
    children: [
      makeRun(`${label}:`, font, bodyHalfPoints, { underline: true }),
      makeRun(` ${value}`, font, bodyHalfPoints),
    ],
  });
}

function companyLineRuns(
  company: string,
  companyDescriptor: string | undefined,
  bodyHalfPoints: number,
  font: string,
): TextRun[] {
  return buildCompanyLineSegments(company, companyDescriptor).map((segment) =>
    makeRun(segment.text, font, bodyHalfPoints, { bold: segment.bold }),
  );
}

type DocxBlock = Paragraph | Table;

/** Generate DOCX bytes from the canonical resume document model. */
export async function generateResumeDocxBuffer(model: ResumeDocumentModel): Promise<Buffer> {
  const { layout, layoutSettings } = model;
  const fonts = resolveDocxFontSizes(layoutSettings.bodyFontPx, model.fontFamily);
  const { font, bodyHalfPoints, headerHalfPoints } = fonts;
  const sectionBefore = sectionSpacingBefore(layoutSettings.sectionSpacing);
  const headerAlignment =
    model.headerAlignment === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const blocks: DocxBlock[] = [];

  if (layout.header.fullName) {
    blocks.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: 40 },
        children: [
          makeRun(formatCandidateDisplayName(layout.header.fullName), font, headerHalfPoints, {
            bold: true,
          }),
        ],
      }),
    );
  }

  if (layout.header.contactLine) {
    blocks.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: 100 },
        children: [makeRun(layout.header.contactLine, font, bodyHalfPoints)],
      }),
    );
  }

  if (layout.workExperience.length > 0) {
    blocks.push(sectionHeading("Work Experience", headerHalfPoints, font, sectionBefore));

    for (const experience of layout.workExperience) {
      blocks.push(
        twoColumnTable(
          companyLineRuns(
            experience.company,
            experience.companyDescriptor,
            bodyHalfPoints,
            font,
          ),
          experience.location,
          font,
          bodyHalfPoints,
        ),
      );
      blocks.push(
        twoColumnTable(
          [makeRun(experience.role, font, bodyHalfPoints, { italics: true })],
          experience.dateRange,
          font,
          bodyHalfPoints,
          { spacingAfter: 40 },
        ),
      );

      for (const bullet of experience.bullets) {
        blocks.push(
          keywordBulletParagraph(
            bullet.keyword,
            bullet.statement,
            bodyHalfPoints,
            font,
            layoutSettings.lineSpacing,
          ),
        );
      }
    }
  }

  if (layout.education.length > 0) {
    blocks.push(sectionHeading("Education", headerHalfPoints, font, sectionBefore));

    for (const education of layout.education) {
      blocks.push(
        twoColumnTable(
          [makeRun(education.institutionLine, font, bodyHalfPoints, { bold: true })],
          education.location,
          font,
          bodyHalfPoints,
        ),
      );

      for (const degree of education.degreeLines) {
        blocks.push(
          twoColumnTable(
            [makeRun(degree.text, font, bodyHalfPoints, { italics: true })],
            degree.dateRange,
            font,
            bodyHalfPoints,
            { spacingAfter: 20 },
          ),
        );
      }

      for (const bullet of education.achievementBullets) {
        blocks.push(
          achievementBulletParagraph(
            bullet.prefix,
            bullet.underlinePrefix,
            bullet.text,
            bodyHalfPoints,
            font,
            layoutSettings.lineSpacing,
          ),
        );
      }
    }
  }

  if (layout.additionalExperienceLine) {
    blocks.push(sectionHeading("Additional Experience", headerHalfPoints, font, sectionBefore));
    blocks.push(
      new Paragraph({
        spacing: { ...lineSpacingMultiple(layoutSettings.lineSpacing), after: 40 },
        children: [makeRun(layout.additionalExperienceLine, font, bodyHalfPoints)],
      }),
    );
  }

  if (
    layout.skillsLine ||
    layout.languagesLine ||
    layout.interestsLine
  ) {
    blocks.push(sectionHeading("Skills & Interests", headerHalfPoints, font, sectionBefore));

    if (layout.skillsLine) {
      blocks.push(
        labeledCompactParagraph(
          "Skills",
          layout.skillsLine,
          bodyHalfPoints,
          font,
          layoutSettings.lineSpacing,
        ),
      );
    }
    if (layout.languagesLine) {
      blocks.push(
        labeledCompactParagraph(
          "Languages",
          layout.languagesLine,
          bodyHalfPoints,
          font,
          layoutSettings.lineSpacing,
        ),
      );
    }
    if (layout.interestsLine) {
      blocks.push(
        labeledCompactParagraph(
          "Interests",
          layout.interestsLine,
          bodyHalfPoints,
          font,
          layoutSettings.lineSpacing,
        ),
      );
    }
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font,
            size: bodyHalfPoints,
          },
          paragraph: {
            spacing: { after: 0, line: lineSpacingMultiple(layoutSettings.lineSpacing).line },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                run: {
                  font,
                  size: bodyHalfPoints,
                },
                paragraph: {
                  indent: {
                    left: convertMillimetersToTwip(4),
                    hanging: convertMillimetersToTwip(2),
                  },
                  spacing: lineSpacingMultiple(layoutSettings.lineSpacing),
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(layoutSettings.marginTopMm),
              bottom: convertMillimetersToTwip(layoutSettings.marginMm),
              left: convertMillimetersToTwip(layoutSettings.marginMm),
              right: convertMillimetersToTwip(layoutSettings.marginMm),
            },
          },
        },
        children: blocks,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export { DOCX_MIME, companyLineRuns, twoColumnTable };
