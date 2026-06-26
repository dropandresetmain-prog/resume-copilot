# AUDIT_CLAUDE.md — Resume Copilot UI/UX Redesign Audit

> Generated: 2026-06-27. Read-only audit for redesign planning. Do not use as a changelog.

---

## 1. Pages & Routes

| Route | Page File | Client Component | Purpose |
|-------|-----------|-----------------|---------|
| `/` | `src/app/page.tsx` | `src/components/landing/LandingHero.tsx` | Public landing page with hero section and CTA |
| `/setup` | `src/app/(workspace)/setup/page.tsx` | `src/components/pages/ManageUploadsPageClient.tsx` | Upload `.docx` resume files, manage source inventory |
| `/inventory` | `src/app/(workspace)/inventory/page.tsx` | `src/components/pages/InventoryPageClient.tsx` | Review collated career inventory (experiences, education, skills), optional AI enrichment, edit bullets overlay |
| `/generate` | `src/app/(workspace)/generate/page.tsx` | `src/components/pages/GeneratePageClient.tsx` | Paste job description, optionally provide company website, select model tier, trigger resume + cover letter generation |
| `/records` | `src/app/(workspace)/records/page.tsx` | `src/components/pages/RecordsPageClient.tsx` | Application status tracker, saved jobs, unlinked draft history |
| `/profile` | `src/app/(workspace)/profile/page.tsx` | `src/components/pages/ProfilePageClient.tsx` | Application Communication Profile — cover letter tone/voice configuration |
| `/resume-preview/[draftId]` | `src/app/(workspace)/resume-preview/[draftId]/page.tsx` | `src/components/pages/ResumePreviewPageClient.tsx` | Application package: resume preview, cover letter, company research, approve/export controls |
| `/resume-preview/[draftId]/edit` | `src/app/(workspace)/resume-preview/[draftId]/edit/page.tsx` | `src/components/pages/ResumeDraftEditPageClient.tsx` | Draft content editor: edit bullets, regenerate sections |
| `/cover-letter-preview/[draftId]` | `src/app/(workspace)/cover-letter-preview/[draftId]/page.tsx` | `src/components/pages/CoverLetterPreviewPageClient.tsx` | Cover letter full editor, quick revision actions, PDF/DOCX export |
| `/dev-tools` | `src/app/(workspace)/dev-tools/page.tsx` | `src/components/pages/DevToolsPageClient.tsx` | Development/debugging utilities (internal use only) |

**Navigation order** (from `src/components/app/nav.ts`): `/setup` → `/generate` → `/inventory` → `/records` → `/profile`

---

## 2. AI Calls & Engines

### Provider Architecture

- **File:** `src/lib/ai/provider.ts`
- **Selected via:** `process.env.AI_PROVIDER` — `"mock"` | `"gemini"` | `"openai"`
- **Default:** `"mock"`
- **OpenAI:** Declared but throws `"not implemented"` for every feature

### Gemini Call Layer

- **File:** `src/lib/ai/call-gemini.ts` → `callGeminiWithRetry()`
- **Primary model:** `gemini-2.5-flash` (env: `GEMINI_MODEL_PRIMARY`)
- **Fallback model:** `gemini-2.5-flash-lite` (env: `GEMINI_MODEL_FALLBACK`)
- **Retry:** 3 attempts, exponential backoff (1s → 2s → 4s + jitter)
- **Model tiers** (`src/lib/ai/model-tiers.ts`): `standard` → gemini-2.5-flash, `enhanced` → gemini-3-flash-preview, `premium` → gemini-3.5-flash

### AI Feature Inventory

| Feature | Provider File | API Route | Input | Output |
|---------|--------------|-----------|-------|--------|
| Resume Draft Generation | `src/lib/ai/resume-draft-provider.ts` → `generateResumeDraftWithAI()` | `POST /api/ai/generate-resume` | `ResumeDraftGenerationInput` (JD, base resume, experiences, forced/excluded bullets, model tier) | `ResumeDraftContent` + `ResumeDraftRationale` |
| Cover Letter Generation | `src/lib/ai/cover-letter-provider.ts` → `generateCoverLetterWithAI()` | `POST /api/ai/generate-cover-letter` | `CoverLetterGenerationInput` (JD, resume draft ID, evidence spine, candidate name, communication profile, company context, country) | `CoverLetterGenerationResult` (body + rationale) |
| Inventory Enrichment | `src/lib/ai/provider.ts` → `enrichInventoryWithAI()` | `POST /api/ai/enrich` | `EnrichmentInventoryInput` (bullets; mode: `"full"` or `"small_batch_test"`) | `EnrichmentResult` (suggestions, keywords, duplicates) |
| Company Context Generation | `src/lib/ai/company-context-provider.ts` → `generateCompanyContextWithAI()` | `POST /api/ai/generate-company-context` | `CompanyContextGenerationRequest` (JD, company name, optional website/Firecrawl data) | `CompanyContext` |
| Cover Letter Revision | `src/lib/ai/revise-cover-letter-provider.ts` → `reviseCoverLetterWithAI()` | `POST /api/ai/revise-cover-letter` | `CoverLetterRevisionPromptInput` (current body, action enum, custom instructions) | Revised body + warnings + word count |
| Resume Scope Revision | `src/lib/ai/revise-resume-scope-provider.ts` → `reviseResumeScopeWithAI()` | `POST /api/ai/revise-resume-scope` | `ResumeCustomRevisionAIInput` (summary or role scope, JD context) | Updated content + validation issues |
| Resume Batch Revision | `src/lib/ai/revise-resume-scope-provider.ts` → `reviseResumeBatchWithAI()` | `POST /api/ai/revise-resume-scope` (batch mode) | `ResumeBatchRevisionInput` (queue of roles/summary to revise) | `ResumeBatchRevisionCandidates` (updated bullets per role) |
| Resume Role Rewrite | `src/lib/ai/resume-role-rewrite-provider.ts` → `rewriteResumeRoleWithAI()` | `POST /api/ai/rewrite-resume-role` | `ResumeRoleRewriteRequest` (roles, forced/excluded bullets, JD) | Per-role bullets + notes |
| Inventory Text Extraction | `src/lib/ai/inventory-text-extraction-provider.ts` → `extractInventoryTextWithAI()` | `POST /api/ai/extract-inventory-from-text` | `InventoryTextExtractionRequest` (pasted career text) | `InventoryTextExtractionResult` (categorized suggestions) |

---

## 3. Data Models / Schema

### Resume

**`ResumeDraftContent`** (`src/types/resume-draft.ts`)
- Header, professional summary, skills, experience sections, education, additional experience
- `riskFlags[]`, `exportLayoutSettings`, `serverPdfValidation` (page count from Puppeteer)

**`ResumeDraftExperienceBullet`**
- `text`, `sourceRefs[]`, `jdAlignmentReason`, `confidence` (`high` | `medium` | `low`), `riskFlags[]`

**`ResumeDraftRationale`**
- Overall narrative, tone notes, omissions, keyword usage, selection audit, structure repair notes, forced bullet audit

**`ResumeDraftSelectionAudit`**
- JD themes, strongest matches, honest gaps, positioning angle, role selection rationale

### Cover Letter

**`CoverLetterGenerationInput`** (`src/types/cover-letter-draft.ts`)
- JD, resume draft ID, resume evidence spine, candidate name, communication profile, company context, company name, country

**`CoverLetterRationale`**
- Selected themes, company context used, selected company facts, role requirements, risk flags, word count
- Secondary format variants: email, LinkedIn, recruiter DM, WhatsApp

**`CoverLetterRevisionAction`** (enum)
- `shorten`, `warmer`, `more_conversational`, `more_direct`, `more_formal`, `remove_ai_phrases`, `emphasize_company_fit`, `emphasize_role_fit`, `emphasize_technical_ai`, `emphasize_founder_business`, `custom`

### Inventory

**`CollatedInventory`** (`src/types/collated.ts`)
- `experiences: CollatedExperience[]`, `educationItems[]`, `additionalExperienceItems[]`, `skillItems[]`

**`CollatedExperience`**
- `id`, `company`, `role`, `descriptor`, `location`, `dateRange`, `experienceDuration`, `bullets: CollatedBullet[]`

**`CollatedBullet`**
- `id`, `keyword`, `description`, `rawTexts[]`, `sourceCitations`, `inventoryBulletKey`

**`InventoryEdits`** (`src/types/inventory-edits.ts`) — non-destructive overlay
- `hiddenBulletKeys`, `editedBulletTextByBulletKey`, `dismissedDuplicateGroupIds`, `alternateWordingBulletKeys`, `addedBulletsByExperienceKey`, `addedSkillItems`, `addedAdditionalExperienceItems`, `addedExperiences`, `projectCleanupTracking`

**`BulletEnrichmentSuggestion`** (`src/types/enrichment.ts`)
- `id`, `bulletKey`, `issueType` (`keyword_suggestion` | `capability_suggestion` | `alternative_wording` | `possible_duplicate` | `risk_warning`)
- `status` (`pending` | `accepted` | `rejected` | `ignored`)
- `beforeText`, `suggestedAfterText`, `suggestedKeywords`, `suggestedCapabilities`, `suggestedRoleTypes`, `sourceCitations`

**`DuplicateGroupSuggestion`**
- `id`, `bulletKeys[]`, `reason`, `status` (`pending` | `keep_all` | `group_variants` | `rejected` | `ignored`)

**`EnrichmentState`**
- `suggestions[]`, `duplicateGroups[]`, `keywordBank` (items with `approved`/`seenCount`), enriched bullet hashes, last enriched timestamp, provider info

**`InventoryTextExtractionSuggestion`** (`src/types/inventory-text-extraction.ts`)
- `id`, `kind` (`new_work_experience` | `bullet_existing_experience` | `skill` | `education` | etc.)
- `category`, `text`, `company`, `role`, `matchLabel`
- `applyability` (`applyable` | `needs_manual_placement` | `preview_only`), `duplicateOfBulletKey`

### Job & Application

**`StoredJobDescription`** (`src/types/jd.ts`)
- `id`, `rawText` (source of truth), `companyName`, `roleTitle`, `jobUrl`, `summary` (heuristic preview), `createdAt`, `updatedAt`

**`StoredApplicationRecord`** (`src/types/application-record.ts`)
- `id`, `jobDescriptionId`, `companyName`, `roleTitle`, `jobUrl`
- `status`: `drafting` | `resume_generated` | `ready_to_apply` | `applied` | `rejected` | `archived`
- `notes`, `createdAt`, `updatedAt`, `appliedAt`
- `companyContext`, `companyContextUpdatedAt`

### Company Context

**`CompanyContext`** (`src/types/company-context.ts`)
- `companyName`, `displayName`, `country`, `website`
- `sourceType`: `website_research` | `jd_based_context` | `manual`
- `companySummary`, `industry`, `businessModel`, `productsAndServices[]`, `customers[]`, `mission`, `vision`, `coreValues[]`
- `likelyHiringPriorities[]`, `whyThisRoleMayMatter`
- `suggestedNarrativeAngles[]` — each with: `angle`, `relevance`, `supportingStories`, `avoidOveremphasizing`
- `confidence`: `low` | `medium` | `high`
- `limitations[]`, `generatedAt`

**`CompanyResearchSource`**
- `type`: `firecrawl` | `jd` | `manual` | `fallback`
- `url`, `title`, `retrievedAt`, `success`, `error`

---

## 4. User Flow

```
Landing (/)
  └─ CTA → Auth (Supabase email/magic link)
       └─ Redirect to /setup

/setup — Upload & Parse
  ├─ Upload .docx resume files
  ├─ Browser-side DOCX parsing (section detection, experience/education extraction)
  ├─ Store parsed resumes in Supabase inventory
  └─ ─→ /inventory (after first upload)

/inventory — Career Inventory
  ├─ View collated: experiences / education / skills / additional experience
  ├─ Optional: AI enrichment (bullet improvements, keywords, duplicates)
  ├─ Non-destructive edit overlay (hide/edit bullets without touching source)
  ├─ Paste career text → AI extracts suggestions
  └─ ─→ /generate (primary CTA)

/generate — Job Intake & Generation
  ├─ Paste job description (or select saved JD)
  ├─ Optional: enter company website (Firecrawl-backed scraping if configured)
  ├─ Select base resume reference
  ├─ Select model tier (standard / enhanced / premium)
  ├─ Click Generate → parallel calls:
  │     ├─ Resume Draft (Gemini)
  │     ├─ Cover Letter (Gemini)
  │     └─ Company Context (Gemini + optional Firecrawl)
  └─ ─→ /resume-preview/[draftId]

/resume-preview/[draftId] — Application Package
  ├─ Resume preview (one-page layout with optimizer)
  ├─ Inline cover letter (collapsible)
  ├─ Company research panel (narrative angles, context)
  ├─ Evidence re-roll (regenerate specific section bullets)
  ├─ Approve for Export → Puppeteer server PDF validation (one-page check)
  └─ Export PDF / DOCX
      ├─ ─→ /resume-preview/[draftId]/edit (manual bullet editing)
      └─ ─→ /cover-letter-preview/[draftId]

/resume-preview/[draftId]/edit — Draft Editor
  ├─ Edit individual bullets
  └─ Regenerate sections

/cover-letter-preview/[draftId] — Cover Letter Editor
  ├─ Full body edit
  ├─ Quick revision actions (shorten, tone adjust, emphasis, etc.)
  ├─ Word count display (420-word cap)
  └─ Export PDF / DOCX

/records — Applications & History
  ├─ Application records (status, notes, linked resume/cover letter)
  ├─ Saved jobs
  └─ Unlinked draft history

/profile — Communication Profile
  └─ Configure tone/voice for reuse across all cover letters
```

### Auth Details

- **Provider:** Supabase Auth (`src/lib/supabase/auth.ts`)
- **Methods:** `signInWithPassword()`, `signUpWithPassword()`, `signInWithMagicLink()`
- **Magic link redirect:** `${window.location.origin}/setup`
- **Protection:** `(workspace)` layout route group; `useWorkspace()` hook redirects when `cloudEnabled && !isSignedIn`
- **Global state:** `WorkspaceProvider` (`src/components/app/WorkspaceProvider.tsx`) manages auth state, inventory, JD list, cloud-sync flag

### Data Persistence

| Layer | Used For |
|-------|----------|
| Supabase Postgres | Inventory, JD, drafts, records, profiles, company context |
| Supabase Auth | User identity, sessions |
| Supabase Storage | Original `.docx` files, exported PDF/DOCX |
| Browser localStorage | Base-resume preference, legacy warning flag |
| RLS | `auth.uid() = user_id` on all user-scoped tables |

---

## 5. Stubs, Incomplete Features & Risks

### OpenAI Provider — Not Implemented

- **Files:** `src/lib/ai/openai.ts` (throws on every call), `src/lib/ai/feature-provider-helpers.ts::assertOpenAiFeatureNotImplemented()`
- **Affected:** All 8 AI features + company research
- **Risk:** Setting `AI_PROVIDER=openai` silently breaks the entire app

### Resume Layout Fit-Rubric — TODO

- **File:** `src/lib/resume-draft/layout.ts` line ~392
- **TODO:** Replace heuristic scoring with deterministic `jdScore + profileFit` from `fit-rubric-v1`
- **Risk:** Layout optimizer may mis-prioritize sections

### Cover Letter Only Mode — Disabled

- **File:** `src/components/setup/GenerateTailoredResumeSection.tsx` line ~876
- **Status:** Option `"cover_letter_only"` exists in the UI but is disabled

### Company Website Discovery — Conditionally Disabled

- **File:** `src/app/api/company/discover-website/route.ts` lines 27–34
- **Disabled when:** JD-only context policy active, `confidentialPosting=true`, or `forceJdOnly=true`
- **Effect:** Falls back to JD-only company context (lower confidence)

### Dev Tools Page — Unclear Purpose

- **File:** `src/app/(workspace)/dev-tools/page.tsx` + `src/components/pages/DevToolsPageClient.tsx`
- **Status:** Exists as a workspace route; content and access controls not audited

### Legacy localStorage

- **File:** `src/lib/legacy/local-data.ts`
- **Status:** Detected but not actively used for core data; only persists base-resume preference and legacy warning state
- **Risk:** May confuse users who expect cross-device sync if local data is stale

### Model Tiers Reference Unreleased Models

- **File:** `src/lib/ai/model-tiers.ts`
- **`enhanced` tier:** `gemini-3-flash-preview` — may not be a stable/production model ID
- **`premium` tier:** `gemini-3.5-flash` — may not be a stable/production model ID
- **Risk:** Users selecting enhanced/premium may hit 404 → fallback to `gemini-2.5-flash-lite`

---

## Key Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Public anon key (client-side safe)
AI_PROVIDER=mock                        # "mock" | "gemini" | "openai" (openai not implemented)
GEMINI_API_KEY=                         # Server-side only
GEMINI_MODEL_PRIMARY=gemini-2.5-flash  # Optional override
GEMINI_MODEL_FALLBACK=gemini-2.5-flash-lite
FIRECRAWL_API_KEY=                      # Server-side; enables company website scraping
OPENAI_API_KEY=                         # Not yet functional
```

---

## Summary Stats

| Category | Count |
|----------|-------|
| Pages / routes | 10 (9 workspace + 1 landing) |
| API routes (AI) | 8 |
| AI features | 9 (generation, revision, enrichment, extraction) |
| Domain type files | 10+ |
| Supported AI providers | 2 active (Gemini, Mock) + 1 stub (OpenAI) |
| Incomplete / stub features | 6 flagged |
| Supabase tables (estimated) | 10+ |
