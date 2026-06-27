# Folio

**v0.9.19B** — Resume tailoring with AI-generated drafts, cover letters, and one-page PDF export.

Folio helps you tailor one-page resumes from a career vault and job descriptions, preview layout, pass server one-page PDF validation on approve, and download PDF (primary) or DOCX (secondary). Combined generation can produce resume + cover letter with optional company website research.

Supabase is the source of truth for inventory, applications, drafts, and exported files.

> **UI redesign:** The app shell, navigation, and primary pages were rebuilt on the `folio-redesign` branch using the Folio Grove design system. See [`docs/FOLIO_REDESIGN.md`](docs/FOLIO_REDESIGN.md) for phase status, routes, and remaining work. Repo folder name remains `resume-copilot`.

## Product flow

```
Landing / Onboarding → Upload resume → Career vault → Paste JD → Generate → Output editor
  → Review / approve → Download PDF / DOCX
```

1. **Onboarding** (`/onboarding`) or **Career vault** (`/inventory`) — upload `.docx` resumes; parsing runs in the browser.
2. **Career vault** — collated experience, education, skills; add experience from pasted text; import additional resumes.
3. **Generate** (`/generate`) — paste JD; combined flow can research company website via **Firecrawl** when configured; generates resume and cover letter.
4. **Output editor** (`/output/[draftId]`) — unified resume + cover letter review (new shell).
5. **Application package** (`/resume-preview/[draftId]`) — legacy full package (fit summary, evidence diagnostics, approve/export) — still used by Generate navigation until route migration.
6. **Applications** (`/records`) — application status, notes, linked drafts.
7. **Profile** (`/profile`) — Application Communication Profile for cover letter tone.
8. **Settings** (`/settings`) — account preferences (shell).

## What is built

| Area | Status |
|------|--------|
| Folio design system (Grove tokens) | ✅ Redesign |
| App shell (sidebar, dashboard, vault, generate, output) | ✅ Redesign |
| Landing, auth, onboarding | ✅ Redesign |
| DOCX resume parsing (browser) | ✅ |
| Supabase inventory + JD sync | ✅ |
| AI enrichment review (mock / Gemini) | ✅ |
| Resume draft generation (mock / Gemini) | ✅ |
| Cover letter generation + revision | ✅ |
| Evidence spine + tailoring diagnostics | ✅ v0.9.17–19 |
| One-page layout preview + PDF export | ✅ |
| Company research (Firecrawl + Gemini) | ✅ |

## Architecture

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Inventory JSON, job descriptions, application records, company context, generated drafts |
| **Supabase Storage** | `original-resume-files`, `generated-documents` |
| **Supabase Auth** | Required for cloud sync, drafts, export |
| **Browser** | DOCX parsing, layout preview |
| **Next.js API routes** | AI enrichment/generation, Firecrawl research (server-only), PDF/DOCX export |
| **RLS** | `auth.uid() = user_id` on all user tables |

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/auth/login`, `/auth/signup` | Sign in / sign up |
| `/onboarding` | First-run setup |
| `/dashboard` | Dashboard |
| `/inventory` | **Career vault** |
| `/generate` | Job intake + generation |
| `/records` | **Applications** |
| `/profile` | Communication profile |
| `/settings` | Settings |
| `/output/[draftId]` | **Output editor** (resume + cover letter tabs) |
| `/resume-preview/[draftId]` | Legacy application package |
| `/cover-letter-preview/[draftId]` | Cover letter editor |
| `/setup` | Legacy uploads route |
| `/dev-tools` | Dev utilities (local only) |

API routes unchanged — see [`docs/PROJECT_FILE_MAP.md`](docs/PROJECT_FILE_MAP.md).

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
| `FIRECRAWL_API_KEY` | For website research | Server-side only |
| `LOCAL_CHROME_PATH` / `CHROME_EXECUTABLE_PATH` | PDF export (local) | Chrome/Chromium path |

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

## Testing

`npm run test` runs verification suites via `tests/run-all.ts`. See [`docs/TESTING.md`](docs/TESTING.md). Manual QA: [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md).

## Docs

| Doc | Contents |
|-----|----------|
| [`docs/FOLIO_REDESIGN.md`](docs/FOLIO_REDESIGN.md) | Redesign phases, routes, remaining tasks |
| [`docs/FOLIO_DESIGN_TOKENS.md`](docs/FOLIO_DESIGN_TOKENS.md) | Grove colour tokens and usage rules |
| [`docs/CAREER_VAULT.md`](docs/CAREER_VAULT.md) | Vault data flow, app counts, panel patterns |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Milestone history + run instructions |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Planned work |
| [`docs/PROJECT_FILE_MAP.md`](docs/PROJECT_FILE_MAP.md) | Route and module map |

## Known limitations

See [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).
