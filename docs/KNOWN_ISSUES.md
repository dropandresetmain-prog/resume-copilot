# Known issues and accepted risks

**Scope:** current behavior on `main` after Folio recovery M11.  
**Updated:** 2026-07-01.

Historical issue notes are preserved in [`archive/history/KNOWN_ISSUES_PRE_MAIN_2026-06-30.md`](archive/history/KNOWN_ISSUES_PRE_MAIN_2026-06-30.md).

## Investigate now when reproduced

### Server-side generation idempotency

Client controls prevent ordinary double submission, but generation does not use server-side idempotency keys. Investigate if duplicate applications, drafts, or billable AI calls appear. Risk if ignored: duplicate writes and avoidable AI cost during retries or rapid resubmission.

### Career Vault application counts fail closed to zero

Counts depend on `reference_resume_id` and `sourceCitations[].resumeId`. Loading failures are currently displayed as zero. Investigate when counts look wrong. Risk if ignored: misleading usage history, without data loss.

### Difficult DOCX layouts

Google Docs spacing collapse, Canva/table-heavy documents, and ambiguous comma-separated role/company lines remain parser risks. Preserve warnings and unparsed content instead of guessing. Risk if ignored: incomplete or misclassified inventory.

## Park for later

### Incomplete structured Inventory CRUD

Education supports edit, hide, and revert but not a full add-item/rich field workflow. Other inventory categories still rely partly on overlay semantics. Recommended action: address only as a scoped Inventory CRUD milestone. Risk if ignored: some users must re-import or use existing add-from-text paths.

### Revision history and undo

Cover-letter versions are not retained, bullet removal is immediate, and accepted revisions have no general undo stack. Recommended action: add version history only if real use shows meaningful loss. Risk if ignored: users may need to regenerate or manually restore content.

### Settings remains a shell

The route exists but does not yet expose a meaningful preferences model. Recommended action: define actual settings before implementing controls. Risk if ignored: low; the route can create an expectation gap.

### Durable AI call ledger

Logs capture Gemini call metadata, but there is no persisted job ledger. Pre-run estimates count logical steps; retries, fallback, and compression can increase actual calls. Risk if ignored: limited cost forensics and weaker retry observability.

## Accept risk

### Output Editor working state

- Resume and cover-letter staging is in memory and clears on hard reload.
- Per-section resume editors save explicitly; navigating mid-edit can discard an unsaved working copy.
- Replace operations are batched into one AI call for all staged bullets.
- Replace alternatives are role-scoped and deterministic from the saved evidence spine.

These choices keep state semantics understandable and avoid hidden persistence.

### Export measurement

Browser preview can disagree with Linux Chromium near the one-page boundary because fonts and rendering differ. Server PDF validation remains authoritative. DOCX is editable and may reflow in Word.

### Inventory overlay identity

Edits and hides are keyed by collated item IDs. Re-parsing can orphan an override if an item ID changes. Source parses remain immutable by design.

### Fit score

The live score is the advisory `preview-fit-heuristic-v1`, not the target `fit-rubric-v1` described in [`FIT_SCORE_RUBRIC.md`](FIT_SCORE_RUBRIC.md). Do not present it as qualification certainty or offer probability.

### Retired routes and legacy components

`/resume-preview/[draftId]`, its edit route, and `/cover-letter-preview/[draftId]` intentionally return 404. Legacy clients remain in the repository only as behavioral references and must not be remounted.
