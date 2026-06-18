/**
 * Split dense section text into atomic reusable items.
 * Delimiter rules are conservative to avoid over-splitting degree names.
 */

export function splitRespectingParens(
  text: string,
  delimiter: "," | ";" = ",",
): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === delimiter && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function looksLikeNewAdditionalExperienceEntry(segment: string): boolean {
  const trimmed = segment.trim();
  return /^[A-Z0-9]/.test(trimmed) && /[–—-]/.test(trimmed);
}

export function splitAdditionalExperienceSegments(text: string): string[] {
  const parts = splitRespectingParens(text, ",");
  if (parts.length <= 1) {
    return parts;
  }

  const merged: string[] = [];
  let current = "";

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (!current) {
      current = trimmed;
      continue;
    }

    if (looksLikeNewAdditionalExperienceEntry(trimmed)) {
      merged.push(current);
      current = trimmed;
    } else {
      current = `${current}, ${trimmed}`;
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

export function extractCategoryPrefix(text: string): {
  category?: string;
  remainder: string;
} {
  const match = text.match(/^([A-Za-z][A-Za-z\s/&]+):\s*(.+)$/);
  if (!match) {
    return { remainder: text.trim() };
  }

  return {
    category: match[1].trim(),
    remainder: match[2].trim(),
  };
}

export function splitSkillAtomicItems(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = splitRespectingParens(trimmed, ",");
  return parts.map((part) => part.trim()).filter(Boolean);
}
