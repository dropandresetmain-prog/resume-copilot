# Known Issues

## Generate flow (v0.4.5)

- **Generate** (`/generate`) is where users paste and save jobs for tailoring.
- **Records** (`/records`) is for managing saved jobs and viewing draft history — not primary intake.
- Saved job `summary` is heuristic only (no AI). Run `supabase db push` for `20260620_add_saved_job_summary.sql` on existing projects.
- Landing page has one CTA; route depends on sign-in + inventory state.
- **4B** not started.

## Page split (v0.4.4)

- **Manage Uploads** (`/setup`) is the first-time entry point; **Generate** (`/generate`) is the main product page once inventory exists.
- **Dev Tools** (`/dev-tools`) is for maintenance (profile backfill, Gemini small-batch test) — not part of normal resume generation flow.
- **4B** (full draft review UI) is not started; Records shows a basic draft history list only.
- Landing CTA is **Customize your resume now** (not “Setup”).

## Profile backfill (v0.4.3)

- Legacy inventories parsed before v0.4.2 may lack `profile` on `ParsedResume`.
- Use **Backfill profile/contact from existing resumes** on **Dev Tools** (`/dev-tools`) — not automatic on load.
- Backfill only reads preserved unparsed/preamble text; it does not re-upload or re-parse DOCX files.
- If backfill cannot confidently extract contact info, it skips that resume.

## Enrichment review (v0.4.2)

- Default **Enrich new/changed items only** skips bullets with unchanged source text that were already enriched or reviewed (`enrichedBulletHashes`).
- **Re-run full enrichment (advanced)** requires confirmation.
- Changing bullet text creates a new enrichment key and re-opens the bullet for enrichment.

## Enrichment review (v0.4.1)

- Default **Enrich missing items only** skips bullets with any reviewed suggestion.
- **Re-run full enrichment** requires confirmation and may refresh pending suggestions.
- Duplicate/similar cards show existing vs AI wording side by side.
- **Manual merge/edit** for enrichment suggestions is not implemented yet — use Keep existing or Use AI suggestion.
- Accepted wording is stored on enrichment suggestions (`acceptedWording`); parsed resume bullets are never overwritten.

## Generated resume drafts (4A)

- Drafts are **derived artifacts** stored in `generated_resume_drafts`; source inventory is not modified.
- Generation uses inventory + approved keywords + saved job + reference resume.
- Draft review, regeneration, and export are not implemented yet.
- Run `supabase db push` so `supabase/migrations/20260619_add_resume_draft_metadata.sql` is applied on existing Supabase projects.

## Supabase persistence

- **Sign-in required** for save/sync when Supabase env vars are configured.
- **Manual setup**: run `supabase/schema.sql`, enable auth, add redirect URLs, set Vercel env vars.
- **RLS and storage policies** must be verified in the Supabase dashboard after deploy.
- **No migration** from pre-Supabase `localStorage` data — re-upload resumes and re-save JDs.
- **Deleting a parsed resume** does not yet delete the matching Storage blob.
- **`application_records`**, **`generated_resume_drafts`**, **`generated_cover_letter_drafts`**: tables exist; UI not built.
- **DOCX/PDF generation** and **`generated-documents` bucket usage**: not implemented.

## Collated inventory is derived

Collated inventory is rebuilt from parsed resumes on load and when resumes change. It is stored inside the inventory JSON in Supabase, not as a separate table.

## Atomic splitting heuristics

Additional experience and skills are split using delimiter heuristics. Complex lines may remain unsplit or split imperfectly.

## Parser architecture

1. **Section detection** — common header aliases; unknown headers preserved as unparsed
2. **Generic extraction** — structure content with confidence scoring
3. **Format profiles** — two-line column layout is the first registered profile
4. **Fallback** — low-confidence sections appear under **Unparsed / Needs Review**

## Education structure

Education is institution → programme(s) → date range → bullets. Achievements and grades are not classified during parsing.

## Work experience collation

Experiences merge on normalized company + role. Near-identical bullets are deduplicated within the same experience.

## Client-side parsing

DOCX parsing runs in the browser. Durable data lives in Supabase Postgres and Storage.

## Legacy browser storage

Pre-v0.3.0 builds used `localStorage` only. The app shows a one-time warning if old keys are detected (`src/lib/legacy/local-data.ts`). There is no automatic import.

## AI enrichment

- Suggestions live in `inventory.enrichment`, separate from parsed resumes.
- **Mock provider is test-only.** Real enrichment needs `AI_PROVIDER=gemini` + `GEMINI_API_KEY`.
- Enrichment uses stable `bulletKey` values because collated bullet IDs change when inventory is rebuilt.
- Legacy enrichment JSON without review-card fields is migrated on load.

## Mammoth limitations

Plain-text DOCX extraction may affect section and line structure.
