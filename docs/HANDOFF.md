# Current handoff

**Product:** Folio, a resume-tailoring application.  
**Checkout:** `main`.  
**Code version:** `v0.9.19B` (`package.json` and `src/lib/app-version.ts`).  
**Last documentation refresh:** 2026-07-01.

## Current state

The Folio redesign and recovery program are complete on `main`. Recovery milestones M1–M11 restored the existing generation, persistence, approval, export, Applications, and Career Vault behavior inside the Folio UI. Historical recovery detail is preserved in [`archive/recovery/FOLIO_RECOVERY_ROADMAP.md`](archive/recovery/FOLIO_RECOVERY_ROADMAP.md).

The product is ready for real application use. New work should be driven by observed user-facing failures or by an explicitly selected roadmap item—not by reopening the completed recovery program.

## Canonical product flow

```text
Landing / onboarding
  → Career Vault
  → Generate from a job description
  → Output Editor
  → Confirm content
  → Approve against the server one-page PDF gate
  → Export
  → Track in Applications
```

| Surface | Route | Source of truth |
|---------|-------|-----------------|
| Dashboard | `/dashboard` | `DashboardPageClient` |
| Career Vault | `/inventory` | `CareerVaultPageClient` |
| Generate | `/generate` | `NewApplicationPageClient` |
| Applications | `/records` | `ApplicationsPageClient` |
| Output Editor | `/output/[draftId]` | `OutputEditorPageClient` |
| Profile | `/profile` | `ProfilePageClient` |
| Settings | `/settings` | Settings shell |

`/resume-preview/[draftId]`, `/resume-preview/[draftId]/edit`, and `/cover-letter-preview/[draftId]` are retired and return `notFound()`. `/dev-tools` is available only outside production.

## Settled behavior to preserve

- Supabase is the persisted source of truth for inventory, applications, generated drafts, and exported files.
- Generate and Applications link to `/output/[draftId]`.
- Resume and cover-letter work live in one Output Editor with separate staging buckets.
- User-selected resume bullet count is authoritative: selecting three bullets returns three; AI does not silently choose a different count.
- Content edits invalidate approval. Server-rendered PDF page count is the export truth.
- Resume evidence staging and cover-letter evidence staging remain separate and make AI-step cost explicit.
- Company discovery is visible, confidence-checked, and skipped for confidential/recruitment postings.
- Career Vault changes use the `InventoryEdits` overlay; source resume parses are not mutated.
- Active routes must never remount the forbidden legacy clients listed in [`FOLIO_REDESIGN.md`](FOLIO_REDESIGN.md).

## Current priority

Use Folio for real job applications and fix concrete issues as they surface. Manual verification lives in [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md). Optional future work is listed in [`ROADMAP.md`](ROADMAP.md).

## Development commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Build plan checklist

Before implementing a milestone or bug fix, confirm:

1. The task is one focused change.
2. Unrelated product behavior and UI are out of scope.
3. Boundary inputs and important failures are handled visibly.
4. Existing test suites are extended unless a genuinely new domain needs a suite.
5. No source-grep test is added unless behavior-level coverage is impractical and the reason is documented.
6. Documentation changes stay under `/docs` except repository-discovery files such as `README.md` and agent instructions.
7. Environment-variable or migration changes are explicit.
8. User-facing provider/model IDs are verified before hardcoding.
9. Auth, persistence, identity, external API, async, retry, and idempotency risks are called out before modification.
10. The completion report includes tests, known risks, next step, chat-boundary guidance, and suggested Git commands.

## Documentation map

Start at [`docs/README.md`](README.md). Historical audits and milestone logs are intentionally separated under [`archive/`](archive/).
