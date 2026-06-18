# HANDOFF

## Current milestone

**v0.5.1 — Final Resume Layout Preview**

Post-generation flow now lands on `/resume-preview/[draftId]` with an A4 layout preview (canonical for future DOCX/PDF export), fit assessment panel, and **Approve for Export**. **Edit Resume Details** opens the secondary review workspace.

## Product flow

```
Generate → Final Resume Layout Preview → Approve for Export → (future DOCX/PDF)
                              ↘ Edit Resume Details → Review Workspace
```

## Reference resume (formatting only)

Reference resume is a **formatting/template reference**, not a content source.

- `buildReferenceResumeFormatProfile()` sends layout signals only (bullet style, section order, header contact layout).
- Generated content comes from inventory, approved keywords, and job description.
- Prompt and mock enforce **Keyword: Experience statement** bullets.

## Final resume structure (exact order)

1. Header — Name; Phone | Email
2. Work Experience
3. Education
4. Additional Experience (compact comma-separated line)
5. Skills & Interests (separate Skills and Interests lines)

No Professional Summary in generated resumes (reserved for cover letters later).

## Roadmap

| Milestone | Status |
|-----------|--------|
| 4A — AI resume draft generation | Complete |
| 4B — Resume draft review UI | Complete (v0.5.0) |
| **v0.5.1 — Final layout preview** | **Current** |
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
