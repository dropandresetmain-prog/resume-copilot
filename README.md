# Career Resume Copilot

**v0.7.6 — Generation Input Quality Foundation**

Tailor one-page resumes from your career inventory and job descriptions, preview layout, **pass server one-page PDF validation on Approve**, and download **PDF** (primary final deliverable) or **DOCX** (editable secondary output). Supabase is the source of truth for inventory, drafts, and exported files.

## Product flow

```
Upload resumes → Build inventory → Paste JD → Select base resume → Generate Tailored Resume
  → Tune layout → PDF Preview → Approve → Download PDF / DOCX
```

1. **Manage Uploads** (`/setup`) — upload `.docx` resumes; parsing runs in the browser.
2. **Career Inventory** (`/inventory`) — collated experience, education, skills; optional AI enrichment review.
3. **Generate** (`/generate`) — paste a job description, select base resume, **Generate Tailored Resume** (job saves automatically).
4. **Resume Preview** (`/resume-preview/[draftId]`) — **PDF Preview** (local approximation), layout controls, **server one-page validation on Approve**, export.
5. **Records** (`/records`) — saved jobs and generated draft history with export shortcuts.

## What is built

| Area | Status |
|------|--------|
| DOCX resume parsing (browser) | ✅ |
| Supabase inventory + JD sync | ✅ |
| Original resume file storage | ✅ |
| AI enrichment review (mock / Gemini) | ✅ |
| Resume draft generation (mock / API) | ✅ |
| One-page layout preview + optimizer | ✅ |
| **PDF export** (canonical print HTML → Puppeteer) | ✅ **Primary deliverable** — **one-page server validation (v0.7.0+)** |
| **PDF Preview** | ✅ Local approximation; server page count is export truth |
| **DOCX export** (from shared document model) | ✅ **Secondary / editable** |
| Cover letter generation | ❌ Planned (v0.7.0) |
| Manual inventory editing | ❌ Deferred |

## Export strategy

| Format | Role | Notes |
|--------|------|--------|
| **PDF** | Primary final deliverable | Puppeteer + one-page gate. Desktop/mobile: blob download with filename. |
| **DOCX** | Secondary editable output | Word may reflow; mobile may open instead of download. |

Both formats use the same canonical `ResumeDocumentModel` and approved layout settings (`content.exportLayoutSettings` saved on approve).

Resumes do **not** include a Professional Summary section (reserved for future cover letters).

## Architecture

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Resume inventory JSON, job descriptions, generated resume drafts, `stored_files` metadata |
| **Supabase Storage** | `original-resume-files` (uploads), `generated-documents` (exported PDF/DOCX) |
| **Supabase Auth** | Required for cloud sync, drafts, and export (email/password or magic link) |
| **Browser** | DOCX parsing, layout preview UI, enrichment review |
| **Next.js API routes** | AI enrichment, resume generation, PDF/DOCX export |
| **RLS** | Users access only their own rows (`auth.uid() = user_id`) |

Parsing uses a layered architecture: generic section detection → profile-based extraction → unparsed fallbacks when confidence is low.

**Not active:** `localStorage` / JSON export-import as primary persistence. Pre-Supabase browser data may trigger a one-time legacy warning only.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/setup` | Manage Uploads (auth, upload, parsing) |
| `/inventory` | Career inventory + enrichment |
| `/generate` | Job intake + resume generation |
| `/records` | Saved jobs + draft history |
| `/resume-preview/[draftId]` | Layout preview, PDF Preview, approve, export |
| `/resume-preview/[draftId]/edit` | Draft review / edit workspace |
| `/api/ai/enrich` | Server-side enrichment |
| `/api/ai/generate-resume` | Server-side draft generation |
| `/api/export/resume-pdf` | Approved draft → PDF |
| `/api/export/resume-docx` | Approved draft → DOCX |

## Local development

### 1. Clone and install

```bash
npm install
cp .env.example .env.local
```

### 2. Environment variables

Edit `.env.local`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for sync) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for sync) | Public anon key — **never** use the service role key in the frontend |
| `AI_PROVIDER` | No | `mock` (default), `gemini`, or `openai` |
| `GEMINI_API_KEY` | When using Gemini | Server-side enrichment / generation |
| `OPENAI_API_KEY` | Reserved | Future OpenAI support |
| `LOCAL_CHROME_PATH` | PDF export (local) | Path to Chrome/Chromium if not auto-detected |
| `CHROME_EXECUTABLE_PATH` | PDF export (local) | Alias for Chrome path |

### 3. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql).
   - Tables: `resume_inventories`, `job_descriptions`, `application_records`, `generated_resume_drafts`, `generated_cover_letter_drafts`, `stored_files`
   - RLS on all user tables
   - Private buckets: `original-resume-files`, `generated-documents`
3. **Authentication → Providers**: enable Email (password and/or magic link).
4. **Authentication → URL Configuration**: add redirect URLs:
   - Local: `http://localhost:3000/**`
   - Production: `https://your-app.vercel.app/**`
5. Copy **Project URL** and **anon public** key into `.env.local`.

### 4. PDF export (local)

PDF generation requires a Chromium-based browser locally. Install Google Chrome, or set `LOCAL_CHROME_PATH` to your Chrome/Chromium executable. On Vercel, `@sparticuz/chromium` is used automatically (`maxDuration: 60`, Node.js runtime).

### 5. Vercel deployment

Set the same variables as `.env.local` in **Settings → Environment Variables** (at minimum `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus AI vars if using Gemini). Redeploy after changes.

Add your Vercel URL to Supabase **Authentication → Redirect URLs**.

### 6. Run

```bash
npm run dev      # http://localhost:3000
npm run test     # verification scripts (no live Supabase required)
npm run build
npm run lint
```

## AI providers

The **mock provider** is the default (rule-based local output for enrichment and draft generation). Real AI requires `AI_PROVIDER=gemini` plus `GEMINI_API_KEY` on the server. AI calls run through Next.js API routes — keys are not exposed in the browser.

## Testing

`npm run test` runs parser, inventory, collation, resume draft, layout, export, and safety verification scripts. See `TEST_CHECKLIST.md` for manual export smoke tests (PDF Preview → download parity).

## Known limitations

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md). Highlights:

- PDF Preview iframe is the source of truth for final layout; browser layout preview is for slider tuning only.
- DOCX may overshoot one page in MS Word even when preview fits.
- Gill Sans MT renders in PDF/DOCX only if installed on the export machine.
- Fit score in preview is a heuristic — not the full rubric in `docs/FIT_SCORE_RUBRIC.md`.

## Roadmap

| Milestone | Status |
|-----------|--------|
| v0.6.x — Resume export (DOCX + PDF) | Complete |
| **v0.6.5 — Preview truth & mobile export** | **Current** |
| v0.7.0 — One-page enforcement foundation | Next |
| Cover letter generation | After one-page foundation |
| Manual inventory editing | Deferred |

## Docs

[`ROADMAP.md`](ROADMAP.md) · [`HANDOFF.md`](HANDOFF.md) · [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md) · [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) · [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) · [`docs/FIT_SCORE_RUBRIC.md`](docs/FIT_SCORE_RUBRIC.md)
