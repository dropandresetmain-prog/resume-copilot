import type { ParsedResume } from "@/types/resume";
import type { ResumeDraftReferenceResumeExcerpt } from "@/types/resume-draft";
import {
  DEFAULT_RESUME_FONT_FAMILY,
  PREVIEW_BODY_FONT_DEFAULT_PX,
} from "@/lib/resume-draft/preview-settings";

const KEYWORD_COLON_PATTERN = /^[^:]{1,40}:\s+/;

/**
 * Prefer Gill Sans MT to match common reference resumes; fallback to professional sans-serif stack.
 */
export function detectResumeFontFamily(_resume: ParsedResume): string {
  void _resume;
  return DEFAULT_RESUME_FONT_FAMILY;
}

/**
 * Build formatting-only reference profile for generation.
 * Reference resume must NOT be used as a content source — layout/style signals only.
 */
export function buildReferenceResumeFormatProfile(
  resume: ParsedResume,
): ResumeDraftReferenceResumeExcerpt {
  const sampleBullets = resume.workExperiences
    .flatMap((experience) => experience.bullets)
    .slice(0, 8)
    .map((bullet) => bullet.description || bullet.rawBulletText)
    .filter(Boolean);

  const keywordColonCount = sampleBullets.filter((text) =>
    KEYWORD_COLON_PATTERN.test(text.trim()),
  ).length;

  const bulletStyle =
    sampleBullets.length === 0 || keywordColonCount >= Math.ceil(sampleBullets.length / 2)
      ? "keyword_colon"
      : "keyword_colon";

  return {
    resumeId: resume.id,
    filename: resume.filename,
    formattingOnly: true,
    bulletStyle,
    sectionOrder: [
      "header",
      "workExperience",
      "education",
      "additionalExperience",
      "skillsAndInterests",
    ],
    headerContact: {
      fullName: resume.profile?.fullName,
      phone: resume.profile?.phone,
      email: resume.profile?.email,
    },
    densityHint: "compact",
    fontFamily: detectResumeFontFamily(resume),
    bodyFontSizePx: PREVIEW_BODY_FONT_DEFAULT_PX,
    headerAlignment: "center",
  };
}
