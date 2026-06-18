# Test Checklist — v0.4.5 Generate Page Flow + Saved Job UX

## Generate page

- [ ] `/generate` shows **Add a job to tailor your resume** intake form
- [ ] Paste JD, edit company/role, **Save job** works when signed in
- [ ] Newly saved job is auto-selected in **Tailor resume from saved job**
- [ ] **Generate resume** button works (mock or Gemini)
- [ ] Section is not labeled “Generate Resume Draft” or “JD Intake”

## Records page

- [ ] `/records` shows **Manage saved jobs** (no primary paste form)
- [ ] Edit/delete saved jobs still works
- [ ] Draft history list still loads when signed in
- [ ] Copy directs users to Generate for new jobs

## Saved job cards

- [ ] Collapsed: Company — Role, dates, summary/snippet
- [ ] **View full job description** expands full pasted text with line breaks
- [ ] **Show less** collapses again
- [ ] Same behavior on Generate and Records lists

## Landing

- [ ] Single CTA: **Customize your resume now**
- [ ] Signed out → `/setup`
- [ ] Signed in + inventory → `/generate`
- [ ] Signed in, no inventory → `/setup`

## Migration

- [ ] `supabase db push` applies `20260620_add_saved_job_summary.sql`
- [ ] Saving a job stores `summary` in Supabase

## 4B

- [ ] Not started

---

# Test Checklist — v0.4.4 Page Split + Navigation

## Navigation

- [ ] Nav order: Generate → Inventory → Records → Manage Uploads → Dev Tools
- [ ] `/setup` label in nav is **Manage Uploads** (not Setup)
- [ ] Active route styling highlights current page
- [ ] Nav scrolls horizontally on narrow/mobile widths

## Landing

- [ ] Single CTA: **Customize your resume now** (auth-aware route)
- [ ] Supporting copy mentions upload once, career inventory, tailored resumes from JDs

## Manage Uploads (`/setup`)

- [ ] Auth, upload, resume list, warnings, cloud files, summary cards only
- [ ] No enrichment panel, saved jobs, draft generation, backfill, or test-batch button
- [ ] Banner links to Generate/Inventory when signed in with inventory

## Generate (`/generate`)

- [ ] Resume draft panel works (JD + reference resume + generate)
- [ ] Placeholder card for cover letter / export (not implemented)
- [ ] Banner points to Manage Uploads when no inventory

## Inventory (`/inventory`)

- [ ] Enrichment review, collated/source tabs, keywords
- [ ] No **Test Gemini on small batch** button

## Records (`/records`)

- [ ] Saved Jobs panel (`Company — Role` labels)
- [ ] Draft history list when signed in (basic list only)

## Dev Tools (`/dev-tools`)

- [ ] Profile/contact backfill panel
- [ ] Test Gemini small batch controls

## 4B

- [ ] Not started — no full draft review UI

---

# Test Checklist — v0.4.3 Profile Contact Backfill

## Manual backfill

- [ ] Sign in with legacy inventory (parsed before v0.4.2, missing `profile`)
- [ ] Confirm experiences / enrichment / keyword bank unchanged before backfill
- [ ] On **Dev Tools**, click **Backfill profile/contact from existing resumes**
- [ ] Summary shows profiles added and filenames updated
- [ ] Inventory saves to Supabase when changed
- [ ] Re-run backfill — skipped (already had profile)
- [ ] Experiences and enrichment still unchanged

---

# Test Checklist — v0.4.2 Profile + Saved Jobs + Enrichment Stability

## Profile / contact parsing

- [ ] Upload resume with name header + email/phone before `WORK EXPERIENCE`
- [ ] Parsed profile includes `fullName`, `email`, `phone`
- [ ] Name line is not an unknown unparsed section
- [ ] No preamble warning when profile is confidently detected

## Saved Jobs UX

- [ ] UI says **Saved Jobs** (not “Saved JD”)
- [ ] List items display as `Company — Role`
- [ ] Paste JD with blank company/role — heuristics may pre-fill empty fields only
- [ ] Manually entered company/role are not overwritten on paste edits

## Enrichment stability

- [ ] Default: **Enrich new/changed items only**
- [ ] Re-run on unchanged reviewed bullets does not duplicate suggestions
- [ ] **Re-run full enrichment (advanced)** shows confirmation

---

# Test Checklist — v0.4.1 Auth + Enrichment Hardening

## Auth (mobile)

- [ ] Open `/setup` (Manage Uploads) at mobile width
- [ ] Password / Magic link / Sign up tabs are visible without cycling hidden buttons
- [ ] Magic link tab shows email-only form and **Send magic link** button
- [ ] Success message: **Check your email for the sign-in link**
- [ ] Sign in with magic link on a passwordless account

## Enrichment duplicate review

- [ ] Duplicate/similar suggestions show existing vs AI wording side by side
- [ ] **Keep existing** does not change keyword bank or parsed resumes
- [ ] **Use AI suggestion** stores derived wording on suggestion only
- [ ] Reject / Ignore update suggestion status without mutating inventory

## Enrichment rerun

- [ ] Default button is **Enrich new/changed items only**
- [ ] **Re-run full enrichment** shows confirmation dialog
- [ ] Re-running does not duplicate approved keywords or reviewed suggestions
- [ ] Review counts display (approved, pending, ignored, rejected)

## Resume draft generation (4A)

- [ ] Run `supabase db push` so `20260619_add_resume_draft_metadata.sql` is applied
- [ ] Sign in with inventory and saved job
- [ ] Select JD and reference resume on **Generate** page
- [ ] Approved keyword count displays
- [ ] Generate Resume Draft works with `AI_PROVIDER=mock`
- [ ] Draft row appears in `generated_resume_drafts`
- [ ] Source `resume_inventories` data unchanged after generation
- [ ] UI shows draft ID and section summary
- [ ] Malformed Gemini JSON shows error + raw response (if testing Gemini)

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

- [ ] `/`, workspace routes, and nav readable in light theme (including OS dark mode)
- [ ] Auth inputs: dark text on white background
- [ ] Buttons and cards have visible contrast

## AI enrichment

- [ ] `AI_PROVIDER=mock` works with no API key
- [ ] Provider banner shows mock vs Gemini vs OpenAI
- [ ] Review cards: issue, before, changes, rationale, actions
- [ ] Accept / reject / ignore controls work
- [ ] Small-batch test mode on **Dev Tools** works separately from main enrichment
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
