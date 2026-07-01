# Output Editor Redesign — Agreed Design (M10a)

> Archived implemented design brief. Use the live Output Editor and current product docs for present behavior.

**Status:** Approved design. Source of truth for M10b implementation.
**Date agreed:** 2026-06-30
**Scope client:** `src/components/pages/OutputEditorPageClient.tsx` (stays mounted at `/output/[draftId]`).
**Design language:** `docs/DESIGN.md` — Inter, sentence case, no shadows (hairline borders + tonal surfaces), `rounded-xl` cards, `rounded-lg` controls, folio tokens.

> M10b implements exactly this document. Do not revisit settled decisions; do not add features beyond what is described here.

---

## 1. Why this redesign exists

M4–M5c correctly decomposed the legacy Output Editor capabilities but stacked them as collapsed right-panel disclosures. Three distinct jobs are currently tangled into one scrolling stack:

1. **Read the verdict** — how well does this resume fit the job?
2. **Shape the document** — view, edit bullets, regenerate, tune layout.
3. **Approve & ship** — pass the one-page gate, export, mark applied.

The redesign separates them into a clear top-to-bottom narrative and reserves the right column for **controls that act on the document** — never for read-only insight.

---

## 2. Agreed decisions (settled in M10a)

| # | Decision | Resolution |
|---|---|---|
| 1 | Fit summary + score placement | **Full-width banner directly under the header**, after generation. Surfaces numeric score + verdict + strengths + gaps. Removed from the right-panel disclosure. |
| 2 | Dual-view toggle | **Segmented `Text \| PDF` control, one view at a time**, in the document column. PDF available on demand — no approval required. |
| 3 | Selectable bullet blocks | Each bullet is selectable; per-bullet actions **Edit / Replace / Remove**. Edit & Remove are immediate content edits (existing M5a invalidation path). **Replace uses a NEW true single-bullet revision scope/endpoint.** |
| 4 | Layout controls + live PDF | Port the 5 legacy sliders as a Folio-native control strip shown **only in PDF view**, wired to live `ResumePdfPreview` re-render. |
| 5 | Export UX consolidation | **One full-width "Export & delivery" card at the BOTTOM of the Resume tab.** Topbar export buttons removed. |
| 6 | "Mark as sent" | **Removed** from the Output Editor — duplicate of Applications status edit (M6). |
| 7 | Right panel reorganization | Controls only: experience inclusion, custom AI revision, shape-next-regeneration (line-level), tailoring diagnostics. Fit summary moves to top; per-bullet edit moves into the document. |
| 8 | CL secondary formats | **Collapsible "Other formats" section below the main CL body** — copy-paste blocks for email / LinkedIn / recruiter DM / WhatsApp, read from `coverLetter.rationale`. |

---

## 3. Resume-tab layout

```
┌─ {Role} · {Company}        [Generated]  ┐   header only — NO export buttons
├─────────────────────────────────────────┤
│  FIT SUMMARY BANNER (full width)         │   Topic 1
│  ◐ 82/100   Good fit                     │   score chip + verdict
│  Strengths: …          Gaps: …           │   one line each
├─────────────────────────────────────────┤
│  [needs_review banner — only if flagged] │   trust block, stays at top
├──────────────────────────┬──────────────┤
│ DOCUMENT (≈62%)          │ CONTROLS(≈38%)│
│ ┌ [ Text | PDF ] ──────┐ │ Experience    │   Topic 2 toggle
│ │ Text: selectable      │ │  inclusion    │   whole-job toggles (visible)
│ │   bullet blocks       │ │ ───────────── │
│ │   → Edit/Replace/Remove│ │ Custom AI     │   Topic 7: action controls only
│ │ PDF: A4 iframe +      │ │  revision   ▾ │
│ │   Layout sliders      │ │ Shape next    │
│ └───────────────────────┘ │  regeneration▾│   renamed from "Bullet controls"
│ [ Regenerate resume ]     │ Tailoring     │
│                           │  diagnostics ▾│
├──────────────────────────┴──────────────┤
│  EXPORT & DELIVERY (full width, BOTTOM)  │   Topic 5
│  approval state · one-page gate result · │
│  [Approve] → [Export PDF] [Export DOCX]  │
└──────────────────────────────────────────┘
```

Page max-width stays `max-w-[1100px]`. The document/controls split stays ≈62/38 on `lg+`, stacking vertically on small screens.

---

## 4. Topic specifications

### 4.1 Fit summary banner (Topic 1)

- **Placement:** full-width card directly under the page header, above the document split. Not a disclosure.
- **Data — wire the numeric score:** call `calculateFitScore(draft.content, draft.rationale)` (from `@/lib/resume-draft/layout`) → `ResumeFitAssessment`. This is deterministic, **no page-load AI**. Pass **both** `rationale` and `fitAssessment` into `buildPackageFitSummary`.
  - The current Output Editor passes only `{ rationale }`, so no number ever appears. M10b must add the `fitAssessment` argument.
- **Surface:**
  - **Score chip** `NN/100` with verdict label (`Strong fit` / `Good fit` / `Stretch fit` / `Weak fit` via `fitScoreToVerdict`).
  - **Strengths line** and **Gaps line** (already extracted by `buildPackageFitSummary` — top 2 each).
- **Fallbacks:** verdict-only string when rationale is thin; `PACKAGE_FIT_SUMMARY_UNAVAILABLE` when there is no signal. Banner still renders with an honest "fit read unavailable" state rather than disappearing.
- **Removed:** the right-column "Fit summary" disclosure.

### 4.2 Dual-view toggle (Topic 2)

- **Mechanic:** a `Text | PDF` segmented control at the top of the document (left) column. One view visible at a time.
- **Text view:** today's `RenderedResume`, extended with selectable bullet blocks (§4.3). Default view.
- **PDF view:** `ResumePdfPreview` built from `buildExportResumeDocumentModel({ draft, jobDescription, companyContext, referenceResume, layoutSettings })`. **Available on demand — does not require approval.** This removes the current "PDF only after `exportReady`" coupling.
  - After approval the same PDF view simply reflects validated layout settings; before approval it is a faithful preview with the component's existing overflow badge + page-break line.
- **Not chosen:** split view (cramped against the 62/38 split + right column) and PDF-as-third-tab (separates PDF from editing context).

### 4.3 Selectable bullet blocks (Topic 3)

- **Interaction:** in Text view each experience bullet is a selectable block. Selecting reveals an inline action row: **Edit**, **Replace**, **Remove**. Header/summary/skills sections get section-level edit affordances (reusing the existing `StructuredResumeEditor` mutators under the hood). This **replaces the whole-panel "Edit resume" form toggle** with in-context editing.
- **Edit (inline):** inline textarea on the bullet; reuse `setExpBullet`. Save is an immediate content edit.
- **Remove:** delete the bullet from `draft.content`; reuse `removeExpBullet`. Immediate content edit.
- **Replace (single-bullet regeneration) — NEW endpoint:** triggers regeneration of just that one bullet.
  - **Approved scope change:** add a new `single_bullet` revision scope to `ResumeCustomRevisionScope` and a corresponding branch in `POST /api/ai/revise-resume-scope` (alongside the existing `professional_summary` and `selected_role` branches). It accepts `roleIndex`, `bulletIndex`, the current bullet text, and an optional instruction; returns a single revised bullet; the client applies only that bullet.
  - This is an **additive** change. Existing scopes' behavior must not change. The shared generation/repair engine internals must not change — only a new revision scope is added.
- **Invalidation reconciliation:** every Edit / Remove / Replace that mutates `draft.content` runs through the existing M5a path — `resolveDraftStatusAfterContentEdit(draft.status)` downgrades `approved`/`layout_changed` → `layout_changed` and clears `serverPdfValidation`. No new invalidation logic.
- **Reconciliation with `lineLevelExcludedBulletKeys` / `lineLevelForcedBulletKeys`:** these are a **different mental model** — they shape AI evidence input for the **next full Regenerate**, not the current document. They stay **out of the per-bullet menu** and live in the right-column **"Shape next regeneration"** disclosure (renamed from "Bullet controls"), clearly labeled "affects regeneration, not the current document." So:
  - In-document bullet menu = immediate content operations (Edit/Replace/Remove).
  - Right-column "Shape next regeneration" = staged force/exclude keys merged in `buildMergedControls()` at the next Regenerate (unchanged from M5b).

### 4.4 Layout controls + live PDF (Topic 4)

- **Controls:** port the 5 legacy sliders — body font, side margins, top margin, line spacing, section spacing — as a **Folio-native control strip shown only in PDF view**.
- **Wiring:** slider change → `manualSettings` state → rebuild `documentModel` (via `buildExportResumeDocumentModel`) → `ResumePdfPreview` re-renders live. Surface the auto-optimizer note (`optimizeResumePreviewSettings` / `optimizationNote`).
- **Invalidation:** layout changes after approval are already caught by `areExportLayoutSettingsEqual` in the M4 `exportReady` derivation — no new logic.
- **Restyle:** the legacy sliders are slate-styled; rebuild as Folio-native (`rounded-lg`, folio tokens, sentence-case labels). `ResumePdfPreview`'s wrapper chrome currently uses `shadow-xl`/slate-* — restyle the wrapper to DESIGN.md (the iframe's print HTML is export truth and is left untouched).

### 4.5 Export & delivery zone (Topic 5)

- **One full-width "Export & delivery" card at the BOTTOM of the Resume tab**, containing:
  - Approval state badge ("Approved for export" / not approved).
  - The server one-page gate result (`output-one-page-block` with `suggestedActions`).
  - The `layout_changed` re-approve notice.
  - Step flow: `Approve for export` → `Export PDF` / `Export DOCX` (gated on `exportReady`).
- **Removed:** the duplicate Export PDF / Export DOCX buttons in the topbar.
- **`needs_review`** stays as a **top banner** near the fit summary (it is a trust block, not an export control), not inside the export card.
- Preserve all M4 semantics: `approveResumeDraftForExport`, the 422 one-page hard gate, `exportReady` derivation, structured filenames, private-storage delivery. Export must not bypass the gate.

### 4.6 "Mark as sent" (Topic 6)

- **Removed** from the Output Editor. Status changes to `applied` are handled by Applications status edit (M6). Remove `handleMarkSent`, the topbar CTA, and the `markedSent` state.

### 4.7 Right panel = controls only (Topic 7)

Right column retains **only document-acting controls**:
- **Experience inclusion** — whole-job include/exclude toggle cards (kept visible, as today).
- **Custom AI revision** — the revision queue (disclosure, unchanged from M5a).
- **Shape next regeneration** — line-level force/exclude (renamed from "Bullet controls"; disclosure), with explicit "affects regeneration, not the current document" labeling.
- **Tailoring diagnostics** — omitted-evidence / warnings (disclosure, read-only, no AI).

Moved out: **Fit summary** → top banner. Per-bullet edit/remove/replace → in-document selection.

### 4.8 CL tab — secondary formats (Topic 8)

- **Placement:** a **collapsible "Other formats" section below the main cover-letter body** (and its edit/quick-action/tone/evidence controls). Not a sub-tab.
- **Data:** read `coverLetter.rationale` (`emailCoverLetter`, `linkedinMessage`, `recruiterDm`, `whatsappIntro`). These are precomputed strings — **no generation**. Copy-paste blocks with a "Copy" button each.
- **Restyle:** rebuild the slate-styled `SecondaryCommunicationsPanel` as Folio-native (`rounded-lg` blocks, folio tokens, sentence case). Hidden entirely when the rationale carries no secondary formats.
- The CL primary body, manual edit + dirty/save/beforeunload, quick actions, tone selector, evidence staging, and the 420-word + banned-phrase export gate (M4.6/M5c) are unchanged.

---

## 5. What must not change (M10b guardrails)

- `OutputEditorPageClient` stays mounted at `/output/[draftId]`. No active `page.tsx` imports a forbidden legacy client; `tests/suites/app-shell.test.ts` route-contract stays green.
- Export engine, page-count truth, filename scheme, generation/repair engine internals, model IDs, evidence spine.
- M4/M5a/M5b/M5c approval & export gate semantics: server one-page 422 hard gate remains export truth; `resolveDraftStatusAfterContentEdit` invalidation on any content edit; `areExportLayoutSettingsEqual` layout invalidation.
- **Permitted additive change:** a new `single_bullet` revision scope + `POST /api/ai/revise-resume-scope` branch for Replace (§4.3). This is the one approved endpoint/scope addition; existing scopes' behavior must not change, and the underlying generation/repair engine is not modified.

---

## 6. Implementation notes for M10b

- Fit score requires wiring `calculateFitScore` and passing `fitAssessment` to `buildPackageFitSummary` (currently absent).
- `ResumePdfPreview` already accepts a `documentModel` with no approval requirement and self-measures overflow — reuse directly; only restyle its wrapper chrome.
- Layout sliders live wiring mirrors the legacy `ResumePreviewPageClient` (`manualSettings` → `documentModel` → preview), but Folio-native and PDF-view-only.
- Selectable-bullet Edit/Remove reuse the existing `StructuredResumeEditor` mutators; the whole-panel edit toggle is retired.
- Restyle targets to fold in (DESIGN.md): `ResumePdfPreview` wrapper, ported layout sliders, `SecondaryCommunicationsPanel`.
- Independent Opus review required before merge (same standard as M4).
