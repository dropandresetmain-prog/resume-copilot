# Career Resume Copilot

Milestone 3C: upload DOCX resumes, build a collated inventory, save job descriptions, and review AI-assisted enrichment — with **Supabase** as the source of truth for structured data and file storage.

Parsing uses a layered architecture: generic section detection → profile-based extraction → unparsed fallbacks when confidence is low.

## What this project does

- Parses `.docx` resumes in the browser and stores original files in **private Supabase Storage** when signed in
- **Collated Inventory** (default view): merged work experience, structured education, additional experience items, and skills with source citations
- **AI enrichment** (review only): structured review cards (issue, before, suggested after, changes, rationale, risks) via interchangeable providers
- **Source Resumes / Debug**: per-resume parsed output for parser inspection
- Persists parsed inventory, enrichment review state, and saved job descriptions in **Supabase Postgres** (requires sign-in)

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (tables, RLS, storage buckets, policies).
3. Enable Email auth (password and/or magic link) in the Supabase dashboard.
4. Copy project URL and **anon** key to `.env.local` — never put the service role key in the frontend.

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase and AI keys
npm run dev
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser client) |

Private storage buckets: `original-resume-files`, `generated-documents`. Object paths: `{userId}/{fileId}/{fileName}`.

Schema-ready but **not implemented yet**: application records, generated resume/cover letter drafts, DOCX/PDF export.

## AI providers

Configure via environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `mock` (default), `gemini`, or `openai` |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` |
| `OPENAI_API_KEY` | Reserved for future OpenAI support |

The **mock provider** is test-only: it generates local rule-based suggestions to validate the review workflow. It is **not** real AI analysis. **Cursor does not perform enrichment** — enrichment runs through the configured `AI_PROVIDER` on the app server.

## Views

| View | Purpose |
|------|---------|
| Collated Inventory | Main working view — reusable items merged across resumes |
| AI Enrichment Review | Review cards with accept / reject / ignore; provider banner shows mock vs Gemini vs OpenAI |
| Source Resumes / Debug | Per-resume parser output with raw expandable fields |

## Data handling

- **Supabase Postgres** is the source of truth for parsed inventory JSON and saved job descriptions (per authenticated user, RLS enforced)
- **Supabase Storage** holds original uploaded resume files and will hold generated documents in future milestones
- Collated inventory is **derived** on load (not stored separately)
- `localStorage` / IndexedDB are **no longer** primary storage; older browsers may show a one-time legacy warning
- JSON export/import helpers remain for tests and optional legacy backup — not the primary UI workflow

## Scripts

```bash
npm run dev
npm run test
npm run build
npm run lint
```

`test:supabase` covers pure helpers only. Live Supabase integration requires a configured project.

## Docs

`PROJECT_FILE_MAP.md` · `KNOWN_ISSUES.md` · `TEST_CHECKLIST.md` · `HANDOFF.md`
