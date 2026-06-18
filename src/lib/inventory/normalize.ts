export function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function experienceKey(company: string, role: string): string {
  return `${normalizeKeyPart(company)}::${normalizeKeyPart(role)}`;
}

export function normalizeBulletText(text: string): string {
  return normalizeKeyPart(
    text.replace(/%/g, " percent "),
  );
}

export function normalizeItemText(text: string): string {
  return normalizeKeyPart(text);
}

/**
 * Near-duplicate detection for collated bullets within the same experience.
 * Keeps wording variants that are not clearly the same bullet.
 */
export function bulletsAreSimilar(a: string, b: string): boolean {
  const na = normalizeBulletText(a);
  const nb = normalizeBulletText(b);

  if (!na || !nb) return false;
  if (na === nb) return true;

  if (na.length > 20 && nb.length > 20) {
    if (na.includes(nb) || nb.includes(na)) {
      const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
      if (ratio > 0.75) return true;
    }
  }

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection += 1;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union >= 0.85;
}

export function preferLongerText(current: string, incoming: string): string {
  return incoming.length > current.length ? incoming : current;
}

export function preferLongerOptional(
  current?: string,
  incoming?: string,
): string | undefined {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.length > current.length ? incoming : current;
}
