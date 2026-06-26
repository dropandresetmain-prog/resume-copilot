# Prompt Quality, Input Usefulness, and Latency Study

**Planning pass:** Matching/Tailoring Engine Upgrade (pre–Milestone 1)  
**Version at study:** v0.9.16E  
**Prerequisite docs:** [`AI_CALL_STUDY.md`](AI_CALL_STUDY.md), [`MATCHING_TAILORING_UPGRADE_PLAN.md`](MATCHING_TAILORING_UPGRADE_PLAN.md)  
**Scope:** Prompt/input quality and cost/latency — **no product code changes**.

---

## 1. Executive diagnosis

Resume Copilot’s tailoring quality problems are **not primarily weak Gemini models or missing critique calls**. They come from three structural issues:

1. **Wrong or bloated inputs** — Resume generation sends a large, partially redundant JSON payload (up to 40 work bullets with `rawTexts` + citations, full unranked education/skills/additional, full JD) beneath ~16k characters of static instructions. Cover letter generation sends rich company context but a **narrow evidence substrate** (generated resume draft only).

2. **Instruction overload and duplication** — Resume and cover letter prompts repeat the same rules in system text, JSON schema comments, and post-hoc validation/repair. Many formatting constraints (role counts, section order, skills labels) are already enforced in code but still consume prompt attention.

3. **Misaligned feature naming and scope** — “Enrichment” is really **per-bullet inventory review suggestions** (keywords, wording, duplicates), not holistic inventory improvement. It correctly sits outside per-JD tailoring but sets expectations too high.

**Latency and cost** are dominated by **input + output token volume** on resume and cover letter generation, with occasional **second calls** for cover letter compression. Retries add variable overhead.

**Recommended sequence before M1:**

| Phase | Work | Rationale |
|-------|------|-----------|
| **Pre-M1 prompt hygiene** | Trim resume/cover letter static instructions; slim payload fields sent to Gemini; clarify company-context use on resume | Immediate cost/quality win without spine types |
| **M1** | Unified evidence spine + ranked shortlist in payload | Fixes selection substrate |
| **M2** | Cover letter story spine + prompt restructure | Fixes hiring-story substrate |
| **M3** | Add Evidence UI | User control on ranked spine |

Do **not** add new AI calls. Prefer deterministic ranking, deterministic rationale prefills, and narrower prompts.

---

## 2. Findings by AI prompt/call

### 2.1 Inventory enrichment

**Files:** `src/lib/enrichment/prompt.ts`, `src/lib/enrichment/payload.ts`, `src/lib/enrichment/state.ts`, `src/lib/ai/gemini.ts`

#### What it does today

| Capability | Supported? | Downstream effect |
|------------|------------|-------------------|
| Keyword suggestions | Yes (`keyword_suggestion` → `keywordBank` on accept) | Advisory in resume prompt (`approvedKeywords`, usage `advisory_keyword_bank`) |
| Alternative wording | Yes (`alternative_wording` → `acceptedWording` on accept) | `buildAcceptedWordingByBulletKey` → +1000 bullet rank boost; prompt prefers over raw description |
| Capability / role-type hints | Yes | Informational in review UI; **not** wired to generation |
| Duplicate detection | Yes (`possible_duplicate`, `duplicateGroups`) | Review only; separate from v0.9.13A deterministic duplicate panel |
| Risk warnings | Yes | Review only |
| Auto-apply to inventory | **No** | User accept/reject/ignore per suggestion |

**Input scope:** `buildEnrichmentInput` sends **Work Experience bullets only** — no additional experience, education, skills, or overlay imports.

#### Is it “enriching”?

**Mostly no** — in the product sense of improving inventory holistically. It is **suggesting metadata and alternate phrasing** for human review. The only generation hooks are:

- Accepted **wording** (per bullet)
- Approved **keywords** (bank-wide, advisory)

The name “enrichment” overpromises relative to behavior.

#### Prompt quality

**Strengths:**

- Strict JSON, no fabrication rules
- Clear issue types and duplicate group shape
- Incremental batching (`filterIncrementalEnrichmentInput`, hash skip) reduces repeat cost

**Weaknesses:**

- No JD context (correct for inventory-time, but limits “market keyword” relevance)
- Capabilities/role types are suggested but unused downstream — model effort wasted
- Same anti-fabrication rules as extraction/generation but no cross-check with inventory edits overlay

#### Recommendation

| Action | Classification |
|--------|----------------|
| Keep outside matching/tailoring spine | **Yes** — inventory-time, not per-application |
| Remain LLM | **Yes** |
| Prompt tune only | **Minor** — drop or de-emphasize `suggestedCapabilities` / `suggestedRoleTypes` in prompt unless wired later |
| Rename/reposition | **Later** — “Inventory review suggestions” or “Bullet review (AI)” |
| Park deeper enrichment | **Yes** — education/skills enrichment, auto-merge duplicates, JD-aware keyword suggest |

---

### 2.2 Add from text / inventory text extraction

**Files:** `src/lib/inventory-text-extraction/prompt.ts`, `apply.ts`, `project-guard.ts`

#### Is this the text-blob flow?

**Yes.** User pastes free-form text → `POST /api/ai/extract-inventory-from-text` → review → `applyInventoryTextExtractionSuggestions`.

#### What the LLM does

**Extraction and classification only** — not narrative quality improvement, not JD tailoring. Maps paste to kinds: `new_work_experience`, bullets, `skill`, `education`, `additional_experience`, `keyword`.

#### Quality of classification

**Adequate for baseline** with layered guards:

- Prompt: explicit project vs job examples, `sufficient=false` for thin paste
- Apply: `coerceProjectLikeSuggestionToAdditional`, duplicate bullet skip, experience key resolution

#### Remaining pollution risks

| Risk | Mitigation today | Gap |
|------|------------------|-----|
| Personal project as work experience | Prompt + `project-guard` | Freelance with vague client names may still misroute |
| Duplicate bullets | Skip on apply | Near-duplicates not caught |
| Wrong experience mapping | `mappedExperienceKey` | Unmatched roles need manual placement |
| Education | Extracted | **Preview-only** — not persisted |
| Keyword noise | Must be in paste | Generic keywords still possible |
| Overlay without cleanup | Immediate save on apply | User must run v0.9.16D cleanup for project pollution |

#### LLM vs deterministic

| Step | Owner |
|------|-------|
| Semantic classification | LLM |
| Project coercion, duplicate skip, experience key match | Deterministic (`apply.ts`, `edits.ts`) |
| Per-JD relevance | **N/A** — feeds inventory only |

#### Recommendation

**Keep as-is for purpose.** Clarify in UI copy: “Extract structured notes from paste” not “Improve your inventory.” Do not fold into evidence spine. Park education persistence and extraction quality metrics.

---

### 2.3 Company context generation and consumption

**Files:** `src/lib/company-context/prompt.ts`, `normalize.ts` (`formatCompanyContextForPrompt`), `resume-draft/prompt.ts`, `cover-letter/prompt.ts`

#### Generation quality

**Acceptable.** Prompt separates website facts vs JD vs inference; requires `limitations`, `sourceType`, `suggestedNarrativeAngles`, `likelyHiringPriorities`. Firecrawl markdown can be large but is the right primary source when available.

#### Most useful downstream fields

| Field | Resume today | Cover letter today |
|-------|--------------|-------------------|
| `companySummary`, `productsAndServices`, `customers` | In JSON appendix, “light use” | Required weave-in (≥2 facts) |
| `likelyHiringPriorities` | Weak | Used in `buildResumeEvidenceSpine` ranking input only |
| `suggestedNarrativeAngles` | Barely | Prompt says prefer when supported by **resume** evidence |
| `whyThisRoleMayMatter` | Not targeted | Available in JSON block |
| `limitations`, `confidence` | Passed through | Passed through |

#### Resume: underusing company context?

**Yes, by design.** Resume prompt section:

```text
## Saved company context (light use only)
Use this to improve role fit and keyword relevance. Do NOT override inventory evidence.
Do NOT invent facts from company context.
```

The model is told not to lean on context for claims — only “fit and keyword relevance.” That prevents unsupported company facts on the resume but **also prevents strong positioning** (“why this company’s problem space matches your operations background”) in `rationale.toneNotes` / `selectionAudit.positioningAngle`.

**Recommendation:** After spine exists, pass a **deterministic positioning slice** to the resume prompt:

- `likelyHiringPriorities` (top 3)
- 1–2 `suggestedNarrativeAngles` **pre-matched** to ranked evidence IDs
- Explicit rule: “Use for framing and rationale only; claims must remain inventory-backed”

Not stronger factual claims — stronger **selection framing**.

#### Why cover letters still feel generic

**All three:**

| Factor | Evidence |
|--------|----------|
| **Evidence substrate** | `buildResumeEvidenceSpine(draft)` — resume-selected stories only |
| **Prompt wording** | Requires bridges and company facts but model fills them from thin evidence → boilerplate admiration |
| **Story selection** | `story-ranking.ts` token overlap on draft bullets; additional experience appended unranked |

Company context JSON is often **richer than the evidence spine**. The model connects company facts to **weak or incomplete stories**, producing “I admire your mission”-style filler despite banned-phrase rules.

Validation checks **rationale** bridges (≥2) but does not verify prose actually executed the bridge pattern — only word count, banned phrases, URLs.

#### Recommended feeding model (post-spine)

| Consumer | Input |
|----------|-------|
| Resume positioning / rationale | Top hiring priorities + matched angles + spine `positioningAngle` (deterministic) |
| Cover letter story spine | Full ranked inventory proof + company facts + explicit “do not use” list |
| Bridge selection | Precompute 2–3 bridge templates in story spine: `{ companyFact, roleRequirement, evidenceId, relevanceSentence }` |
| Guardrails | `limitations`, `avoidOverclaim` from spine gaps; no new claims from context alone |

---

## 3. Resume generation deep dive

**Files:** `resume-draft/prompt.ts` (~16,241 chars / ~288 lines of TS), `payload.ts`, `bullet-payload.ts`, `reference-format.ts`, `generation-validation.ts`, `repair-generated-content.ts`, `tailoring-quality.ts`

**Tests locking prompt behavior:** `resume-generation-validation.test.ts`, `generation-payload.test.ts`, `company-context.test.ts` (grep helpers like `promptIncludesJdReframingRules`).

### 3.1 Reference resume usage

`buildReferenceResumeFormatProfile` sets `formattingOnly: true` and sends:

- `bulletStyle`, `sectionOrder`, `headerContact`, `densityHint`, font hints
- **No work experience content**

Prompt explicitly: “Reference resume is formatting/template only. Do NOT copy bullet text.”

**Note:** `bulletStyle` detection always returns `"keyword_colon"` (both branches identical in `reference-format.ts`) — dead logic; harmless but stale.

### 3.2 Company context on resume

Appended **after** the full JSON payload as a separate markdown section. Model sees entire inventory JSON first, then context — context may get less attention late in prompt.

**Verdict:** Too weak for positioning; appropriately cautious for facts. Needs **structured positioning appendix** (not full context JSON).

### 3.3 Effect of `MAX_RESUME_DRAFT_BULLETS = 40`

| Aspect | Reality |
|--------|---------|
| **Output target** | 12–13 work bullets, ≤4 roles (prompt + repair enforce) |
| **Input cap** | Up to 40 inventory bullets in `experiences[].bullets` |
| **Typical inventory** | Often 20–80+ bullets collated; 40 is a truncation ceiling |

**Is 40 too high?**

**Yes as default prompt input, but not because 40 is wrong for output — because each included bullet is verbose** (`description`, `rawTexts[]`, `sourceCitations`, `acceptedWording`, `keyword`).

With evidence spine, **15–20 ranked bullets** is sufficient input; Gemini selects/writes 12–13. Cap of 40 made sense before ranking was meaningful; today it mostly adds tokens.

**Recommendation:** Post-spine shortlist cap **18–22 bullets** for prompt JSON; keep repair/output rules at 12–13.

### 3.4 Token / cost / latency drivers (resume)

| Driver | Est. impact | Notes |
|--------|-------------|-------|
| Static `RESUME_DRAFT_SYSTEM_INSTRUCTIONS` | **High (~4–5k tokens)** | Duplicates schema + repair rules |
| `JSON.stringify(input, null, 2)` | **High (variable)** | Pretty-printing adds ~15–30% vs compact |
| Full JD in `jobDescription.rawText` | Medium | Duplicated conceptually with `roleTitle` / `companyName` |
| Per-bullet `rawTexts` + citations | **High** | Often redundant with `description` |
| Unranked `education`, `skills`, `additionalExperience` arrays | Medium–high | Full lists, no cap |
| `approvedKeywords` array | Low–medium | |
| Company context JSON appendix | Medium | Full `formatCompanyContextForPrompt` |
| Output JSON schema size | Medium | Large `rationale.selectionAudit` expected from model |

**Latency:** Single synchronous Gemini call; duration scales with input+output tokens. Repair/validate is fast local code.

### 3.5 Instruction audit: keep, trim, or move to code

#### Keep in prompt (creative / judgment)

- No hallucination; preserve metrics, employers, dates
- JD-specific **reframing** (not keyword mirroring)
- Anti-generic language list
- `acceptedWording` preference rules
- Keyword bank vs bullet keyword distinction
- Lateral/transferable reasoning when inventory supports it
- `jdAlignmentReason` quality expectation

#### Move or reinforce in deterministic code (already partially there)

| Instruction in prompt | Already in code | Action |
|----------------------|-----------------|--------|
| ≤4 roles, 2–4 bullets/role, 12–13 total | `generation-validation.ts`, `repair-generated-content.ts` | **Remove from prompt** or one-line “structure enforced post-generation” |
| Professional summary empty | Validation hard block | Remove lengthy summary rules |
| Skills/Languages/Interests labels | `REQUIRED_SKILL_GROUP_LABELS` | Short pointer only |
| Additional experience `Title: Detail` | `additional-experience.ts` normalize | Keep one example, drop repeated bad/good lists |
| Education institution/programme rules | Partially normalize | Trim examples |
| Senior vs internship role placement | `isEarlyCareerExperience`, repair | Keep one sentence |
| `selectionAudit.*` field population | **Should be spine-prefilled** | Remove from model duty in M1 |

#### Stale / duplicated / conflicting

- **Duplication:** JD analysis instructions + JSON schema rationale comments + `Rationale quality (required)` section — triple coverage
- **Conflict tension:** “Prefer concise bullets” vs sending 40 bullets of source material
- **Conflict:** “Company context light use” vs rationale asking for positioning angle
- **Stale:** `professionalSummary` backward-compat field — long rules for empty field
- **Over-rigid:** Education multi-degree examples (~15 lines) — better as one validator message

### 3.6 Safe prompt shortening (pre-M1, no spine)

1. Replace pretty JSON with `JSON.stringify(input)` (compact) — **~10–20% input savings**
2. Omit `rawTexts` when `description` equals primary raw text (send hash or flag)
3. Cap skills to top 15 by JD overlap; cap additional experience lines to 8
4. Collapse system instructions: merge “Rationale quality” into schema comment once
5. Company context: send **trimmed** object (drop `sources`, `vision`, `coreValues` when empty) for resume path

### 3.7 Concrete resume generation recommendations

| Category | Recommendation |
|----------|----------------|
| **Prompt** | Cut structure/format blocks by ~40%; keep factuality + reframing + anti-generic |
| **Payload** | Compact JSON; drop redundant `rawTexts`; cap bullets at 20 pre-spine / 18 post-spine |
| **Deterministic** | Prefill `selectionAudit.strongestMatches`, `honestGaps`, `positioningAngle`, `selectedBulletKeys` from spine in M1 |
| **Company context** | Resume: positioning appendix (priorities + matched angles), not “light use only” dismissal |
| **Latency/cost** | Pre-M1 hygiene saves ~20–35% input tokens; spine shortlist saves another ~15–25% on large inventories |
| **Defer until spine** | Aggressive bullet cap without rank; moving all rationale to code |

---

## 4. Cover letter generation deep dive

**Files:** `cover-letter/prompt.ts`, `resume-evidence.ts`, `story-ranking.ts`, `generation-validation.ts`

### 4.1 Instructions that improve quality

| Instruction cluster | Value |
|--------------------|-------|
| Conversational professional tone | High — distinct voice |
| Banned phrases + no em dashes | High — enforced in validation |
| Company display name / no URLs in prose | High — blocking validation |
| Company facts + role requirements + bridges in rationale | Medium — reduces generic letters when evidence supports |
| Structured workflow steps 1–5 | Medium — helps reasoning; also bloats prompt |
| Ranked resume evidence section | High **if evidence is good** — currently undermined by draft-only spine |
| Length targets (360–400, max 420) | Medium — triggers compression retry when missed |

### 4.2 Instructions that make letters “cover letter-y”

- **Five-step internal workflow** with JSON rationale mirroring — model optimizes for checklist completion
- **“Story 1, Story 2”** ranked blocks — encourages resume-summary paragraphs
- **Bridge template repeated** in prose and rationale — formulaic cadence
- **Secondary formats** (`emailCoverLetter`, `linkedinMessage`, `recruiterDm`, `whatsappIntro`) — extra output tokens for features used only in `SecondaryCommunicationsPanel`

### 4.3 Is bridge structure too rigid?

**Somewhat yes.** Requiring ≥2 `companyRoleStoryBridges` in rationale is good for explainability but pushes **fill-in-the-blank** structure. Better post-M2:

- Deterministic spine provides **2–3 pre-written bridge seeds**
- Prompt: “Expand these seeds into prose; do not invent new facts”
- Relax step 1–5 workflow to “use story spine sections below”

### 4.4 Post–story-spine prompt changes

| Remove / tighten | Move to deterministic spine |
|------------------|----------------------------|
| Long workflow steps 1–5 | `whyThisRole`, `whyThisCompany`, `proofStories[]` |
| `documentStoryRankingMethodology()` text | Scores + rationales in spine metadata |
| Full `formatCompanyContextForPrompt` | Top facts + priorities + 1–2 angles only |
| Ranked resume evidence dump | Compact spine shortlist + “resume consistency notes” |
| Duplicate tone/banned/length blocks | Keep once in “Hard rules” |

| Keep in prompt |
|----------------|
| Tone, banned phrases, punctuation |
| Factuality, no placeholder names |
| Company display name rules |
| Word limits |
| “Hiring argument not resume summary” explicit goal |

### 4.5 Sharper why me / why company / why role

Deterministic story spine should supply:

1. **Why this role** — 2 JD responsibilities ↔ top evidence IDs (from spine)
2. **Why this company** — 2 company facts from context matched to evidence (not mission worship)
3. **Why me** — positioning angle + proof stories **including inventory not on resume**
4. **Honest gaps** — explicit “do not claim X”

Prompt becomes: **compose prose from spine**; Gemini reframes, does not select stories.

### 4.6 Secondary communications cost

Each generation asks for 4 extra text blocks. Stored in rationale, shown in secondary panel. **Park or lazy-generate** if cost matters — not on critical path for interview quality.

---

## 5. Cover letter revision behavior

**Files:** `CoverLetterStagedRevisionPanel.tsx`, `revision-client.ts`, `revision-prompt.ts`, `revise-cover-letter/route.ts`, `revise-cover-letter-gemini.ts`

### 5.1 Chip → AI flow (confirmed)

```mermaid
sequenceDiagram
  participant User
  participant Panel as CoverLetterStagedRevisionPanel
  participant API as POST revise-cover-letter
  participant Gemini

  User->>Panel: Click chips (toggle, no AI)
  User->>Panel: Optional custom instructions
  User->>Panel: Click "Revise cover letter"
  Panel->>Panel: buildStagedRevisionInstruction()
  Note over Panel: Maps chips to labels;<br/>joins custom text as bullet list
  Panel->>API: action=custom,<br/>customInstruction="Apply these whole-letter revisions:\n- ...",<br/>persist=false
  API->>Gemini: buildCoverLetterRevisionPrompt()
  Gemini-->>API: JSON body
  API-->>Panel: candidate body + warnings
  User->>Panel: Accept revision
  Panel->>Panel: onAccepted() → parent saves
```

**Confirmed:**

- Chips **only stage** — `toggleChip` updates local state; no fetch
- **One AI call** on “Revise cover letter”
- Selected chips + custom notes → single `customInstruction` string; `action` is always `"custom"` from staged panel (chip-specific `getActionInstruction` paths are **not** used for individual chips — only their **labels** are concatenated)
- `persist: false` → preview; Accept triggers parent save
- `CoverLetterQuickRevisionPanel` is deprecated alias for staged panel

### 5.2 How custom instructions affect the prompt

`buildCoverLetterRevisionPrompt` sets:

```text
## Revision task
${getActionInstruction(action, customInstruction)}
```

For staged flow: `action === "custom"`, so instruction is the full string:

```text
Apply these whole-letter revisions:
- Shorten to 420 words
- Emphasize company fit
- Make this sound less corporate.
```

Plus hard rules, optional `resumeEvidenceSpine`, communication profile, `currentBody`.

**Implication:** Chip semantics are **plain-language bullets**, not structured `emphasize_company_fit` switch cases. The per-action `getActionInstruction` text (e.g. emphasize company “using only supported context”) is **not** applied for chips — only the short labels from `COVER_LETTER_REVISION_ACTION_LABELS`.

### 5.3 Revision inputs gap

| Input | Generation | Revision |
|-------|------------|----------|
| JD text | Yes | **No** |
| Company context | Yes | **No** |
| Ranked evidence | Draft spine + JD ranking | `buildResumeEvidenceSpine(resumeDraft)` **without** JD — chronological fallback |
| Communication profile | Yes | Yes |

Revision can drift from company/role fit because it lacks context and full evidence.

### 5.4 UX confusion / rename candidates

| Issue | Suggestion |
|-------|------------|
| Chip labels vs actual prompt instructions differ | Either use real `action` per chip (multiple instructions) or rename chips “Staging labels” |
| `emphasize_founder_business` | Rename “Emphasize business/builder experience” |
| `emphasize_technical_ai` | Keep but clarify “workflow automation, not ML engineer” |
| Chips say “Shorten to 420 words” but compression also runs server-side | Footnote: server may re-compress |

### 5.5 Post-M2 revision

Pass **full story spine** (not resume-draft-only). Include trimmed company context + JD role title. Optionally wire chips to structured `getActionInstruction` for stronger semantics.

---

## 6. Cost / latency drivers

### 6.1 Per-call ranking (typical combined generate)

| Step | Relative cost | Retry risk |
|------|---------------|------------|
| Company context | Medium–high (scrape + large markdown) | HTTP retry |
| Resume generation | **Highest** | HTTP retry + large I/O |
| Cover letter generation | High | HTTP retry + **compression retry** |
| Cover letter revision | Medium | Compression retry |
| Role rewrite | Low–medium | Per apply |
| Enrichment / extraction | User-initiated; scales with inventory | |

### 6.2 Token anatomy (order of magnitude)

| Component | Resume | Cover letter |
|-----------|--------|--------------|
| Static instructions | ~4–5k tokens | ~2–3k tokens |
| Variable input | 2–15k+ (inventory dependent) | 1–8k (context + evidence + profile + JD) |
| Output | 2–4k (full draft JSON) | 1–3k formal + secondary formats |

### 6.3 Non-token latency

- Firecrawl scrape (network)
- Supabase reads before/after calls
- Client waits on sequential pipeline (research → resume → cover letter)

### 6.4 Mitigations (no new AI)

| Mitigation | Est. savings | When |
|------------|--------------|------|
| Compact JSON, drop `rawTexts` redundancy | 15–25% resume input | Pre-M1 |
| Cap ranked bullets 18–22 | 10–30% on large inventories | M1 |
| Trim resume static prompt 40% | 10–15% resume input | Pre-M1 |
| Cover letter: drop secondary formats from default prompt | 20–30% cover output | Pre-M2 or flag |
| Trim company context for resume | 5–10% | Pre-M1 |
| Story spine replaces long workflow + full context | 15–25% cover input | M2 |
| Fix staged revision to pass JD + spine | Quality (fewer re-revisions) | M2 |

---

## 7. Deterministic vs Gemini recommendations

| Task | Today | Target |
|------|-------|--------|
| Evidence ranking | Partial token overlap | **Deterministic spine** (M1) |
| Story / bridge selection | Gemini from thin draft | **Deterministic spine** (M2) |
| Rationale skeleton (`selectionAudit`, gaps) | Gemini | **Spine prefill** + Gemini `overall` narrative optional |
| Resume structure repair | Code | Code |
| Cover letter word count / banned phrases | Code validation | Code |
| Enrichment suggestions | Gemini | Gemini (inventory-time) |
| Text extraction | Gemini | Gemini |
| Company context synthesis | Gemini | Gemini |
| Prose reframing (bullets, letters) | Gemini | Gemini |
| Critique second pass | None | **Still not justified** |

---

## 8. Changes to the existing M1/M2/M3 plan

### Add: Phase 0 — Prompt & payload hygiene (before M1 coding)

| Item | Owner | Doc update |
|------|-------|------------|
| Compact `JSON.stringify` for resume payload | `payload.ts` / prompt builder | Note in M1 plan |
| Strip redundant `rawTexts` from prompt input | `payload.ts` | New |
| Trim resume `RESUME_DRAFT_SYSTEM_INSTRUCTIONS` (~40%) | `prompt.ts` + test greps | New |
| Resume company context → positioning appendix | `prompt.ts` | New |
| Cap unranked skills/additional/education lines | `payload.ts` | New |
| Optional: cover letter secondary formats behind flag | `cover-letter/prompt.ts` | Park if risky |

**Rationale:** Immediate latency/cost win; reduces noise before spine work. Tests in `resume-generation-validation.test.ts` will need substring updates.

### M1 adjustments

- Spine shortlist target **18–22** bullets (not 40)
- Prefill rationale fields; shorten prompt rationale section
- Store spine snapshot on draft for explainability
- **Do not** shrink prompt to only shortlist until tests confirm quality

### M2 adjustments

- Replace cover letter workflow steps with story spine injection
- Trim `formatCompanyContextForPrompt` to ranked facts/priorities/angles
- Revision route: same spine + optional structured chip actions
- Consider demoting secondary comms to optional second step (park)

### M3 adjustments

- Add Evidence list reads spine rank + `rationale` sentence
- No prompt change required

### Test plan additions

| Check | Suite |
|-------|-------|
| Compact payload omits redundant rawTexts | `generation-payload.test.ts` |
| Prompt length budget (chars < threshold) | `resume-generation-validation.test.ts` |
| Staged revision sends combined custom instruction | `cover-letter.test.ts` (existing + chip combo) |
| Revision evidence uses spine when M2 lands | `cover-letter.test.ts` |

---

## 9. What not to implement yet

- New Gemini calls (critique, JD extraction, embedding ranker)
- Full `FIT_SCORE_RUBRIC` JRP extraction
- Renaming “Enrichment” in UI (cosmetic; park)
- Removing secondary cover letter formats without product sign-off
- Auto-regenerate cover letter on evidence change
- Wiring enrichment capabilities to generation
- Education enrichment scope expansion
- Per-chip `action` enum revision (unless revision quality still weak after M2)

---

## Appendix: Specific questions answered

| Question | Answer |
|----------|--------|
| Is enrichment actually enriching? | **No** — mostly keyword/wording/duplicate **suggestions**; only accepted wording + approved keywords affect generation. |
| Is add-from-text good enough? | **Yes for baseline extraction**; not for narrative quality; project rules + apply guards are sufficient with known edge cases. |
| Should resume use company context more strongly? | **Yes for positioning/rationale framing**, not for factual claims — use trimmed priorities/angles appendix. |
| Is `MAX_RESUME_DRAFT_BULLETS = 40` too high? | **Yes for prompt input** — output needs ~12–13; verbosity per bullet matters more than the number 40 itself. Target 18–22 ranked. |
| Resume prompt keep/remove/move? | **Keep:** factuality, reframing, anti-generic, acceptedWording. **Move/trim:** structure counts, education examples, triple rationale instructions. **Move to code:** selectionAudit prefill (M1). |
| Why cover letters feel generic despite company context? | **Draft-only evidence** + formulaic bridge workflow + validation on rationale not prose. Context is rich; stories are thin. |
| How do revision chips work? | Stage labels → combined `custom` instruction → one Gemini call → `persist: false` → Accept saves. Chip `getActionInstruction` details are **not** used. |
| What before unified evidence spine? | **Phase 0 prompt/payload hygiene** + company context positioning tweak; then M1. |

---

## References

- Prompt sizes measured: `resume-draft/prompt.ts` ≈ 16,241 characters static template
- Tests: `resume-generation-validation.test.ts`, `generation-payload.test.ts`, `cover-letter.test.ts`, `company-context.test.ts`
- Revision UI: `CoverLetterStagedRevisionPanel.tsx` lines 59–74, 133–152
- Reference resume: `reference-format.ts` (`formattingOnly: true`)
