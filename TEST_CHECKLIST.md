# Test Checklist — v0.3.0 Supabase Foundation

## Supabase auth and sync

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Supabase redirect URLs include local and production app URLs
- [ ] Sign in with email/password works
- [ ] Magic link sign-in works (if enabled)
- [ ] Signed-in email displays; sign out works
- [ ] Signed-out state shows “Sign in to save and sync data across devices”
- [ ] Upload and JD save disabled when signed out (Supabase configured)
- [ ] Resume inventory loads from Supabase after sign-in
- [ ] Saved job descriptions load from Supabase after sign-in
- [ ] Pre-Supabase `localStorage` warning appears if old keys exist (optional)

## Upload and file storage

- [ ] DOCX parse works in browser
- [ ] Parsed inventory saves to Supabase after upload (signed in)
- [ ] Original file uploads to private `original-resume-files` bucket
- [ ] File upload failure shows warning but keeps parsed inventory
- [ ] Inventory save failure shows visible error
- [ ] Cloud file storage panel lists uploaded originals

## Job descriptions

- [ ] Save / edit / delete / clear JDs via Supabase
- [ ] Duplicate-save warning still works
- [ ] `rawText` remains source of truth

## UI readability

- [ ] `/` and `/setup` readable in light theme (including OS dark mode)
- [ ] Auth inputs: dark text on white background
- [ ] Buttons and cards have visible contrast

## AI enrichment

- [ ] `AI_PROVIDER=mock` works with no API key
- [ ] Provider banner shows mock vs Gemini vs OpenAI
- [ ] Review cards: issue, before, changes, rationale, actions
- [ ] Accept / reject / ignore controls work
- [ ] Small-batch test mode works separately from main enrichment
- [ ] Raw parsed resume data unchanged after enrichment

## Collated inventory (default tab)

- [ ] Work experiences merged by company + role
- [ ] Source filename chips on experiences and bullets
- [ ] Education structured; unparsed sections visible when needed

## Source resumes / debug tab

- [ ] Per-resume parsed sections available
- [ ] Raw fields expandable

## Inventory management

- [ ] Upload, delete, clear resume inventory work (signed in)
- [ ] Re-upload same filename replaces resume
- [ ] Refresh after sign-in restores cloud inventory
- [ ] No export/import buttons in primary UI

## Automated tests

- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

## Privacy

- [ ] No DOCX files in Git
- [ ] No service role key in frontend or committed env files
