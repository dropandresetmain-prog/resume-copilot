import {
  bulletsAreSimilar,
  experienceKey,
  normalizeItemText,
  preferLongerOptional,
} from "@/lib/inventory/normalize";
import {
  extractCategoryPrefix,
  splitAdditionalExperienceSegments,
  splitSkillAtomicItems,
} from "@/lib/inventory/split-items";
import type {
  CollatedBullet,
  CollatedEducationItem,
  CollatedExperience,
  CollatedInventory,
  CollatedSkillCategory,
  CollatedSkillItem,
  CollatedTextItem,
  SourceCitation,
} from "@/types/collated";
import type {
  InventoryState,
  ParsedBullet,
  ParsedEducationItem,
  ParsedExperience,
  ParsedResume,
} from "@/types/resume";

function createId(): string {
  return crypto.randomUUID();
}

function citationFromResume(resume: ParsedResume): SourceCitation {
  return { resumeId: resume.id, filename: resume.filename };
}

function mergeCitations(
  existing: SourceCitation[],
  incoming: SourceCitation[],
): SourceCitation[] {
  const byResumeId = new Map(existing.map((item) => [item.resumeId, item]));
  for (const citation of incoming) {
    byResumeId.set(citation.resumeId, citation);
  }
  return [...byResumeId.values()];
}

function mergeRawTexts(existing: string[], incoming: string): string[] {
  if (!incoming) return existing;
  return [...new Set([...existing, incoming])];
}

function collateBullets(
  existing: CollatedBullet[],
  bullet: ParsedBullet,
  citation: SourceCitation,
): CollatedBullet[] {
  const description = bullet.description || bullet.rawBulletText;
  const match = existing.find((item) =>
    bulletsAreSimilar(item.description, description),
  );

  if (!match) {
    return [
      ...existing,
      {
        id: createId(),
        keyword: bullet.keyword || undefined,
        description,
        rawTexts: [bullet.rawBulletText],
        sourceCitations: [citation],
      },
    ];
  }

  return existing.map((item) => {
    if (item.id !== match.id) return item;

    return {
      ...item,
      keyword: item.keyword || bullet.keyword || undefined,
      description: preferLongerText(item.description, description),
      rawTexts: mergeRawTexts(item.rawTexts, bullet.rawBulletText),
      sourceCitations: mergeCitations(item.sourceCitations, [citation]),
    };
  });
}

function collateExperiences(resumes: ParsedResume[]): CollatedExperience[] {
  const byKey = new Map<string, CollatedExperience>();

  for (const resume of resumes) {
    const citation = citationFromResume(resume);

    for (const experience of resume.workExperiences) {
      const key = experienceKey(experience.company, experience.role);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, experienceToCollated(experience, citation));
        continue;
      }

      byKey.set(key, {
        ...existing,
        descriptor: preferLongerOptional(existing.descriptor, experience.descriptor),
        location: preferLongerOptional(existing.location, experience.location),
        dateRange: preferLongerOptional(existing.dateRange, experience.dateRange),
        experienceDuration:
          existing.experienceDuration ?? experience.experienceDuration,
        sourceCitations: mergeCitations(existing.sourceCitations, [citation]),
        bullets: experience.bullets.reduce(
          (bullets, bullet) => collateBullets(bullets, bullet, citation),
          existing.bullets,
        ),
      });
    }
  }

  return [...byKey.values()];
}

function experienceToCollated(
  experience: ParsedExperience,
  citation: SourceCitation,
): CollatedExperience {
  return {
    id: createId(),
    company: experience.company,
    role: experience.role,
    descriptor: experience.descriptor || undefined,
    location: experience.location || undefined,
    dateRange: experience.dateRange || undefined,
    experienceDuration: experience.experienceDuration,
    sourceCitations: [citation],
    bullets: experience.bullets.map((bullet) => ({
      id: createId(),
      keyword: bullet.keyword || undefined,
      description: bullet.description || bullet.rawBulletText,
      rawTexts: [bullet.rawBulletText],
      sourceCitations: [citation],
    })),
  };
}

function preferLongerText(current: string, incoming: string): string {
  return incoming.length > current.length ? incoming : current;
}

function educationMergeKey(item: {
  institution: string;
  dateRange?: string;
  programmes: string[];
}): string {
  const programmeKey = [...item.programmes]
    .map((programme) => normalizeItemText(programme))
    .sort()
    .join("|");
  return `${normalizeItemText(item.institution)}::${normalizeItemText(item.dateRange ?? "")}::${programmeKey}`;
}

function mergeProgrammes(existing: string[], incoming: string[]): string[] {
  const merged = [...existing];
  for (const programme of incoming) {
    const normalized = normalizeItemText(programme);
    const match = merged.find(
      (entry) => normalizeItemText(entry) === normalized,
    );
    if (!match) {
      merged.push(programme);
    }
  }
  return merged;
}

function mergeEducationBullets(existing: string[], incoming: string[]): string[] {
  const merged = [...existing];
  for (const bullet of incoming) {
    const normalized = normalizeItemText(bullet);
    const exactMatch = merged.find(
      (entry) => normalizeItemText(entry) === normalized,
    );
    if (!exactMatch) {
      merged.push(bullet);
    }
  }
  return merged;
}

function educationToCollated(
  education: ParsedEducationItem,
  citation: SourceCitation,
): CollatedEducationItem {
  return {
    id: createId(),
    institution: education.institution,
    location: education.location,
    programmes: [...education.programmes],
    dateRange: education.dateRange,
    experienceDuration: education.experienceDuration,
    bullets: [...education.bullets],
    rawTexts: education.rawText ? [education.rawText] : [],
    sourceCitations: [citation],
    parseWarnings: [...education.parseWarnings],
  };
}

function mergeEducationItems(
  existing: CollatedEducationItem,
  incoming: CollatedEducationItem,
): CollatedEducationItem {
  return {
    ...existing,
    location: preferLongerOptional(existing.location, incoming.location),
    programmes: mergeProgrammes(existing.programmes, incoming.programmes),
    dateRange: preferLongerOptional(existing.dateRange, incoming.dateRange),
    experienceDuration:
      existing.experienceDuration ?? incoming.experienceDuration,
    bullets: mergeEducationBullets(existing.bullets, incoming.bullets),
    rawTexts: [...new Set([...existing.rawTexts, ...incoming.rawTexts])],
    sourceCitations: mergeCitations(
      existing.sourceCitations,
      incoming.sourceCitations,
    ),
    parseWarnings: [
      ...new Set([...existing.parseWarnings, ...incoming.parseWarnings]),
    ],
  };
}

function collateEducation(resumes: ParsedResume[]): CollatedEducationItem[] {
  const byKey = new Map<string, CollatedEducationItem>();

  for (const resume of resumes) {
    const citation = citationFromResume(resume);

    for (const education of resume.education) {
      if (!education.institution.trim() && education.programmes.length === 0) {
        continue;
      }

      const collated = educationToCollated(education, citation);
      const key = educationMergeKey(collated);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, collated);
        continue;
      }

      byKey.set(key, mergeEducationItems(existing, collated));
    }
  }

  return [...byKey.values()];
}

function addTextItem(
  items: CollatedTextItem[],
  draft: Omit<CollatedTextItem, "id">,
): CollatedTextItem[] {
  const key = `${draft.category ?? ""}::${normalizeItemText(draft.text)}`;
  const match = items.find(
    (item) => `${item.category ?? ""}::${normalizeItemText(item.text)}` === key,
  );

  if (!match) {
    return [...items, { ...draft, id: createId() }];
  }

  return items.map((item) => {
    if (item.id !== match.id) return item;

    return {
      ...item,
      rawTexts: [...new Set([...item.rawTexts, ...draft.rawTexts])],
      sourceCitations: mergeCitations(item.sourceCitations, draft.sourceCitations),
    };
  });
}

function collateAdditionalExperience(
  resumes: ParsedResume[],
): CollatedTextItem[] {
  let items: CollatedTextItem[] = [];

  for (const resume of resumes) {
    const citation = citationFromResume(resume);

    for (const line of resume.additionalExperience.lines) {
      const { category, remainder } = extractCategoryPrefix(line);
      const segments = splitAdditionalExperienceSegments(remainder || line);

      for (const segment of segments) {
        items = addTextItem(items, {
          category,
          text: segment,
          rawTexts: [line],
          sourceCitations: [citation],
        });
      }
    }
  }

  return items;
}

function addSkillItem(
  items: CollatedSkillItem[],
  category: CollatedSkillCategory,
  text: string,
  citation: SourceCitation,
): CollatedSkillItem[] {
  const key = `${category}::${normalizeItemText(text)}`;
  const match = items.find(
    (item) => `${item.category}::${normalizeItemText(item.text)}` === key,
  );

  if (!match) {
    return [...items, { id: createId(), category, text, sourceCitations: [citation] }];
  }

  return items.map((item) => {
    if (item.id !== match.id) return item;
    return {
      ...item,
      sourceCitations: mergeCitations(item.sourceCitations, [citation]),
    };
  });
}

function collateSkills(resumes: ParsedResume[]): CollatedSkillItem[] {
  let items: CollatedSkillItem[] = [];

  const categoryMap: {
    key: CollatedSkillCategory;
    values: (resume: ParsedResume) => string[];
  }[] = [
    { key: "Languages", values: (resume) => resume.skills.languages },
    { key: "Technical Skills", values: (resume) => resume.skills.technicalSkills },
    { key: "Interests", values: (resume) => resume.skills.interests },
    { key: "Other", values: (resume) => resume.skills.other },
  ];

  for (const resume of resumes) {
    const citation = citationFromResume(resume);

    for (const { key, values } of categoryMap) {
      for (const entry of values(resume)) {
        for (const atomic of splitSkillAtomicItems(entry)) {
          items = addSkillItem(items, key, atomic, citation);
        }
      }
    }
  }

  return items;
}

/**
 * Build a derived collated inventory from parsed resumes.
 * Does not mutate the source resume data.
 */
export function buildCollatedInventory(
  inventory: InventoryState,
): CollatedInventory {
  const resumes = inventory.resumes;

  return {
    experiences: collateExperiences(resumes),
    educationItems: collateEducation(resumes),
    additionalExperienceItems: collateAdditionalExperience(resumes),
    skillItems: collateSkills(resumes),
  };
}

export function countCollatedInventory(collated: CollatedInventory) {
  return {
    experiences: collated.experiences.length,
    bullets: collated.experiences.reduce(
      (total, experience) => total + experience.bullets.length,
      0,
    ),
    educationItems: collated.educationItems.length,
    additionalExperienceItems: collated.additionalExperienceItems.length,
    skillItems: collated.skillItems.length,
  };
}
