# Resume Fit Score Rubric

**Rubric version:** `fit-rubric-v1`  
**Audience:** Product / engineering  
**Status:** Target specification — **not fully implemented in app code yet**

The live preview uses a simpler heuristic (`preview-fit-heuristic-v1` in `calculateFitScore()`). See [Current implementation status](#current-implementation-status).

---

## Purpose

Provide a **consistent, explainable** fit assessment between a candidate’s **career inventory** and a **saved job description**, without letting the LLM assign the final number.

The score answers:

1. **JD match** — How much of what the posting asks for is supported by real evidence in the inventory?
2. **Profile fit** — Holistically, does this person look credible for this *type* of role and level?
3. **Eligibility** — Are there absolute blockers (work authorization, hard credentials)?

The score supports user decisions (apply, tailor, skip) and UI on Generate / Records / draft review. It is **qualification fit**, not offer probability.

---

## Design principles

| Principle | Rule |
|-----------|------|
| **Separate judge from narrator** | AI extracts, classifies, and explains. **Code computes all numeric scores.** |
| **Evidence over keywords** | Skills-section mentions alone cannot earn full credit; experience bullets preferred. |
| **Hygiene ≠ fit** | Absolute gates are binary; they are not averaged into the score. |
| **Inventory vs draft** | Qualification is scored on **inventory**; draft can show a separate **presentation lift** (optional, capped). |
| **Reproducibility** | Same inputs + same rubric version → same output. Store rubric version on each result. |
| **Explainability** | Every score decomposes into Hit/Partial/Miss items, sub-scores, and verdict band. |

---

## Final formula

```
finalFit = jdScore + profileFit     // max 100
```

| Component | Range | Weight |
|-----------|-------|--------|
| **jdScore** | 0–90 | Evidence-based match to JD |
| **profileFit** | 0–10 | General profile fit (off-JD) |

### Verdict bands

| finalFit | Band |
|----------|------|
| 80–100 | **Strong fit** |
| 65–79 | **Good fit** |
| 50–64 | **Stretch** |
| <50 | **Weak** |
| Tier-1 hygiene **Fail** | **Not eligible** (score may be shown as reference only) |

---

## Hygiene gates (run first)

### Tier 1 — Absolute (Pass / Fail / Unknown)

| Factor | Detection | Fail condition |
|--------|-----------|----------------|
| **Work authorization / sponsorship** | User attestation (profile or per-job) | JD excludes sponsorship and user needs sponsorship |
| **Hard education / license** | JD extraction + inventory education | JD uses **required** language and inventory has no match |

**Unknown** (not answered): score runs as **Provisional** with a badge; not treated as Pass.

**On Tier-1 Fail:** status = **Not eligible**; do not rank as a viable application.

### Explicitly NOT hygiene

Scored as normal JD items (Hit/Partial/Miss):

- Location / work mode (usually nice-to-have)
- Minimum years (must or nice based on JD wording)
- Language (must or nice based on JD wording)
- Soft / preferred education

---

## JD score (0–90)

### JD item extraction

Parse each saved JD into a **Job Requirement Profile (JRP)** — a versioned list of scorable items.

Each item:

```ts
{
  id: string;
  text: string;
  bucket: "must" | "responsibility" | "nice";
  extractionMethod: "heuristic" | "ai_extracted";
}
```

**Bucket classification (language heuristics — code, not AI priority):**

| Bucket | Trigger phrases |
|--------|-----------------|
| **must** | required, must have, minimum, mandatory, essential, qualification |
| **nice** | preferred, bonus, ideally, plus, nice to have, desirable |
| **responsibility** | you will, responsibilities, own, drive, lead, partner with, role involves |
| **fluff** (exclude) | generic culture / passion / rockstar language |

Ambiguous lines default to **responsibility**, not must. Target **8–20 scorable items** after dedupe.

### Per-item matching (Hit / Partial / Miss)

Evidence tiers:

| Tier | Source | Typical verdict |
|------|--------|-----------------|
| **A** | Experience bullet with strong context/outcome | Hit |
| **B** | Experience bullet, weak mention | Hit or Partial |
| **C** | Role title, company, dates | Partial max |
| **D** | Skills section only | Partial (capped) |
| **E** | Summary / unparsed only | Miss |
| **F** | No evidence | Miss |

**Item credit:** Hit = 1.0, Partial = 0.5, Miss = 0.0

**Recency multiplier** (experience evidence only): 0–5y = 1.0, 5–10y = 0.7, 10+y = 0.4

### Bucket aggregation and sub-weights

```
bucketScore = (sum of itemScores) / (count of items in bucket)   // 0–100 scale

jdScore = 0.36 × mustScore
        + 0.32 × respScore
        + 0.14 × niceScore
        + 0.08 × keywordScore
        // result is 0–90
```

| Bucket | Points |
|--------|--------|
| Must-haves | **36** |
| Role responsibilities | **32** |
| Nice-to-haves | **14** |
| Keyword / surface alignment | **8** |

---

## Profile fit (0–10)

**Question:** Ignoring line-by-line JD coverage, does this profile look credible for this **role family and seniority**?

Four dimensions (0–2.5 each):

| Dimension | 0 | 1.25 | 2.5 |
|-----------|---|------|-----|
| **A. Level & trajectory** | Misaligned | Lateral / slight stretch | Natural next step |
| **B. Domain credibility** | Unrelated | Adjacent | Strong / same domain |
| **C. Career narrative** | Scattered | Mostly coherent | Clear arc toward role |
| **D. Evidence quality** | Vague / low trust | Mixed | Specific, credible bullets |

Penalties (after sum, floor 0): serious red flags −1 to −2; unsupported draft claims −1.

---

## AI vs deterministic responsibilities

| Task | Owner |
|------|--------|
| JRP item text extraction from JD | AI (schema-bound) + heuristic merge |
| Bucket assignment (must/nice/resp) | **Code** |
| Fluff filtering | **Code** |
| Inventory ↔ item matching | **Code** |
| jdScore arithmetic | **Code** |
| Profile dimension labels | AI (enums) |
| profileFit arithmetic | **Code** |
| finalFit + verdict band | **Code** |
| User-facing explanations | AI optional; must reference computed breakdown |

**Key rule:** AI may extract, classify, and explain, but **code computes all numeric scores**.

---

## Inventory vs draft (optional second pass)

| Metric | Input | Purpose |
|--------|-------|---------|
| **Inventory fit** | JRP + collated inventory | True qualification baseline |
| **Draft fit** | JRP + draft content (bullets must have valid `sourceRefs`) | Presentation quality |

- Draft cannot introduce new facts for scoring.
- **Presentation lift** = `draft jdScore − inventory jdScore`, cap at **+5 to +10** on JD portion only.
- Unsupported draft claims trigger profile-fit penalty, not JD credit.

---

## Data model (suggested)

### `job_requirement_profiles`

- `job_description_id`, `schema_version`, `items[]`, `extracted_at`

### `fit_assessments`

- `id`, `user_id`, `job_description_id`
- `inventory_snapshot_id` or hash
- `draft_id` (nullable)
- `rubric_version` (e.g. `fit-rubric-v1`)
- `hygiene`: `{ workAuth, hardCredential }` each `pass|fail|unknown`
- `jdScore`, `profileFit`, `finalFit`, `verdict_band`
- `breakdown`: bucket sub-scores, per-item `{ id, verdict, evidenceRefs[] }`
- `profileDimensions`: enum values + rationale
- `computed_at`

Store on draft record or link via FK for history comparison.

---

## MVP phasing

| Phase | Deliver |
|-------|---------|
| **MVP-A** | Hygiene gates + JRP heuristic extract + Hit/Partial/Miss + jdScore (0–90) |
| **MVP-B** | Profile fit 0–10 (enum mapping) + finalFit + verdict UI |
| **MVP-C** | Draft lift + integration with draft review + fit history on Records |

---

## Current implementation status

| Layer | Version | Location | Notes |
|-------|---------|----------|-------|
| **Target rubric** | `fit-rubric-v1` | This doc | Product IP — full JRP + hygiene + jdScore + profileFit |
| **Preview heuristic** | `preview-fit-heuristic-v1` | `src/lib/resume-draft/layout.ts` → `calculateFitScore()` | Provisional penalty/bonus on draft content + rationale; **not** the full rubric |
| **Layout fit** | — | `estimatePageFit()` | One-page layout estimate — separate from resume–job fit |

Do not treat the preview **Resume–Job Fit** number as the final `fit-rubric-v1` score until MVP-A/B ships.

---

## Summary formula (reference)

```
// Gates
if hygiene.workAuth == fail OR hygiene.hardCredential == fail:
  status = "not_eligible"

// JD (0–90)
jdScore = 0.36*must + 0.32*resp + 0.14*nice + 0.08*keyword

// Profile (0–10)
profileFit = sum(dimensions A–D) - penalties   // clamp 0–10

// Final
finalFit = jdScore + profileFit   // clamp 0–100 unless not_eligible
```
