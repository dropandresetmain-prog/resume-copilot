# Folio UI Redesign

Product name: **Folio** — a resume tailoring tool. The repo folder remains `resume-copilot`; package name is unchanged until a dedicated release bump.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16, TypeScript, React 19 |
| Styling | Tailwind CSS v4, Folio design tokens in `src/app/globals.css` |
| Backend | Supabase (Postgres, Auth, Storage) |
| AI | Gemini (mock provider for local dev) |
| Hosting | Vercel |

Branch workflow: **`folio-redesign`** — merge to `main` at the end of each phase.

## How we work

- **Planning / prompts:** Claude (chat)
- **Implementation:** Claude Code CLI — one prompt per task, single-shot read → analyse → implement
- **Session hygiene:** Do not clear the terminal between tasks; Claude Code session context is valuable
- **Documentation:** Intentionally deferred during Phases 1–4; catch-up pass documented here and in linked docs

## Phase overview

### Phase 0 — Audit (read-only)

Map existing routes, AI calls, and data models before touching UI. Output: [`AUDIT_CLAUDE.md`](../AUDIT_CLAUDE.md) (pre-redesign snapshot). Use [`FOLIO_REDESIGN.md`](FOLIO_REDESIGN.md) + [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md) for current state.

### Phase 1 — Foundation & design system ✅

- Folio CSS tokens (colours, spacing, typography, radius) in `src/app/globals.css`
- Hardcoded hex swept to token references across components
- Base UI primitives aligned to tokens (`src/components/ui/dialog.tsx`, shell components)

**Principle:** No hardcoded hex in components — all colour via Folio tokens. See [`FOLIO_DESIGN_TOKENS.md`](FOLIO_DESIGN_TOKENS.md).

### Phase 2 — Core UI rebuild ✅

- App shell: forest-green sidebar (`folio-sidebar`), top bar, sidebar nav
- Page shells rebuilt: Dashboard, Applications, Career Vault, Generate, Output Editor
- Landing, Auth (`/auth/login`, `/auth/signup`), Onboarding, Profile, Settings
- FAB and primary CTA patterns established

### Phase 3 — Feature wiring ✅

- `InventoryTextExtractionPanel` + `UploadCard` wired into Career Vault
- Panel/upload state connected to Supabase via `WorkspaceProvider`
- Reference pattern in legacy `InventoryPageClient.tsx` (superseded by `CareerVaultPageClient.tsx` at `/inventory`)

### Phase 4 — Polish & correctness (mostly ✅)

| Task | Status | Notes |
|------|--------|-------|
| 1 — Wire Add experience + FABs in Career Vault | ✅ | `CareerVaultPageClient` → extraction panel + import dialog |
| 2 — Fix "Used in N applications" count | ✅ | `fetchResumeApplicationCountsFromCloud()` — see [`CAREER_VAULT.md`](CAREER_VAULT.md) |
| 3 — Balanced tone in cover letter tab | ✅ | `OutputEditorPageClient.tsx` |
| 4 — Hex → Folio tokens sweep | ✅ | Late straggler fixed in `SourceResumesView.tsx` |
| 5 — Gemini model tier IDs | ✅ | Non-issue / already resolved |
| 6 — Cover letter only mode | **Deferred** | Touches generation logic; scope carefully |
| 7 — Enable cover letter only in Generate | ✅ | Non-issue / already resolved |
| 8 — Redirect `/resume-preview` → `/output` | **Partial** | `/output/[draftId]` exists; generate flow still navigates to `/resume-preview` |
| 9 — Gate `/dev-tools` in production | ✅ | `notFound()` when `NODE_ENV === "production"` |
| 10 — E2E flow test | **Pending** | Full journey: upload → vault → generate → output |

## Navigation & routes (current)

Sidebar order (`src/components/app/nav.ts`):

| Nav label | Path | Page client |
|-----------|------|-------------|
| Dashboard | `/dashboard` | `DashboardPageClient` |
| Career vault | `/inventory` | `CareerVaultPageClient` |
| Generate | `/generate` | `NewApplicationPageClient` |
| Applications | `/records` | `ApplicationsPageClient` |
| Profile | `/profile` | `ProfilePageClient` |
| Settings | `/settings` | Settings shell (stub) |

These five route → client mounts are **contract-locked** (see [Route contract & forbidden remount](#route-contract--forbidden-remount-non-negotiable) below).

Public / auth:

| Path | Purpose |
|------|---------|
| `/` | Landing (`LandingHero`) |
| `/auth/login`, `/auth/signup` | Supabase auth |
| `/onboarding` | First-run upload + profile setup |

Output & legacy package routes:

| Path | Purpose |
|------|---------|
| `/output/[draftId]` | **New** unified Output Editor (`OutputEditorPageClient`) — resume + cover letter tabs. **Canonical Generate destination** (Generate now routes here, not `/resume-preview`). |
| `/resume-preview/[draftId]` | **Retired (M7)** — returns `notFound()`. Was a grandfathered secondary route; structured editing absorbed into `/output` in M5a. |
| `/resume-preview/[draftId]/edit` | **Retired (M7)** — returns `notFound()`. |
| `/cover-letter-preview/[draftId]` | **Retired (M7)** — returns `notFound()`. Was a grandfathered secondary route; CL editing absorbed into `/output` CL tab in M5c. |
| `/setup` | Legacy uploads route (still exists; onboarding preferred for new users) |
| `/dev-tools` | Dev utilities — **404 in production** |

Protected routes enforced in `src/middleware.ts` (redirect to `/auth/login` when unauthenticated).

## Route contract & forbidden remount (non-negotiable)

Folio is the visual/product baseline. The pre-Folio rollback was caused by a single
one-line import swap that remounted a legacy page client at an active route
(`d71d353` swapped `/inventory`'s `CareerVaultPageClient` → `InventoryPageClient`;
`bc2fb9f` swapped `/records`'s `ApplicationsPageClient` → `RecordsPageClient`). To
prevent recurrence (Folio Recovery M1):

**Rule 1 — Active route → client mounts are locked.** Each active workspace route must
mount exactly its Folio client:

| Route | Required client |
|-------|-----------------|
| `/dashboard` | `DashboardPageClient` |
| `/inventory` | `CareerVaultPageClient` |
| `/generate` | `NewApplicationPageClient` |
| `/records` | `ApplicationsPageClient` |
| `/output/[draftId]` | `OutputEditorPageClient` |

**Rule 2 — Forbidden remount.** No active workspace `page.tsx` may import any of these
five legacy clients:

- `InventoryPageClient`
- `RecordsPageClient`
- `GeneratePageClient`
- `ResumePreviewPageClient`
- `CoverLetterPreviewPageClient`

Legacy clients are **behavioral references only**. Restore capability by decomposing
their behavior into the Folio client — never by mounting the legacy page wholesale. The
legacy `/resume-preview` and `/cover-letter-preview` routes were grandfathered secondary
routes through M5a/M5c and were retired in M7 — their `page.tsx` files now return
`notFound()` and no longer import the forbidden clients.

**Enforcement.** `tests/suites/app-shell.test.ts` source-greps each active `page.tsx`
and fails CI if a route is remounted or imports a forbidden client. If a plan proposes
swapping a route or importing a legacy client, stop and re-scope.

## Grove palette (reference)

| Role | Token | Hex |
|------|-------|-----|
| Sidebar | `folio-sidebar` | `#085041` |
| Primary / accent | `folio-primary-container` | `#2A7A5E` |
| CTA | `folio-cta` | `#B85C38` |
| Surfaces | `folio-surface*`, `folio-sage-border`, `folio-mint-surface` | Sage greens — see token doc |

## Key files (Phase 4)

| File | Role |
|------|------|
| `src/app/globals.css` | Design token source of truth |
| `src/components/pages/CareerVaultPageClient.tsx` | Career Vault UI, FAB wiring, app counts |
| `src/components/setup/InventoryTextExtractionPanel.tsx` | Paste career text → extract → apply overlay |
| `src/components/setup/UploadCard.tsx` | DOCX upload (dialog on vault page) |
| `src/components/ui/dialog.tsx` | Radix-based modal shell (Folio tokens) |
| `src/components/pages/OutputEditorPageClient.tsx` | Unified output editor |
| `src/lib/supabase/generated-resume-drafts.ts` | Draft CRUD + application count query |

## What to watch

1. **Token discipline** — new components must use Folio CSS tokens only
2. **Dialog pattern** — new modals follow `src/components/ui/dialog.tsx`
3. **App count linkage** — `reference_resume_id` → `sourceCitations[].resumeId` → count map (see Career Vault doc)
4. **Route migration** — prefer `/output/[draftId]` for new links; update Generate + Applications when redirect task is picked up
5. **AI engines unchanged** — redesign remounted existing generation/export logic; behaviour docs in [`HANDOFF.md`](HANDOFF.md) v0.9.x notes still apply

## Related docs

| Doc | Contents |
|-----|----------|
| [`FOLIO_DESIGN_TOKENS.md`](FOLIO_DESIGN_TOKENS.md) | Token naming, palette, usage rules |
| [`CAREER_VAULT.md`](CAREER_VAULT.md) | Vault data flow, app counts, panel/modal patterns |
| [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md) | Full route and module map |
| [`HANDOFF.md`](HANDOFF.md) | AI/generation milestone history + run instructions |
| [`AUDIT_CLAUDE.md`](../AUDIT_CLAUDE.md) | Phase 0 pre-redesign inventory (historical) |

## Next steps

1. **Task 10** — E2E flow test (Playwright recommended): upload → vault → generate → output; pay special attention to app count linkage
2. **Task 6** — Cover letter only mode (generation + UI flag decision)
3. **Route migration** — wire Generate/Applications to `/output/[draftId]`; add redirect from `/resume-preview/[draftId]`
4. **Settings page** — flesh out account/preferences shell
