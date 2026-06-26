# Phase 0: Prompt & Payload Hygiene

**Version:** v0.9.17A  
**Status:** Implemented in code  
**Next:** M1 Unified Evidence Spine — see [`MATCHING_TAILORING_UPGRADE_PLAN.md`](MATCHING_TAILORING_UPGRADE_PLAN.md)

## Purpose

Reduce resume/cover letter generation token volume and latency **without** lowering `MAX_RESUME_DRAFT_BULLETS` (still **40**) or changing output schema, persistence, or providers.

Phase 0 prepares for M1 by narrowing prompts and compacting prompt-only payloads while preserving v0.9.16A factuality guardrails.

## What changed

### Resume prompt payload (`src/lib/resume-draft/prompt-payload.ts`)

- **Compact JSON** — `serializeResumeDraftPromptPayload()` uses single-line `JSON.stringify` for the Gemini prompt only.
- **Redundant `rawTexts` pruning** — omitted in the prompt when they duplicate `description` or `acceptedWording`; kept when they add distinct facts (e.g. extra metrics).
- **Full generation input unchanged** — `buildResumeDraftGenerationInput()` and `buildSourceBulletTextsByKey()` still receive complete data for validation.

### Resume prompt copy (`src/lib/resume-draft/prompt.ts`)

- Shortened duplicated system instructions (structure, education examples, repeated rationale/schema overlap).
- **Kept:** no hallucination, JD reframing, metric preservation, accepted wording, keyword advisory rules, anti-generic language, sourceRefs, one-page discipline, rationale field expectations.
- **Company context appendix** — replaced “light use only” with **positioning and framing only** rules; uses compact formatter (below).

### Company context for resume (`formatCompanyContextForResumePrompt`)

- Sends: top company facts, `likelyHiringPriorities`, `suggestedNarrativeAngles` (trimmed), `whyThisRoleMayMatter`, `confidence`, `limitations`.
- Omits: full `sources`, mission/vision blocks, duplicate full JSON from main payload (`companyContext` stripped from compact input JSON).

### Cover letter prompt (`src/lib/cover-letter/prompt.ts`)

- Added **hiring argument** instruction (not a resume summary).
- Tightened anti-generic company language (mission/vision admiration).
- **Unchanged:** secondary formats, evidence universe (still resume draft), bridges, word caps, banned phrases, URL/placeholder rules.

## Safety constraints (explicit)

| Constraint | Phase 0 behavior |
|------------|------------------|
| `MAX_RESUME_DRAFT_BULLETS` | **Remains 40** — 18–22 shortlist deferred to M1 |
| Output schema | Unchanged |
| Supabase / persistence | Unchanged |
| Source citations / sourceRefs | Unchanged |
| Accepted wording | Unchanged |
| New AI calls | None |
| Evidence spine / story spine | Not implemented |

## Regression protection

### Automated (contract tests)

- `generation-payload.test.ts` — compact JSON, rawTexts pruning, guardrail greps, cap still 40
- `resume-generation-validation.test.ts` — prompt guardrails + compact payload
- `company-context.test.ts` — positioning appendix, compact formatter
- `cover-letter-quality.test.ts` — hiring argument rules

### Manual quality QA

See [`PHASE0_MANUAL_QA.md`](PHASE0_MANUAL_QA.md).

**Status:** Contract-tested in CI. Live Gemini before/after comparison is **pending** unless run manually per checklist.

## Risks (classified)

| Risk | Class |
|------|-------|
| Pre-M1 bullet cap reduction | **Act Now — prevented** |
| Factuality / sourceRefs / accepted wording | **Act Now — preserved** |
| Compact company appendix too thin | **Investigate Now** — manual QA on positioning-heavy JDs |
| rawTexts pruning drops distinct facts | **Investigate Now** — metric-aware prune + tests |
| Prompt copy shifts model behavior | **Accept Risk** — manual QA |
| 18–22 shortlist, story spine, secondary format removal | **Park** |

## Files touched

| Area | Files |
|------|-------|
| Payload compaction | `src/lib/resume-draft/prompt-payload.ts` |
| Resume prompt | `src/lib/resume-draft/prompt.ts` |
| Company context | `src/lib/company-context/normalize.ts` |
| Cover letter prompt | `src/lib/cover-letter/prompt.ts` |
| Tests | `generation-payload.test.ts`, `resume-generation-validation.test.ts`, `company-context.test.ts`, `cover-letter-quality.test.ts` |
