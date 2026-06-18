/**
 * Resume profile / contact block parsing from preamble or name-header lines.
 */

export type ParsedProfileContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  rawText: string;
  parseWarnings: string[];
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/;
const LINKEDIN_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i;

const SECTION_LIKE_WORDS = new Set([
  "WORK",
  "EXPERIENCE",
  "EDUCATION",
  "SKILLS",
  "SUMMARY",
  "CERTIFICATIONS",
  "PROJECTS",
  "LEADERSHIP",
  "VOLUNTEER",
  "EMPLOYMENT",
  "INTERESTS",
  "PROFILE",
  "CONTACT",
]);

/** Person-name lines such as "HSET MIN HTET" should not become section headers. */
export function looksLikePersonNameHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 80) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  if (!words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word))) return false;

  const upperWords = words.map((word) => word.toUpperCase());
  if (upperWords.some((word) => SECTION_LIKE_WORDS.has(word))) return false;

  const allCaps = words.every(
    (word) => word === word.toUpperCase() && word.length > 1,
  );
  const titleCase = words.every((word) => /^[A-Z][a-z]+(?:['-][A-Za-z]+)?$/.test(word));

  return allCaps || titleCase;
}

function extractEmail(line: string): string | undefined {
  return line.match(EMAIL_PATTERN)?.[0];
}

function extractPhone(line: string): string | undefined {
  const match = line.match(PHONE_PATTERN);
  if (!match) return undefined;
  const digits = match[0].replace(/\D/g, "");
  return digits.length >= 8 ? match[0].trim() : undefined;
}

function extractLinkedIn(line: string): string | undefined {
  const match = line.match(LINKEDIN_PATTERN);
  if (!match) return undefined;
  const value = match[0];
  return value.startsWith("http") ? value : `https://${value}`;
}

function looksLikeLocationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (EMAIL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed)) return false;
  if (LINKEDIN_PATTERN.test(trimmed)) return false;
  if (looksLikePersonNameHeader(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed) && /[,|]/.test(trimmed) || /\b(Singapore|Malaysia|USA|UK)\b/i.test(trimmed);
}

function normalizeFullName(line: string): string {
  const trimmed = line.trim();
  if (wordsAreAllCaps(trimmed)) {
    return trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  return trimmed;
}

function wordsAreAllCaps(line: string): boolean {
  const words = line.trim().split(/\s+/);
  return words.length > 0 && words.every((word) => word === word.toUpperCase());
}

export function parseProfileContact(lines: string[]): ParsedProfileContact | null {
  const contentLines = lines.map((line) => line.trim()).filter(Boolean);
  if (contentLines.length === 0) return null;

  const parseWarnings: string[] = [];
  let fullName: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let location: string | undefined;
  let linkedin: string | undefined;

  for (const line of contentLines) {
    email = email ?? extractEmail(line);
    phone = phone ?? extractPhone(line);
    linkedin = linkedin ?? extractLinkedIn(line);
  }

  const firstLine = contentLines[0];
  if (looksLikePersonNameHeader(firstLine)) {
    fullName = normalizeFullName(firstLine);
  } else if (!extractEmail(firstLine) && !extractPhone(firstLine) && firstLine.length <= 60) {
    fullName = firstLine;
    parseWarnings.push("Used first preamble line as full name without strong name-header confidence.");
  }

  for (const line of contentLines.slice(1)) {
    if (location) continue;
    if (looksLikeLocationLine(line)) {
      location = line;
    }
  }

  const confident = Boolean(fullName && (email || phone));
  if (!confident && !fullName) {
    return null;
  }

  if (!email && !phone && !fullName) {
    return null;
  }

  return {
    fullName,
    email,
    phone,
    location,
    linkedin,
    rawText: contentLines.join("\n"),
    parseWarnings,
  };
}

export function isConfidentProfileContact(
  profile: ParsedProfileContact | null,
): profile is ParsedProfileContact {
  if (!profile) return false;
  return Boolean(profile.fullName && (profile.email || profile.phone));
}
