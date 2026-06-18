# Career Resume Copilot

**v0.3.0 — Supabase Foundation**

Upload DOCX resumes, build a collated inventory, save job descriptions, and review AI-assisted enrichment. **Supabase** is the source of truth for structured data and file storage.

Parsing uses a layered architecture: generic section detection → profile-based extraction → unparsed fallbacks when confidence is low.

## Current architecture

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Parsed resume inventory JSON, saved job descriptions, future application/draft metadata |
| **Supabase Storage** | Original uploaded resume files; future generated/exported documents |
| **Supabase Auth** | Required for cloud sync and storage (email/password or magic link) |
| **Browser** | DOCX parsing and enrichment review UI only — not durable storage |
| **RLS** | Users can access only their own rows (`auth.uid() = user_id`) |
| **Private buckets** | `original-resume-files`, `generated-documents` — not public |

**Not built yet:** application records UI, AI resume draft generation, cover letter generation, DOCX/PDF export.

**Not active:** `localStorage`, IndexedDB, and JSON export/import in the UI. Pre-Supabase browser data may trigger a one-time legacy warning only.

## What this project does

- Parses `.docx` resumes in the browser
- Stores parsed inventory and saved JDs in **Supabase Postgres** when signed in
- Stores original `.docx` files in **private Supabase Storage** when signed in
- **Collated Inventory** (default view): merged work experience, education, skills with source citations
- **AI enrichment** (review only): structured review cards via mock or Gemini providers
- **Source Resumes / Debug**: per-resume parsed output for inspection

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
| `GEMINI_API_KEY` | When using Gemini | Server-side enrichment |
| `OPENAI_API_KEY` | Reserved | Future OpenAI support |

### 3. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql).
   - Creates tables: `resume_inventories`, `job_descriptions`, `application_records`, `generated_resume_drafts`, `generated_cover_letter_drafts`, `stored_files`
   - Enables RLS on all user tables
   - Creates private buckets `original-resume-files` and `generated-documents`
   - Adds storage policies (users access only `{userId}/…` paths)
3. **Authentication → Providers**: enable Email (password and/or magic link).
4. **Authentication → URL Configuration**: add redirect URLs:
   - Local: `http://localhost:3000/**`
   - Production: `https://your-app.vercel.app/**`
5. Copy **Project URL** and **anon public** key into `.env.local`.

### 4. Vercel deployment

In the Vercel project **Settings → Environment Variables**, set the same variables as `.env.local` (at minimum `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus AI vars if using Gemini). Redeploy after changes.

Add your Vercel URL to Supabase **Authentication → Redirect URLs**.

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm run test     # unit tests (no live Supabase required)
npm run build
npm run lint
```

Routes: `/` (landing), `/setup` (main app).

## AI providers

The **mock provider** is test-only (rule-based local output). Real enrichment requires `AI_PROVIDER=gemini` plus `GEMINI_API_KEY` on the server. Enrichment runs through the app API route — not in the browser with exposed keys.

## Docs

`HANDOFF.md` · `PROJECT_FILE_MAP.md` · `KNOWN_ISSUES.md` · `TEST_CHECKLIST.md`
