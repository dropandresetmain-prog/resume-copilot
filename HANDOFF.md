# HANDOFF

## Current milestone

**v0.5.2 — Resume Layout Fidelity Fixes**

Preview now matches reference resume layout more closely: work/education line structure, visible bullet markers, underlined keyword labels, A4 page boundary, compact Skills/Languages/Interests lines, and dedicated edit route.

## Product flow

```
Generate → Final Resume Layout Preview → Approve for Export → (future DOCX/PDF)
                              ↘ Edit Resume Details → /resume-preview/[draftId]/edit
```

## Layout fidelity (v0.5.2)

**Work Experience**
- Line 1: **Company (descriptor)** left · location right
- Line 2: *Role* left · date range right
- Bullets: visible markers; `Keyword:` underlined + description

**Education**
- Line 1: **Institution · programme** left · location right
- Line 2: *Degree* left · date range right (shared range shown once for double degrees)
- Achievement bullets with underlined `Achievement:` when prefixed

**Additional Experience**
- Compact comma-separated line
- Excludes languages, interests, and technical skills (those go to Skills & Interests)

**Skills & Interests**
- Section title: SKILLS & INTERESTS
- Underlined labels: Skills:, Languages:, Interests:

**A4 preview**
- Visible page container (210 × 297 mm aspect ratio), white page on slate background, dashed one-page boundary

## Reference resume (formatting only)

Reference resume is a **formatting/template reference**, not a content source.

- `buildReferenceResumeFormatProfile()` sends layout signals only.
- Generated content comes from inventory, approved keywords, and job description.
- First draft targets one A4 page: 2–4 strong bullets per role; compact additional/skills sections.

## Final resume structure (exact order)

1. Header — Name; Phone | Email
2. Work Experience
3. Education
4. Additional Experience
5. Skills & Interests

No Professional Summary in generated resumes (reserved for cover letters later).

## Duration calculation

Experience durations use **inclusive months** (Mar–Jun 2019 = 4 months). See `src/lib/date/duration.ts`.

## Roadmap

| Milestone | Status |
|-----------|--------|
| 4A — AI resume draft generation | Complete |
| 4B — Resume draft review UI | Complete (v0.5.0) |
| v0.5.1 — Final layout preview | Complete |
| **v0.5.2 — Layout fidelity fixes** | **Current** |
| 4C — Draft management | Not started |
| v0.6.0 — DOCX export | Next |
| v0.6.1 — PDF export | Planned |
| v0.7.0 — Cover letter generation | Planned |

Validate final resume output before building exports and cover letters.

## Approval

**Approve for Export** sets `generated_resume_drafts.status` to `approved` and saves draft content. Export not implemented yet.

## Run

```bash
npm run dev
npm run test
```
