# AUDIT_CLAUDE_POST.md — Post-Redesign Codebase Audit

> Generated: 2026-06-27. Audited against baseline in `AUDIT_CLAUDE.md` (pre-Folio redesign).
>
> **Purpose:** Pre-debugging-sprint snapshot. Maps what changed, what broke, what's stubbed, and what's dead.

---

## 1. Pages & Routes

| Route | Status vs Baseline | Page File | Client Component | Notes |
|-------|-------------------|-----------|-----------------|-------|
| `/` | Reworked | `src/app/page.tsx` | `LandingHero.tsx` | Redesigned with "Folio" branding; CTAs now link directly to `/auth/signup` and `/auth/login` — no longer uses `LandingCta.tsx` component |
| `/setup` | **Orphaned** | `src/app/(workspace)/setup/page.tsx` | `ManageUploadsPageClient.tsx` | Dropped from nav. Not in middleware `PROTECTED_PREFIXES` (accessible unauthenticated). `LandingCta.tsx` still links here for returning users. No longer the primary onboarding entry point. |
| `/inventory` | Reworked | `src/app/(workspace)/inventory/page.tsx` | `CareerVaultPageClient.tsx` (**new**) | Replaces `InventoryPageClient.tsx`. Entirely new UI: tabbed vault (Work/Skills/Education/Additional), vault health %, inline bullet edit, upload dialog, extraction panel. |
| `/generate` | Reworked | `src/app/(workspace)/generate/page.tsx` | `NewApplicationPageClient.tsx` (**new**) | Replaces `GeneratePageClient.tsx`. New 3-step card layout: job description → confirm role → vault match. Embeds `GenerateTailoredResumeSection` in `embeddedMode`. |
| `/records` | Reworked | `src/app/(workspace)/records/page.tsx` | `ApplicationsPageClient.tsx` (**new**) | Replaces `RecordsPageClient.tsx`. Now a filter-pill + table UI. Saved jobs panel and unlinked draft history panel removed. |
| `/profile` | Same | `src/app/(workspace)/profile/page.tsx` | `ProfilePageClient.tsx` | Still wired. Profile content largely unchanged. |
| `/resume-preview/[draftId]` | Same | `src/app/(workspace)/resume-preview/[draftId]/page.tsx` | `ResumePreviewPageClient.tsx` | Still wired. Page file now uses `params: Promise<{draftId}>` (Next.js 15 async pattern). |
| `/resume-preview/[draftId]/edit` | Same | `src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx` | `ResumeDraftEditPageClient.tsx` | Still wired. |
| `/cover-letter-preview/[draftId]` | Same | `src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx` | `CoverLetterPreviewPageClient.tsx` | Still wired. |
| `/dev-tools` | Hardened | `src/app/(workspace)/dev-tools/page.tsx` | `DevToolsPageClient.tsx` | Now calls `notFound()` in production. Previously had no access guard. |
| `/dashboard` | **NEW** | `src/app/(workspace)/dashboard/page.tsx` | `DashboardPageClient.tsx` | New default landing page for authed users. Shows application list + vault health %. |
| `/output/[draftId]` | **NEW** | `src/app/(workspace)/output/[draftId]/page.tsx` | `OutputEditorPageClient.tsx` | New combined resume+cover letter editor with experience toggles and regeneration. Distinct from the old separate preview pages. |
| `/settings` | **NEW stub** | `src/app/(workspace)/settings/page.tsx` | _(inline)_ | Inline h1 + p only. No functionality. |
| `/auth/login` | **NEW** | `src/app/auth/login/page.tsx` | _(self-contained)_ | Dedicated login page. Supports password, magic link, Google OAuth. |
| `/auth/signup` | **NEW** | `src/app/auth/signup/page.tsx` | _(self-contained)_ | Dedicated signup page. Supports email/password and Google OAuth. Redirects to `/onboarding` on success. |
| `/auth/forgot-password` | **NEW** | `src/app/auth/forgot-password/page.tsx` | _(self-contained)_ | Sends Supabase password reset email. |
| `/auth/reset-password` | **NEW** | `src/app/auth/reset-password/page.tsx` | _(self-contained)_ | Verifies session, renders password update form. Redirects to `/dashboard` on success. |
| `/auth/callback` | **NEW** | `src/app/auth/callback/route.ts` | _(route handler)_ | Handles Supabase OAuth code exchange and OTP token verification. Dispatches to `/auth/reset-password` for recovery type, else to `next` param (default `/dashboard`). |
| `/onboarding` | **NEW** | `src/app/onboarding/page.tsx` | _(self-contained)_ | 3-step flow: pick vault method → upload resume → profile (full name, target role, seniority). Writes to `profiles` table on finish. Redirects to `/dashboard`. |

**Navigation order (new):**  
Sidebar primary: `/dashboard` → `/inventory` (Career vault) → `/generate` → `/records` (Applications)  
Sidebar utility: `/profile`, `/settings`

**Navigation order (old):**  
`/setup` → `/generate` → `/inventory` → `/records` → `/profile`

---

## 2. Components

### Kept As-Is (still wired and functional)
- `ResumeDraftPreview.tsx`, `ResumeDraftSectionCard.tsx`, `ResumeDraftReviewPanel.tsx`
- `DownloadResumePdfButton.tsx`, `DownloadResumeDocxButton.tsx`
- `FinalResumeLayoutPreview.tsx`, `ResumePdfPreview.tsx`
- `CoverLetterPdfPreview.tsx`, `CoverLetterBodyViewSwitch.tsx`
- `DownloadCoverLetterPdfButton.tsx`, `DownloadCoverLetterDocxButton.tsx`
- `SecondaryCommunicationsPanel.tsx`
- `CompanyContextPreviewPanel.tsx`, `CompanyContextEditorPanel.tsx`, `CompanyResearchCompactStatus.tsx`
- `ApplicationPackageSummary.tsx`, `ApplicationPackageCoverLetterPanel.tsx`
- `ApplicationReviewCenter.tsx`, `PackageDecisionTree.tsx`, `PackageFitSummaryPanel.tsx`, `PackageTailoringDiagnosticsPanel.tsx`
- `EnrichmentReviewPanel.tsx`, `InventoryEditPanel.tsx`, `InventoryDuplicateCleanupPanel.tsx`
- `InventoryProjectCleanupPanel.tsx`, `InventoryTextExtractionPanel.tsx`
- `GenerateTailoredResumeSection.tsx` (now used in `embeddedMode`)
- `GenerationProgressPanel.tsx`, `JDInputPanel.tsx`, `CompanyWebsiteDiscoveryPanel.tsx`
- `ResumeDraftBulletCard.tsx`, `ResumeStagedCustomRevisionPanel.tsx`
- `ResumeEvidenceRegenerationPanel.tsx`, `CoverLetterEvidenceRegenerationPanel.tsx`
- `CoverLetterStagedRevisionPanel.tsx`
- `ResumeDraftReviewWorkspace.tsx`, `ResumeAssessmentPanel.tsx`, `ExportFitStatusPanel.tsx`
- `ModelTierSelect.tsx`, `ModelSelectionDebug.tsx`
- `UploadCard.tsx`, `CloudFileStoragePanel.tsx`, `SetupAlerts.tsx`
- `SummaryCards.tsx`, `DraftHistoryPanel.tsx`, `ApplicationRecordsPanel.tsx`, `SavedJobCard.tsx`
- `SourceResumesView.tsx`, `CollatedInventoryView.tsx`, `ParsedInventorySection.tsx`
- `ExperienceCard.tsx`, `EducationCard.tsx`, `InventoryResumeCard.tsx`, `UnparsedSectionCard.tsx`
- `ResumeList.tsx`, `ProfileContactBackfillPanel.tsx`
- `ResumeCoverLetterPanel.tsx`
- `AuthPanel.tsx` — kept; used on the now-orphaned `/setup` page
- `WorkspaceProvider.tsx` — kept; **no longer redirects unauthenticated users** (that's now handled by `middleware.ts`)

### Reworked / Significantly Changed
- `AppNav.tsx` — replaced old horizontal nav with a left sidebar (220px fixed). New icons, new links. **"Add a job" CTA button is non-functional (no `onClick`, no `href`)**. 
- `AppShell.tsx` — now wraps in sidebar + TopBar layout (previously simpler wrapper).
- `TopBar.tsx` — **NEW** component. Shows notification bell and avatar. Both are hardcoded/non-functional (avatar shows "U", no real user data, no sign-out).
- `LandingHero.tsx` — full redesign with "Folio" brand, marketing copy, feature grid, how-it-works section, pricing-style CTAs. Links to `/auth/signup` and `/auth/login`.
- `nav.ts` — completely replaced. New nav items (Dashboard, Career vault, Generate, Applications, Profile, Settings).

### Newly Added
- `CareerVaultPageClient.tsx` — new inventory surface at `/inventory`
- `DashboardPageClient.tsx` — new dashboard at `/dashboard`
- `NewApplicationPageClient.tsx` — new generate page at `/generate`
- `ApplicationsPageClient.tsx` — new applications tracker at `/records`
- `OutputEditorPageClient.tsx` — new combined editor at `/output/[draftId]`
- `dialog.tsx` (under `src/components/ui/`) — Radix Dialog wrapper used in `CareerVaultPageClient`

### Dropped from Active Pages (files remain, imports removed)
- `GeneratePageClient.tsx` — file exists, no page imports it (**orphaned**)
- `InventoryPageClient.tsx` — file exists, no page imports it (**orphaned**)
- `RecordsPageClient.tsx` — file exists, no page imports it (**orphaned**)
- `LandingCta.tsx` — file exists, **no longer imported anywhere** (**orphaned**)

---

## 3. Auth Flows

### Pre-Redesign (Baseline)
- Auth embedded in `/setup` page via `AuthPanel` component
- Magic link only (+ password in AuthPanel)
- Magic link redirect target: `${window.location.origin}/setup`
- No dedicated auth pages, no middleware enforcement
- Protection: WorkspaceProvider client-side redirect when `cloudEnabled && !isSignedIn`

### Post-Redesign

| Flow | Path | Status | Notes |
|------|------|--------|-------|
| Email/password sign-in | `/auth/login` → `signInWithPassword()` → `window.location.assign(nextPath)` | **Wired** | Full page navigation used (not `router.push`) to ensure middleware sees new auth cookies. |
| Magic link sign-in | `/auth/login` → `signInWithMagicLink(email, nextPath)` → `/auth/callback` → `nextPath` | **Wired** | Callback defaults to `/dashboard`. |
| Google OAuth sign-in | `/auth/login` or `/auth/signup` → `signInWithGoogle()` → `/auth/callback?next=/dashboard` | **Wired** | Depends on Supabase project having Google OAuth configured. No validation that it's set up. |
| Email/password sign-up | `/auth/signup` → `signUpWithPassword()` → `router.push('/onboarding')` | **⚠️ Potentially broken** | See note below. `/onboarding` is in middleware `PROTECTED_PREFIXES`. If Supabase requires email confirmation before creating a session, the user will have no session and middleware will redirect them to `/auth/login` — they never reach `/onboarding`. |
| Google OAuth sign-up | `/auth/signup` → `signInWithGoogle()` → `/auth/callback?next=/dashboard` | **Wired** | Skips `/onboarding`. New Google users go straight to `/dashboard`. No profile is created. |
| Forgot password | `/auth/forgot-password` → `requestPasswordReset(email)` → email → `/auth/callback?next=/auth/reset-password` (via `token_hash` + `type=recovery`) | **Wired** | Callback correctly routes `type === "recovery"` to `/auth/reset-password`. |
| Password reset | `/auth/reset-password` → checks `supabase.auth.getUser()` → `updatePassword()` → `/dashboard` | **Wired** | Session check using `getUser()` is correct (not `getSession()` which can return stale data). |
| Auth callback (email OTP) | `/auth/callback?token_hash=...&type=...` → `verifyOtp()` | **Wired** | Handles magic link and recovery flows. |
| Auth callback (OAuth code) | `/auth/callback?code=...` → `exchangeCodeForSession()` | **Wired** | Handles Google OAuth. |
| Sign-out | No button in sidebar/TopBar | **⚠️ Missing from UI** | `signOut()` function exists in `auth.ts`. `AuthPanel` on the orphaned `/setup` page has a sign-out button. The new sidebar/TopBar has no sign-out mechanism visible to users. |
| Route protection | `src/middleware.ts` | **Wired (new)** | Server-side Supabase session check. Protected prefixes: `/dashboard`, `/onboarding`, `/records`, `/inventory`, `/generate`, `/output`, `/settings`, `/profile`, `/resume-preview`, `/cover-letter-preview`. **`/setup` is NOT protected.** |
| Auth redirect (signed-in → login) | Middleware redirects to `/dashboard` | **Wired** | Signed-in users hitting auth pages are redirected to `/dashboard` (exceptions: `/auth/callback`, `/auth/reset-password`). |

**Critical auth note — signup + onboarding race:**  
If the Supabase project has email confirmation enabled, `signUpWithPassword()` does not create a session. The user gets a confirmation email. Meanwhile, `router.push('/onboarding')` tries to navigate to a protected route. The middleware sees no session → redirects to `/auth/login?next=/onboarding`. The user is left on the login page, not onboarding. There is no confirmation-pending state or message.

**Old AuthPanel still active on /setup:**  
`ManageUploadsPageClient.tsx` still renders `AuthPanel.tsx`. This gives users an alternate (legacy) path to authenticate inside the workspace. `AuthPanel` does NOT include Google OAuth. Magic link from `AuthPanel` defaults to `/dashboard` (correct behavior) because the updated `signInWithMagicLink` default redirect parameter changed from `/setup` to `/dashboard`.

---

## 4. API & Integrations

All pre-existing API routes are present and unchanged in structure:

| Route | Status |
|-------|--------|
| `POST /api/ai/generate-resume` | Connected — wired to `generateResumeDraftWithAI()` |
| `POST /api/ai/generate-cover-letter` | Connected — wired to `generateCoverLetterWithAI()` |
| `POST /api/ai/enrich` | Connected — wired to `enrichInventoryWithAI()` |
| `POST /api/ai/generate-company-context` | Connected — wired to `generateCompanyContextWithAI()` |
| `POST /api/ai/revise-cover-letter` | Connected — wired to `reviseCoverLetterWithAI()` |
| `POST /api/ai/revise-resume-scope` | Connected — wired to `reviseResumeScopeWithAI()` / `reviseResumeBatchWithAI()` |
| `POST /api/ai/rewrite-resume-role` | Connected — wired to `rewriteResumeRoleWithAI()` |
| `POST /api/ai/extract-inventory-from-text` | Connected — wired to `extractInventoryTextWithAI()` |
| `POST /api/export/resume-pdf` | Connected — Puppeteer/Chrome |
| `POST /api/export/resume-docx` | Connected |
| `POST /api/export/cover-letter-pdf` | Connected — Puppeteer/Chrome |
| `POST /api/export/cover-letter-docx` | Connected |
| `POST /api/approve/resume-draft` | Connected |
| `POST /api/validate/resume-pdf` | Connected |
| `GET /api/company/discover-website` | Connected — Firecrawl (conditional) |
| `GET /auth/callback` | **NEW** — Supabase email/OAuth exchange |

**Provider status:** Unchanged from baseline.  
- `AI_PROVIDER=gemini` → Gemini (functional)  
- `AI_PROVIDER=mock` → Mock (default, functional)  
- `AI_PROVIDER=openai` → **Still throws "not implemented"** for all features

**New Supabase client calls (in new components):**  
- `listApplicationRecordsFromCloud()` — called by `DashboardPageClient` and `ApplicationsPageClient`
- `archiveApplicationRecordInCloud()` — called by `ApplicationsPageClient`
- `listGeneratedResumeDraftsFromCloud()` — called by `ApplicationsPageClient`
- `fetchResumeApplicationCountsFromCloud()` — called by `CareerVaultPageClient`
- `getApplicationRecordFromCloud()` — called by `OutputEditorPageClient`
- `updateApplicationRecordInCloud()` — called by `OutputEditorPageClient` (mark as sent)
- `findCoverLetterDraftByResumeDraftId()` — called by `OutputEditorPageClient`
- `updateGeneratedResumeDraftInCloud()` — called by `OutputEditorPageClient`
- `updateGeneratedCoverLetterDraftInCloud()` — called by `OutputEditorPageClient`
- `supabase.from("profiles").upsert(...)` — called directly in `OnboardingPage` (not via a lib abstraction)

---

## 5. Data & Schema

### No Breaking Changes to Existing Types
The core domain types (`ResumeDraftContent`, `CoverLetterGenerationInput`, `CollatedInventory`, `StoredApplicationRecord`, `StoredJobDescription`, `CompanyContext`, etc.) appear unchanged.

### New Schema Dependency — `profiles` Table
`OnboardingPage` (`src/app/onboarding/page.tsx`) writes to a `profiles` table via:
```ts
supabase.from("profiles").upsert({
  id: user.id,
  full_name: ...,
  target_role: ...,
  seniority: ...,
  vault_method: ...,
  onboarded: true,
  updated_at: ...,
})
```
This table is **not documented in the baseline**. If it doesn't exist in the Supabase schema (or lacks these columns), the onboarding `handleFinish` step will silently fail or throw. No migration is visible in the repo.

### `ApplicationRecordStatus` — No `interview` Status
`ApplicationsPageClient.tsx` renders an "Interview" filter tab (`FilterTab = "interview"`), but the `APPLICATION_RECORD_STATUSES` type (`src/types/application-record.ts`) does **not include `"interview"`**. The filter function hardcodes `return []` for this case — the tab always shows zero results. This is a UI stub without a backing data type.

### `appliedAt` field
`StoredApplicationRecord.appliedAt` exists in the type and is populated in the `ApplicationsPageClient` table. The `OutputEditorPageClient` sets `status: "applied"` via `updateApplicationRecordInCloud` when "Mark as sent" is clicked. It does not explicitly set `appliedAt`. Depends on the Supabase trigger or function setting this on the server side — unclear from the code.

### Shape Changes: `BulletEnrichmentSuggestion`
The `CareerVaultPageClient` references `s.issueTitle` from enrichment suggestions:
```ts
arr.push({ id: s.id, issueTitle: s.issueTitle });
```
The baseline type `BulletEnrichmentSuggestion` does not list `issueTitle` as a field. If this field doesn't exist on the type, this is either a new field added to the type (not visible in the current type file read) or a potential runtime shape mismatch. **Needs verification.**

---

## 6. Dead Code & Orphans

| File | Status | Reason |
|------|--------|--------|
| `src/components/pages/GeneratePageClient.tsx` | **Orphaned** | No longer imported by any page. `/generate` now uses `NewApplicationPageClient`. |
| `src/components/pages/InventoryPageClient.tsx` | **Orphaned** | No longer imported by any page. `/inventory` now uses `CareerVaultPageClient`. |
| `src/components/pages/RecordsPageClient.tsx` | **Orphaned** | No longer imported by any page. `/records` now uses `ApplicationsPageClient`. |
| `src/components/landing/LandingCta.tsx` | **Orphaned** | Not imported anywhere. New `LandingHero` uses inline Link buttons. |
| `src/lib/navigation/landing-cta.ts` | **Orphaned** | Only imported by `LandingCta.tsx`, which is itself orphaned. |
| `src/components/setup/AuthPanel.tsx` | **Near-orphan** | Used only by `ManageUploadsPageClient`, which is the orphaned `/setup` page. |
| `src/app/(workspace)/setup/page.tsx` | **Orphaned route** | Not in sidebar nav. Not in middleware protected list. Still accessible. `LandingCta.tsx` links here but `LandingCta.tsx` is itself orphaned. |
| `AppNav.tsx` "Add a job" button | **Dead button** | `type="button"` with no `onClick` and no `Link` wrapper at lines 80–89. |
| `TopBar.tsx` avatar/notification | **Stub UI** | Hardcoded "U" avatar, notification bell, no handlers, no user data. |

---

## 7. TODOs, FIXMEs, and Stubs

| Location | Line | Description |
|----------|------|-------------|
| `src/lib/resume-draft/layout.ts` | 392 | `TODO(fit-rubric-v1)`: Replace heuristic scoring with deterministic `jdScore + profileFit`. Unchanged from baseline. |
| `src/app/(workspace)/settings/page.tsx` | — | Entire page is a stub — two lines of JSX, no settings logic. |
| `src/components/pages/ApplicationsPageClient.tsx` | 47 | `"interview"` filter tab hardcoded to `return []` — no `interview` status exists in the type. |
| `src/app/onboarding/page.tsx` | 46–78 | Step 2 file upload UI collects a file but never processes or uploads it. `handleFinish` only writes to `profiles`. |
| `src/components/app/AppNav.tsx` | 80–89 | "Add a job" CTA button has no `onClick` or `href`. |
| `src/components/app/TopBar.tsx` | entire | Notification bell and user avatar are decorative-only. No real user data, no sign-out. |
| `src/lib/ai/openai.ts` | — | All AI features throw `"not implemented"`. Unchanged from baseline. |
| `src/lib/ai/model-tiers.ts` | — | `enhanced` tier: `gemini-3-flash-preview`, `premium` tier: `gemini-3.5-flash` — likely not stable model IDs. Unchanged from baseline. |

---

## 8. Environment & Config

No new environment variables were introduced in the redesign. The `.env.example` is unchanged from the baseline.

| Variable | Required | Status |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for auth/cloud) | Standard — must be set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for auth/cloud) | Standard — must be set |
| `AI_PROVIDER` | No | Defaults to `"mock"` |
| `GEMINI_API_KEY` | When `AI_PROVIDER=gemini` | Server-side only |
| `GEMINI_MODEL_PRIMARY` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_MODEL_FALLBACK` | No | Defaults to `gemini-2.5-flash-lite` |
| `FIRECRAWL_API_KEY` | No | Enables company website scraping |
| `OPENAI_API_KEY` | Not yet | OpenAI provider not implemented |
| `LOCAL_CHROME_PATH` / `CHROME_EXECUTABLE_PATH` | No | For Puppeteer PDF generation |

**New config concern — Google OAuth:**  
`signInWithGoogle()` is now surfaced in production UI on both the login and signup pages. It will fail silently or throw at the Supabase level if the Google OAuth provider has not been configured in the Supabase project dashboard. There is no detection or graceful degradation in the UI (no check equivalent to `isSupabaseConfigured()`).

**New config concern — `profiles` table:**  
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must exist AND the `profiles` table must be present in the schema for onboarding to complete. There is no migration file visible in the repo.

**`/setup` unprotected:**  
`/setup` is not in the middleware `PROTECTED_PREFIXES` list (`src/middleware.ts` line 4). An unauthenticated user can navigate there directly. This is technically safe (the page handles unauthenticated state via `WorkspaceProvider`), but inconsistent with the intent of requiring auth before accessing workspace features.

---

## TRIAGE

### 🔴 BLOCKING — App broken or unusable without fixing

| # | Description | File(s) | Confidence |
|---|-------------|---------|------------|
| B1 | **Sign-out is inaccessible.** No sign-out button exists in the sidebar, TopBar, or any new page. The only sign-out UI is in `AuthPanel.tsx` on the orphaned `/setup` page. Authenticated users cannot log out from the new UI. | `src/components/app/TopBar.tsx`, `src/components/app/AppNav.tsx` | High |
| B2 | **Signup → Onboarding flow likely broken with email confirmation enabled.** After `signUpWithPassword()`, code does `router.push('/onboarding')`. But `/onboarding` is protected; if Supabase requires email confirmation before granting a session, middleware redirects the new user to `/auth/login` — they never reach onboarding. | `src/app/auth/signup/page.tsx:31–32`, `src/middleware.ts:4` | High |
| B3 | **`profiles` table may not exist.** Onboarding writes to `supabase.from("profiles")` but no schema migration is documented or visible. If the table is absent, `handleFinish` throws and the user is stuck on the onboarding screen. | `src/app/onboarding/page.tsx:64–71` | Medium |

---

### 🟡 DEGRADED — Feature existed before, now works worse or partially

| # | Description | File(s) | Confidence |
|---|-------------|---------|------------|
| D1 | **`/records` lost Saved Jobs panel and Draft History panel.** Old `RecordsPageClient` showed `ApplicationRecordsPanel`, `JDInputPanel`, and `DraftHistoryPanel`. New `ApplicationsPageClient` shows only the application table. | `src/components/pages/ApplicationsPageClient.tsx` vs old `RecordsPageClient.tsx` | High |
| D2 | **`/inventory` lost enrichment review, edit overlays, and source resumes view.** `CareerVaultPageClient` is a simpler vault viewer. `EnrichmentReviewPanel`, `InventoryDuplicateCleanupPanel`, `InventoryProjectCleanupPanel`, source resume tab — none are accessible from the new page. | `src/components/pages/CareerVaultPageClient.tsx` vs old `InventoryPageClient.tsx` | High |
| D3 | **Onboarding file upload collects but does not process the resume.** Step 2 of onboarding shows a drag-drop upload zone. The file is stored in state but never sent to the parser or Supabase. Users who choose "upload" expect their resume to be loaded — it won't be. | `src/app/onboarding/page.tsx:46–78` | High |
| D4 | **Google OAuth sign-in has no graceful degradation.** No UI check equivalent to `isSupabaseConfigured()` for whether Google OAuth is actually enabled. Clicking "Continue with Google" will fail with a Supabase-level error if not configured in the project. | `src/app/auth/login/page.tsx:101–106`, `src/app/auth/signup/page.tsx:40–45` | Medium |
| D5 | **AppNav "Add a job" CTA button is dead.** The primary conversion action in the sidebar has no `onClick` handler and no `Link` wrapper — clicking it does nothing. | `src/components/app/AppNav.tsx:80–89` | High |
| D6 | **`LandingCta.tsx` is orphaned and the landing page no longer routes to `/dashboard` for returning signed-in users.** The new `LandingHero` has static links to `/auth/signup` and `/auth/login`. A signed-in returning user who lands on `/` sees "Sign in" and "Get started" rather than being redirected. | `src/components/landing/LandingHero.tsx` | Medium |

---

### 🟢 STUBBED — New feature, never fully implemented

| # | Description | File(s) | Confidence |
|---|-------------|---------|------------|
| S1 | **`/settings` page is an empty stub.** Shows a heading and subheading. No account settings, preferences, or profile management. | `src/app/(workspace)/settings/page.tsx` | High |
| S2 | **"Interview" filter tab in Applications always shows empty.** The `ApplicationsPageClient` renders a filter pill for "Interview" but the `filterApplications` function hardcodes `return []` for it. There is no `interview` status in the data model. | `src/components/pages/ApplicationsPageClient.tsx:47`, `src/types/application-record.ts` | High |
| S3 | **TopBar notification bell and user avatar are decorative.** No click handlers, no real user data, no notifications system. | `src/components/app/TopBar.tsx` | High |
| S4 | **"Add bullet point" button in `CareerVaultPageClient`.** Renders a ghost button in the expanded experience card but has no `onClick` handler. | `src/components/pages/CareerVaultPageClient.tsx:460–465` | High |
| S5 | **LinkedIn import option in onboarding.** Step 1 of onboarding offers "Import from LinkedIn" as a vault method. Selecting it skips to Step 3 (profile) and sets `vault_method: "linkedin"` but there is no LinkedIn integration, import flow, or API connection. | `src/app/onboarding/page.tsx:41–43` | High |
| S6 | **`/output/[draftId]` is new and unreferenced from main nav or generation flow.** The new output editor at `/output/[draftId]` is a parallel experience to the existing `/resume-preview/[draftId]` pages. It's unclear which flow drives users here vs the old preview pages. | `src/app/(workspace)/output/[draftId]/page.tsx` | Medium |

---

### ⚪ DROPPED — Appears intentionally removed

| # | Description | File(s) | Confidence |
|---|-------------|---------|------------|
| DR1 | **`/setup` removed from primary navigation.** Sidebar no longer links to `/setup`. The old setup/upload page is accessible by direct URL only. The intent appears to be replacing the setup flow with `/onboarding`. | `src/components/app/nav.ts` | High |
| DR2 | **`LandingCta.tsx` smart CTA removed from landing page.** The old hero CTA that dynamically resolved to `/setup` or `/generate` based on auth state is gone. Replaced by static `/auth/signup` and `/auth/login` links. | `src/components/landing/LandingHero.tsx` | High |
| DR3 | **Inline workspace auth (AuthPanel) no longer the primary auth path.** The embedded `AuthPanel` in the workspace is superseded by the dedicated `/auth/*` pages. However, it still exists and is rendered on `/setup`. | `src/components/setup/AuthPanel.tsx` | High |

---

### ❓ UNKNOWN — Cannot determine intent from code alone

| # | Description | File(s) | Confidence |
|---|-------------|---------|------------|
| U1 | **`BulletEnrichmentSuggestion.issueTitle` field.** `CareerVaultPageClient` accesses `s.issueTitle` on enrichment suggestions. This field is not in the baseline type definition. Either the type was updated (and this is fine) or it's a runtime bug where the property is `undefined`. | `src/components/pages/CareerVaultPageClient.tsx:236`, `src/types/enrichment.ts` | Medium |
| U2 | **`/output/[draftId]` vs `/resume-preview/[draftId]` — which is canonical?** Both routes exist and both provide resume preview + cover letter editing. The old routes (`/resume-preview` and `/cover-letter-preview`) are still present and wired. It's unclear whether the new `/output` route is a full replacement or a parallel experiment. | `src/app/(workspace)/output/[draftId]/page.tsx` | Low |
| U3 | **Generation flow redirect target after generation.** The `GenerateTailoredResumeSection` (used in `NewApplicationPageClient`) has generation completion logic. It's unclear whether it redirects to the old `/resume-preview/[draftId]` or the new `/output/[draftId]`. | `src/components/setup/GenerateTailoredResumeSection.tsx` | Medium |
| U4 | **`appliedAt` population.** `OutputEditorPageClient` calls `updateApplicationRecordInCloud(draft.applicationId, { status: "applied" })` but does not pass `appliedAt`. The Supabase layer may set this server-side. If not, `appliedAt` will be null even after marking as sent. | `src/components/pages/OutputEditorPageClient.tsx:881–882`, `src/lib/supabase/application-records.ts` | Medium |
| U5 | **Onboarding `onboarded` flag enforcement.** After onboarding, `onboarded: true` is set in the `profiles` table. Nothing in the middleware or `WorkspaceProvider` reads this flag to gate or re-route already-onboarded users. Unclear if this is by design or incomplete. | `src/app/onboarding/page.tsx:68`, `src/middleware.ts` | Low |

---

*End of AUDIT_CLAUDE_POST.md*
