import type {
  ResumeDraftContent,
  ResumeDraftExperienceBullet,
} from "@/types/resume-draft";

/** Review status for generated draft items — never written back to source inventory. */
export type ReviewItemStatus = "pending" | "accepted" | "edited" | "rejected";

export type ReviewedTextItem = {
  status: ReviewItemStatus;
  editedText?: string;
};

export type ReviewedSkillsGroup = {
  status: ReviewItemStatus;
  editedLabel?: string;
  editedItems?: string[];
};

export type ReviewedEducationItem = {
  bullets: ReviewedTextItem[];
  editedProgrammes?: string[];
};

export type ResumeDraftReviewState = {
  schemaVersion: 1;
  professionalSummary: ReviewedTextItem;
  skillsGroups: ReviewedSkillsGroup[];
  experienceBullets: ReviewedTextItem[][];
  education: ReviewedEducationItem[];
  additionalExperience: ReviewedTextItem[];
};

export const RESUME_DRAFT_REVIEW_STATE_VERSION = 1 as const;

function cloneContent(content: ResumeDraftContent): ResumeDraftContent {
  return JSON.parse(JSON.stringify(content)) as ResumeDraftContent;
}

function defaultReviewItem(): ReviewedTextItem {
  return { status: "pending" };
}

/** Initialize review state from generated draft content. */
export function createInitialReviewState(content: ResumeDraftContent): ResumeDraftReviewState {
  return {
    schemaVersion: RESUME_DRAFT_REVIEW_STATE_VERSION,
    professionalSummary: defaultReviewItem(),
    skillsGroups: content.skills.groups.map(() => defaultReviewItem()),
    experienceBullets: content.experience.map((experience) =>
      experience.bullets.map(() => defaultReviewItem()),
    ),
    education: content.education.map((item) => ({
      bullets: item.bullets.map(() => defaultReviewItem()),
      editedProgrammes: undefined,
    })),
    additionalExperience: content.additionalExperience.map(() => defaultReviewItem()),
  };
}

function resolveText(
  originalText: string,
  review: ReviewedTextItem | undefined,
  options?: { includePending?: boolean },
): string | null {
  const includePending = options?.includePending ?? true;
  const status = review?.status ?? "pending";

  if (status === "rejected") {
    return null;
  }

  if (status === "edited" && review?.editedText !== undefined) {
    return review.editedText;
  }

  if (!includePending && status === "pending") {
    return null;
  }

  return originalText;
}

function resolveExperienceBullet(
  bullet: ResumeDraftExperienceBullet,
  review: ReviewedTextItem | undefined,
  includePending: boolean,
): ResumeDraftExperienceBullet | null {
  const text = resolveText(bullet.text, review, { includePending });
  if (!text) {
    return null;
  }

  return {
    ...bullet,
    text,
  };
}

/**
 * Apply review edits to a copy of generated draft content.
 * Rejected bullets are omitted. Edited text replaces generated text.
 * Source inventory is never touched — only the generated draft copy changes.
 */
export function applyReviewStateToContent(
  content: ResumeDraftContent,
  reviewState: ResumeDraftReviewState,
  options?: { includePending?: boolean },
): ResumeDraftContent {
  const includePending = options?.includePending ?? true;
  const next = cloneContent(content);

  const summaryText = resolveText(
    content.professionalSummary.text,
    reviewState.professionalSummary,
    { includePending },
  );
  if (summaryText) {
    next.professionalSummary = {
      ...content.professionalSummary,
      text: summaryText,
    };
  } else {
    next.professionalSummary = {
      ...content.professionalSummary,
      text: "",
    };
  }

  next.skills = {
    ...content.skills,
    groups: content.skills.groups
      .map((group, groupIndex) => {
        const review = reviewState.skillsGroups[groupIndex];
        if (review?.status === "rejected") {
          return null;
        }

        const label =
          review?.status === "edited" && review.editedLabel !== undefined
            ? review.editedLabel
            : group.label;
        const items =
          review?.status === "edited" && review.editedItems
            ? review.editedItems
            : group.items;

        if (!includePending && review?.status === "pending") {
          return null;
        }

        return { label, items };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null),
  };

  next.experience = content.experience
    .map((experience, experienceIndex) => {
      const bullets = experience.bullets
        .map((bullet, bulletIndex) =>
          resolveExperienceBullet(
            bullet,
            reviewState.experienceBullets[experienceIndex]?.[bulletIndex],
            includePending,
          ),
        )
        .filter((bullet): bullet is ResumeDraftExperienceBullet => bullet !== null);

      if (bullets.length === 0) {
        return null;
      }

      return {
        ...experience,
        bullets,
      };
    })
    .filter((experience): experience is NonNullable<typeof experience> => experience !== null);

  next.education = content.education
    .map((item, educationIndex) => {
      const review = reviewState.education[educationIndex];
      const programmes =
        review?.editedProgrammes !== undefined ? review.editedProgrammes : item.programmes;
      const bullets = item.bullets
        .map((bullet, bulletIndex) =>
          resolveText(bullet, review?.bullets[bulletIndex], { includePending }),
        )
        .filter((bullet): bullet is string => Boolean(bullet));

      if (bullets.length === 0 && programmes.length === 0) {
        return null;
      }

      return {
        ...item,
        programmes,
        bullets,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  next.additionalExperience = content.additionalExperience
    .map((item, itemIndex) => {
      const text = resolveText(item.text, reviewState.additionalExperience[itemIndex], {
        includePending,
      });
      if (!text) {
        return null;
      }
      return {
        ...item,
        text,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return next;
}

export function updateProfessionalSummaryReview(
  state: ResumeDraftReviewState,
  update: Partial<ReviewedTextItem>,
): ResumeDraftReviewState {
  return {
    ...state,
    professionalSummary: {
      ...state.professionalSummary,
      ...update,
    },
  };
}

export function updateExperienceBulletReview(
  state: ResumeDraftReviewState,
  experienceIndex: number,
  bulletIndex: number,
  update: Partial<ReviewedTextItem>,
): ResumeDraftReviewState {
  const experienceBullets = state.experienceBullets.map((bullets, index) =>
    index === experienceIndex
      ? bullets.map((bullet, currentBulletIndex) =>
          currentBulletIndex === bulletIndex ? { ...bullet, ...update } : bullet,
        )
      : bullets,
  );

  return {
    ...state,
    experienceBullets,
  };
}

export function updateSkillsGroupReview(
  state: ResumeDraftReviewState,
  groupIndex: number,
  update: Partial<ReviewedSkillsGroup>,
): ResumeDraftReviewState {
  return {
    ...state,
    skillsGroups: state.skillsGroups.map((group, index) =>
      index === groupIndex ? { ...group, ...update } : group,
    ),
  };
}

export function updateEducationBulletReview(
  state: ResumeDraftReviewState,
  educationIndex: number,
  bulletIndex: number,
  update: Partial<ReviewedTextItem>,
): ResumeDraftReviewState {
  return {
    ...state,
    education: state.education.map((item, index) =>
      index === educationIndex
        ? {
            ...item,
            bullets: item.bullets.map((bullet, currentBulletIndex) =>
              currentBulletIndex === bulletIndex ? { ...bullet, ...update } : bullet,
            ),
          }
        : item,
    ),
  };
}

export function updateAdditionalExperienceReview(
  state: ResumeDraftReviewState,
  itemIndex: number,
  update: Partial<ReviewedTextItem>,
): ResumeDraftReviewState {
  return {
    ...state,
    additionalExperience: state.additionalExperience.map((item, index) =>
      index === itemIndex ? { ...item, ...update } : item,
    ),
  };
}

export function countReviewDecisions(state: ResumeDraftReviewState): {
  pending: number;
  accepted: number;
  edited: number;
  rejected: number;
} {
  const items: ReviewItemStatus[] = [
    state.professionalSummary.status,
    ...state.skillsGroups.map((group) => group.status),
    ...state.experienceBullets.flat().map((bullet) => bullet.status),
    ...state.education.flatMap((item) => item.bullets.map((bullet) => bullet.status)),
    ...state.additionalExperience.map((item) => item.status),
  ];

  return {
    pending: items.filter((status) => status === "pending").length,
    accepted: items.filter((status) => status === "accepted").length,
    edited: items.filter((status) => status === "edited").length,
    rejected: items.filter((status) => status === "rejected").length,
  };
}

/** True when review overlay would change persisted draft content. */
export function reviewStateDiffersFromSavedContent(
  savedContent: ResumeDraftContent,
  reviewState: ResumeDraftReviewState,
): boolean {
  const nextContent = applyReviewStateToContent(savedContent, reviewState, {
    includePending: true,
  });
  return JSON.stringify(nextContent) !== JSON.stringify(savedContent);
}
