import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  UnderlineType,
  convertMillimetersToTwip,
} from "docx";

import type { ResumeDocumentModel } from "@/lib/resume-draft/document-model";
import { formatCompanyLine } from "@/lib/resume-draft/layout";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const RIGHT_TAB_POSITION = convertMillimetersToTwip(170);

function cssPxToHalfPoints(px: number): number {
  return Math.round(px * 0.75 * 2);
}

function remToTwip(rem: number): number {
  return Math.round(rem * 16 * 15);
}

function resolvePrimaryFontFamily(fontFamily: string): string {
  return fontFamily.split(",")[0]?.replace(/['"]/g, "").trim() || "Calibri";
}

function lineSpacingMultiple(value: number) {
  return {
    line: Math.round(value * 240),
    lineRule: "auto" as const,
  };
}

function sectionSpacingTwip(sectionSpacingRem: number) {
  return remToTwip(sectionSpacingRem * 0.65);
}

function twoColumnParagraph(
  leftRuns: TextRun[],
  rightText: string | undefined,
  options?: { spacingAfter?: number },
): Paragraph {
  const children: Array<TextRun | Tab> = [...leftRuns];
  if (rightText?.trim()) {
    children.push(new Tab());
    children.push(new TextRun({ text: rightText.trim() }));
  }

  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
    spacing: options?.spacingAfter ? { after: options.spacingAfter } : undefined,
    children,
  });
}

function sectionHeading(text: string, halfPoints: number, font: string, spacingBefore: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: spacingBefore, after: 80 },
    border: {
      bottom: {
        color: "999999",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: halfPoints,
        font,
      }),
    ],
  });
}

function keywordBulletParagraph(
  keyword: string,
  statement: string,
  halfPoints: number,
  font: string,
): Paragraph {
  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: lineSpacingMultiple(1),
    children: [
      new TextRun({
        text: `${keyword}:`,
        underline: { type: UnderlineType.SINGLE },
        size: halfPoints,
        font,
      }),
      new TextRun({
        text: ` ${statement}`,
        size: halfPoints,
        font,
      }),
    ],
  });
}

function achievementBulletParagraph(
  prefix: string | undefined,
  underlinePrefix: boolean,
  text: string,
  halfPoints: number,
  font: string,
): Paragraph {
  const children: TextRun[] = [];
  if (prefix) {
    children.push(
      new TextRun({
        text: prefix,
        underline: underlinePrefix ? { type: UnderlineType.SINGLE } : undefined,
        size: halfPoints,
        font,
      }),
    );
    children.push(new TextRun({ text: ` ${text}`, size: halfPoints, font }));
  } else {
    children.push(new TextRun({ text, size: halfPoints, font }));
  }

  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: lineSpacingMultiple(1),
    children,
  });
}

function labeledCompactParagraph(
  label: string,
  value: string,
  halfPoints: number,
  font: string,
): Paragraph {
  return new Paragraph({
    spacing: lineSpacingMultiple(1),
    children: [
      new TextRun({
        text: `${label}:`,
        underline: { type: UnderlineType.SINGLE },
        size: halfPoints,
        font,
      }),
      new TextRun({ text: ` ${value}`, size: halfPoints, font }),
    ],
  });
}

/** Generate DOCX bytes from the canonical resume document model. */
export async function generateResumeDocxBuffer(model: ResumeDocumentModel): Promise<Buffer> {
  const { layout, layoutSettings, fontSizes } = model;
  const font = resolvePrimaryFontFamily(model.fontFamily);
  const bodyHalfPoints = cssPxToHalfPoints(fontSizes.bodyPx);
  const sectionHalfPoints = cssPxToHalfPoints(fontSizes.sectionPx);
  const sectionBefore = sectionSpacingTwip(layoutSettings.sectionSpacing);
  const headerAlignment =
    model.headerAlignment === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const children: Paragraph[] = [];

  if (layout.header.fullName) {
    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: layout.header.fullName,
            bold: true,
            size: sectionHalfPoints,
            font,
          }),
        ],
      }),
    );
  }

  if (layout.header.contactLine) {
    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: layout.header.contactLine,
            size: bodyHalfPoints,
            font,
          }),
        ],
      }),
    );
  }

  if (layout.workExperience.length > 0) {
    children.push(sectionHeading("Work Experience", sectionHalfPoints, font, sectionBefore));

    for (const experience of layout.workExperience) {
      children.push(
        twoColumnParagraph(
          [
            new TextRun({
              text: formatCompanyLine(experience.company, experience.companyDescriptor),
              bold: true,
              size: bodyHalfPoints,
              font,
            }),
          ],
          experience.location,
        ),
      );
      children.push(
        twoColumnParagraph(
          [
            new TextRun({
              text: experience.role,
              italics: true,
              size: bodyHalfPoints,
              font,
            }),
          ],
          experience.dateRange,
          { spacingAfter: 60 },
        ),
      );

      for (const bullet of experience.bullets) {
        children.push(
          keywordBulletParagraph(bullet.keyword, bullet.statement, bodyHalfPoints, font),
        );
      }
    }
  }

  if (layout.education.length > 0) {
    children.push(sectionHeading("Education", sectionHalfPoints, font, sectionBefore));

    for (const education of layout.education) {
      children.push(
        twoColumnParagraph(
          [
            new TextRun({
              text: education.institutionLine,
              bold: true,
              size: bodyHalfPoints,
              font,
            }),
          ],
          education.location,
        ),
      );

      for (const degree of education.degreeLines) {
        children.push(
          twoColumnParagraph(
            [
              new TextRun({
                text: degree.text,
                italics: true,
                size: bodyHalfPoints,
                font,
              }),
            ],
            degree.dateRange,
          ),
        );
      }

      for (const bullet of education.achievementBullets) {
        children.push(
          achievementBulletParagraph(
            bullet.prefix,
            bullet.underlinePrefix,
            bullet.text,
            bodyHalfPoints,
            font,
          ),
        );
      }
    }
  }

  if (layout.additionalExperienceLine) {
    children.push(sectionHeading("Additional Experience", sectionHalfPoints, font, sectionBefore));
    children.push(
      new Paragraph({
        spacing: lineSpacingMultiple(layoutSettings.lineSpacing),
        children: [
          new TextRun({
            text: layout.additionalExperienceLine,
            size: bodyHalfPoints,
            font,
          }),
        ],
      }),
    );
  }

  if (
    layout.techLine ||
    layout.skillsLine ||
    layout.languagesLine ||
    layout.interestsLine
  ) {
    children.push(sectionHeading("Skills & Interests", sectionHalfPoints, font, sectionBefore));

    if (layout.techLine) {
      children.push(labeledCompactParagraph("Tech", layout.techLine, bodyHalfPoints, font));
    }
    if (layout.skillsLine) {
      children.push(labeledCompactParagraph("Skills", layout.skillsLine, bodyHalfPoints, font));
    }
    if (layout.languagesLine) {
      children.push(
        labeledCompactParagraph("Languages", layout.languagesLine, bodyHalfPoints, font),
      );
    }
    if (layout.interestsLine) {
      children.push(
        labeledCompactParagraph("Interests", layout.interestsLine, bodyHalfPoints, font),
      );
    }
  }

  const document = new Document({
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
                paragraph: {
                  indent: { left: convertMillimetersToTwip(5), hanging: convertMillimetersToTwip(2) },
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
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export { DOCX_MIME };
