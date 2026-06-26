# Career Resume Copilot

**v0.9.8G** — Application package, company research, cover letters, and resume auto-repair

Tailor one-page resumes from your career inventory and job descriptions, preview layout, **pass server one-page PDF validation on Approve**, and download **PDF** (primary final deliverable) or **DOCX** (editable secondary output). Combined generation can produce resume + cover letter with automatic company research when a website is provided.

Supabase is the source of truth for inventory, applications, drafts, and exported files.

## Product flow

```
Upload resumes → Build inventory → (optional) Enrich bullets → Paste JD → Generate Resume & Cover Letter
  → Application package (resume + cover letter + company research) → Approve → Download PDF / DOCX
```

1. **Manage Uploads** (`/setup`) — upload `.docx` resumes; parsing runs in the browser.
2. **Career Inventory** (`/inventory`) — collated experience, education, skills; optional AI enrichment review; **Edit Bullets** overlay (hide/edit wording without mutating source files).
3. **Generate** (`/generate`) — paste JD; combined flow researches company website via **Firecrawl** when provided and no website-backed research exists; generates resume and cover letter.
4. **Application package** (`/resume-preview/[draftId]`) — resume preview, approve/export, inline cover letter, collapsed company research, optional evidence regeneration.
5. **Cover letter editor** (`/cover-letter-preview/[draftId]`) — full edit, quick revision, PDF/DOCX export.
6. **Records** (`/records`) — applications (status, notes, linked drafts), saved jobs, unlinked draft history.
7. **Profile** (`/profile`) — Application Communication Profile for cover letter tone.

## What is built

| Area | Status |
|------|--------|
| DOCX resume parsing (browser) | ✅ |
| Supabase inventory + JD sync | ✅ |
| Original resume file storage | ✅ |
| AI enrichment review (mock / Gemini) | ✅ |
| Inventory bullet editing overlay (v0.7.7) | ✅ |
| Resume draft generation (mock / Gemini) | ✅ |
| Resume structure auto-repair (v0.9.8B) | ✅ |
| One-page layout preview + optimizer | ✅ |
| **PDF export** + server one-page validation | ✅ Primary deliverable |
| **DOCX export** (shared document model) | ✅ Secondary / editable |
| Cover letter generation + revision | ✅ |
| Company context (Gemini, per-application) | ✅ v0.9.3 |
| Firecrawl website research | ✅ v0.9.5 |
| Auto research in combined generate | ✅ v0.9.6 |
| Application package UX | ✅ v0.9.8 |

## Export strategy

| Format | Role | Notes |
|--------|------|--------|
| **PDF** | Primary final deliverable | Puppeteer + one-page gate on Approve. Structured filename: `Name - Resume_Company_Role.pdf` |
| **DOCX** | Secondary editable output | Word may reflow; same document model as PDF preview. |

Resumes do **not** include a Professional Summary section. Cover letters are separate artifacts with a 420-word export cap.

## Architecture

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Inventory JSON, job descriptions, application records, company context, generated drafts |
| **Supabase Storage** | `original-resume-files`, `generated-documents` |
| **Supabase Auth** | Required for cloud sync, drafts, export |
| **Browser** | DOCX parsing, layout preview, enrichment review |
| **Next.js API routes** | AI enrichment/generation, Firecrawl research (server-only), PDF/DOCX export |
| **RLS** | `auth.uid() = user_id` on all user tables |

Parsing: generic section detection → profile-based extraction → unparsed fallbacks.

**Not active:** `localStorage` as primary persistence (only base-resume preference + legacy warning).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/setup` | Manage Uploads |
| `/inventory` | Career inventory + enrichment + edit bullets |
| `/generate` | Job intake + combined resume/cover letter generation |
| `/records` | Applications, saved jobs, draft history |
| `/profile` | Application Communication Profile |
| `/resume-preview/[draftId]` | **Application package** — resume, cover letter, research |
| `/resume-preview/[draftId]/edit` | Draft content review workspace |
| `/cover-letter-preview/[draftId]` | Cover letter editor + export |
| `/api/ai/enrich` | Server-side enrichment |
| `/api/ai/generate-resume` | Resume draft generation |
| `/api/ai/generate-cover-letter` | Cover letter generation |
| `/api/ai/generate-company-context` | Company context (JD or Firecrawl-backed) |
| `/api/ai/revise-cover-letter` | Quick cover letter revision |
| `/api/approve/resume-draft` | Approve + server PDF validation |
| `/api/validate/resume-pdf` | Server PDF page-count check |
| `/api/export/resume-pdf` | Approved resume → PDF |
| `/api/export/resume-docx` | Approved resume → DOCX |
| `/api/export/cover-letter-pdf` | Cover letter → PDF |
| `/api/export/cover-letter-docx` | Cover letter → DOCX |

## Local development

### 1. Clone and install

```bash
npm install
cp .env.example .env.local
```

### 2. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for sync) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for sync) | Public anon key |
| `AI_PROVIDER` | No | `mock` (default), `gemini`, or `openai` |
| `GEMINI_API_KEY` | When using Gemini | Server-side AI |
| `FIRECRAWL_API_KEY` | For website research | Server-side only; combined generate |
| `LOCAL_CHROME_PATH` / `CHROME_EXECUTABLE_PATH` | PDF export (local) | Chrome/Chromium path |
| `OPENAI_API_KEY` | Reserved | Not implemented |

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) and migrations under `supabase/migrations/`.
3. Enable Email auth; add redirect URLs (`http://localhost:3000/**`, production URL).
4. Copy URL + anon key to `.env.local`.

### 4. Run

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## AI providers

**Mock** is the default (local rule-based output). **Gemini** requires `AI_PROVIDER=gemini` + `GEMINI_API_KEY`. **Firecrawl** requires `FIRECRAWL_API_KEY` for website-backed company research. All keys stay server-side.

## Testing

`npm run test` runs 50 verification suites via `tests/run-all.ts` (parser, inventory, generation, export, cover letter, company research, application package). See [`docs/TESTING.md`](docs/TESTING.md) for suite layout and policy. Manual QA: [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md).

## Known limitations

See [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md). **Next:** v0.9.9 Application Quality Checker.

## Docs

[`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/HANDOFF.md`](docs/HANDOFF.md) · [`docs/PROJECT_FILE_MAP.md`](docs/PROJECT_FILE_MAP.md) · [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) · [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md) · [`docs/TESTING.md`](docs/TESTING.md) · [`docs/FIT_SCORE_RUBRIC.md`](docs/FIT_SCORE_RUBRIC.md)
