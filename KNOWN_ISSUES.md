# Known Issues

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
