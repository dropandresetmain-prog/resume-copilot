# Post-Rollback Capability Audit

No application code or Git state was changed during this audit.

## Executive diagnosis

Resume Copilot is really three systems layered together:

1. **Career evidence system**  
   Resume import, parsing, inventory, overlays, enrichment, cleanup, evidence ranking and story spines.

2. **Application-generation system**  
   Job intake, company research, resume generation, cover-letter generation, revision and regeneration.

3. **Trust and delivery system**  
   Review, approval, one-page validation, export, application records, save states, partial-failure recovery and auditability.

The old Generate and Application Package pages became heavy because they accumulated entry points for all three systems. We should not reproduce those pages wholesale in Folio. We should preserve the capabilities that matter, then redistribute them into clearer Folio-native workflows.

Primary documentation reviewed:

- `docs/ROADMAP.md`
- `docs/HANDOFF.md`
- `docs/PROJECT_FILE_MAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/AI_CALL_STUDY.md`
- `docs/MATCHING_TAILORING_UPGRADE_PLAN.md`

# 1. Capability history: what was built and why

| Era | Capabilities | Why |
|---|---|---|
| Milestones 1–2 | DOCX parsing, resume inventory, AI enrichment review | Establish a reusable evidence source rather than tailoring from one uploaded document |
| Supabase migration | User-scoped inventories, jobs, drafts and files | Make data persistent across devices and sessions |
| v0.4–0.5 | Resume generation, review UI, fit assessment, layout preview | Turn inventory plus JD into a reviewable tailored draft |
| v0.6–0.7 | Canonical document model, PDF/DOCX export, one-page gate, approval, layout controls | Deliver application-ready documents with trustworthy export behavior |
| v0.7.6–0.7.8 | Accepted enrichment wording, bullet ranking, inventory overlays, evidence regeneration | Improve generation without mutating source resumes |
| v0.8 | Application records | Group jobs, drafts, statuses and notes into an application workflow |
| v0.9.0–0.9.2 | Cover-letter generation, revision, secondary outreach formats, quality gates | Produce the communications around a tailored resume |
| v0.9.3–0.9.7 | Company context, Firecrawl research, automatic research, story ranking and explicit bridges | Make cover letters company-specific and evidence-based |
| v0.9.8–0.9.9 | Application Package, resume auto-repair, targeted evidence rewrite, model tiers, Review Center | Consolidate review and prevent brittle model output from blocking users |
| v0.9.11 | UX hierarchy, action placement, responsive package and Generate flow | Make the growing feature set navigable without changing behavior |
| v0.9.12 | Generalized import, identity removal, output polish, AI-call estimates and logging | Make the product usable beyond its founder dataset and more honest about AI cost |
| v0.9.13 | Duplicate cleanup, structured editing, package decision tree, fit summary | Improve trust and provide explicit repair paths |
| v0.9.14 | Context policy and verified website discovery | Decide visibly when to use JD-only versus company research |
| v0.9.15 | Add-from-Text, staged resume/cover-letter revision, batch revision queue, trust feedback | Let users expand evidence and revise generated work without hidden saves |
| v0.9.16 | Tailoring quality, export-fit accuracy, project routing/cleanup, safe application archive | Harden output quality and prevent destructive or misleading state |
| v0.9.17 | Prompt hygiene, unified evidence spine, cover-letter story spine | Rank the full evidence universe deterministically before Gemini |
| v0.9.18 | Category-aware evidence controls | Make Work, Additional, Education, Skills and Keywords behave according to their real capabilities |
| v0.9.19 | Evidence-tailoring diagnostics | Explain what evidence was used, omitted or available without another AI call |

# 2. Old UI capability map, sorted by page

## Landing — `/`

Capabilities:

- Auth-aware primary CTA
- Routes returning users toward uploads or the workspace

Technical dependencies:

- Local auth/session state
- `src/lib/navigation/landing-cta.ts`

Restoration importance: low. The Folio landing page can replace this if routing remains correct.

---

## Uploads — `/setup`

Capabilities:

- Sign in, sign up, magic link and sign out
- DOCX upload/dropzone
- Browser-side parsing
- Original-file storage
- Parsed-resume management
- Parser failures, warnings and unparsed-section visibility
- Inventory readiness
- Clear/delete resume inventory
- Private cloud file status

Technical endpoints:

- No parsing HTTP endpoint: `parseDocxResume()` runs client-side using Mammoth.
- Direct Supabase:
  - `resume_inventories`
  - `stored_files`
  - `original-resume-files` bucket

Important distinction:

> Upload presence is not proof that usable structured inventory was extracted.

Likely decisions:

- Keep DOCX upload and parser visibility.
- Merge this workflow into onboarding/Career Vault.
- Do not preserve the separate admin-like Uploads page unless it remains useful for source-file management.

---

## Career Inventory — `/inventory`

Capabilities:

### Inventory views

- Collated working inventory
- Work experience, education, skills and additional experience
- Per-resume source/debug view
- Parser warnings and unparsed content
- Source citations

### Non-destructive editing

- Hide bullets from generation
- Edit active wording
- Restore hidden bullets
- Add overlay experiences, bullets, skills and additional experience
- Unsaved-change protection
- Save feedback

Source resumes are never mutated. Changes live under `InventoryEdits`.

### AI enrichment

- Missing-evidence enrichment
- Full rerun
- Small-batch test
- Suggested wording
- Capabilities and role-type suggestions
- Keyword bank
- Duplicate suggestions
- Accept, reject, ignore and “use suggestion” decisions
- Auto-save feedback

Endpoint:

- `GET/POST /api/ai/enrich`

### Add-from-Text

- Paste notes or career history
- Gemini/mock extraction
- Grouped review
- Accept/reject before Apply
- Apply experiences, bullets, skills, additional experience and keywords
- Preview-only education
- Duplicate detection and skipped-item explanations

Endpoint:

- `GET/POST /api/ai/extract-inventory-from-text`

### Cleanup

- Deterministic duplicate detection
- Keep one
- Hide one
- Keep both
- Mark alternate wording
- Detect project-like Work Experience pollution
- Move project to Additional Experience
- Keep or dismiss project warning

These cleanup features are local/deterministic and persist through `resume_inventories`; they do not call AI.

Folio status:

- Already has upload, Add-from-Text, presentation tabs, inline bullet edit/hide and application-use counts.
- Missing enrichment review, duplicate cleanup, project cleanup, source-resume audit and strong trust states.

---

## Generate — `/generate`

This is an orchestration page, not just a form.

### Job intake

- Company
- Target role
- JD text
- Job URL
- Metadata extraction from pasted JD
- Save/update/delete saved jobs
- Duplicate-job handling
- Base-resume selection
- Last-used resume preference

Persistence:

- `job_descriptions`
- Browser `localStorage` for last base resume

### Output selection

- Resume plus cover letter
- Resume only
- Cover-letter-only intentionally parked

### Context decision policy

- JD-only
- Website plus JD
- Confidential/recruitment mode
- Prevent stale website research from leaking into JD-only generation
- Explain selected context mode before generation

### Website discovery

- Explicit “Find company website”
- Firecrawl search
- Domain/title/homepage/JD-overlap verification
- High-confidence automatic selection
- Medium-confidence confirmation
- Low-confidence fallback to JD-only
- Billable-search disclosure

Endpoint:

- `POST /api/company/discover-website`

### Company research

- Firecrawl website scrape
- Gemini company-context synthesis
- Saved per application
- Website-context reuse only when domain matches
- JD fallback when research fails
- Manual research editor
- Compact research status

Endpoint:

- `GET/POST /api/ai/generate-company-context`

External server calls:

- Firecrawl search
- Firecrawl scrape
- Gemini

### Resume generation

- Build generation input from active inventory
- Apply inventory overlays
- Choose/reference base resume for format
- Rank evidence
- Select model tier
- Generate
- Parse
- Normalize
- Auto-repair
- Validate
- Persist draft and input snapshot
- Link it to an application record

Endpoint:

- `GET/POST /api/ai/generate-resume`

### Cover-letter generation

- Combined generation after resume success
- Company context
- Story spine
- Communication Profile
- Partial-failure handling
- Retry cover letter without regenerating resume
- Persist linked cover-letter draft

Endpoint:

- `GET/POST /api/ai/generate-cover-letter`

### Cost and progress

- Logical AI-step estimate
- Research-fetch disclosure
- Model tiers
- Dynamic progress stages
- Structured server Gemini-call logging
- Resume/cover-letter artifact statuses
- Partial failure recovery

Persistence:

- `application_records`
- `generated_resume_drafts`
- `generated_cover_letter_drafts`

Folio status:

- The three-step composer exists and reuses most of the generation engine.
- Saved-job management, context-policy visibility, failure recovery and some trust details need explicit parity review.

---

## Applications — `/records`

Capabilities:

- Load persisted application records
- Link saved JD, resume draft, cover letter and company context
- Status rollups
- Edit application status
- Application notes
- Artifact presence/missing-state labels
- Open Application Package
- Open cover-letter editor
- Archive without deleting linked artifacts
- Saved-job management
- Unlinked/legacy draft history
- Delete unlinked drafts
- Export approved unlinked drafts

Persistence:

- `application_records`
- `job_descriptions`
- `generated_resume_drafts`
- `generated_cover_letter_drafts`

No dedicated HTTP API: these operations use user-scoped Supabase helpers directly.

Folio status:

- Has table/filter/archive/latest-draft presentation.
- Missing status editing, notes, save feedback, full artifact visibility, saved jobs and draft history.
- The fake Interview filter has no matching status model.

---

## Application Package — `/resume-preview/[draftId]`

This is the heaviest old page because it became the post-generation control center.

### Package loading

- Resume draft
- Application
- Cover letter
- Company context
- Current inventory and JD
- Legacy/missing-data fallbacks

Direct Supabase reads.

### Fit and evidence explanation

- Resume–job fit score
- Strongest matches
- Honest gaps
- Positioning angle
- Evidence selected
- Strong evidence omitted
- Cover-letter proof stories
- Quality warnings
- Action links into repair flows

These are deterministic reads from saved rationale, evidence-spine snapshots and current inventory. No page-load AI call.

### Application Review Center

- Readiness aggregation
- Resume/cover-letter/company-context/export status
- Approve-for-export sequence
- Cover-letter action path
- Re-approval requirements after changes

Endpoint:

- `POST /api/approve/resume-draft`

### Resume preview and export fit

- Browser PDF iframe
- A4 preview
- Layout controls
- Browser overflow measurement
- Server Puppeteer page-count truth
- Overflow amount
- Suggested layout fixes
- Re-approval after layout changes

Endpoints:

- `POST /api/validate/resume-pdf`
- `POST /api/approve/resume-draft`

### Resume export

- Approved PDF
- Approved DOCX
- Structured filenames
- Private storage delivery
- One-page PDF hard block

Endpoints:

- `POST /api/export/resume-pdf`
- `POST /api/export/resume-docx`

Persistence/storage:

- `generated_resume_drafts`
- `generated-documents` bucket

### Structured resume editing

- Edit header and resume sections
- Dirty/saving/saved state
- Before-unload protection
- Saving invalidates prior approval/validation
- Candidate-only revision previews
- Accept/Reject persistence

Direct Supabase for manual saves.

### Resume custom revision queue

- Stage summary/role instructions
- One AI call for multiple queued scopes
- Preview candidate
- Accept all or reject all
- Reject unrequested or invalid model output

Endpoint:

- `POST /api/ai/revise-resume-scope`

### Evidence controls

- Exclude evidence
- Force Work Experience bullets
- Targeted role rewrite
- Full resume regenerate
- Additional Experience inclusion for full regenerate
- Pending-change queue
- No AI call merely for staging

Endpoints:

- `POST /api/ai/rewrite-resume-role`
- `POST /api/ai/generate-resume`

### Inline cover letter

- Readable cover-letter body
- Missing-letter state
- Open dedicated editor
- Staged quick revision
- Accept/reject preview

Endpoint:

- `POST /api/ai/revise-cover-letter`

### Company research

- Collapsed company-context review
- Limitations and source visibility
- Optional editing

Folio status:

- Output Editor has basic resume regeneration/export, experience toggles, mark-sent and cover-letter controls.
- It lacks most review, approval, export-fit, diagnostic, structured-edit and evidence-control capabilities.

This page should be decomposed in Folio. It should not be copied.

---

## Resume editor — `/resume-preview/[draftId]/edit`

Capabilities:

- Dedicated draft review/edit workspace
- Section and bullet review
- Save draft content
- Draft status handling
- Inventory isolation

Likely consolidation candidate: merge useful editing behavior into Folio Output rather than preserve a second route.

---

## Cover-letter editor — `/cover-letter-preview/[draftId]`

Capabilities:

### Manual editing

- Raw-text editing
- Dirty-state tracking
- Save progress/success/failure
- Before-unload warning
- PDF preview

### Revision

- Quick instruction chips
- Custom revision
- Candidate preview
- Accept saves
- Reject discards
- Candidate-name consistency
- Placeholder-signature rejection

Endpoint:

- `POST /api/ai/revise-cover-letter`

### Evidence staging

- Use/avoid proof
- Work, Additional Experience and Education stories
- Pending-only state
- Applied only on Regenerate
- One AI step
- Resets after regeneration/navigation

Endpoint:

- `POST /api/ai/generate-cover-letter`

### Full regeneration

- Reuses current resume, job, inventory, profile and company context
- Replaces the existing cover-letter row in place
- Keeps stable editor/export links

### Export

- 420-word maximum
- Banned-phrase gate
- PDF and DOCX
- Structured filename

Endpoints:

- `POST /api/export/cover-letter-pdf`
- `POST /api/export/cover-letter-docx`

### Other views

- Company research
- Generation notes/risk flags
- Secondary communications: email, LinkedIn, recruiter DM and WhatsApp

Folio status:

- Much of this appears in simplified form in the cover-letter Output tab.
- Pending evidence staging, save semantics, candidate preview and trust states need parity assessment.

---

## Profile — `/profile`

Capabilities:

- Application Communication Profile
- Tone, preferences, boundaries and communication context
- Used by cover-letter generation
- Not intended as factual evidence for resume generation

Persistence:

- `application_communication_profiles`

Likely keep, but simplify. It should remain a tone/preferences layer, not become another evidence database.

---

## Dev Tools — `/dev-tools`

Capabilities:

- Profile/contact backfill
- Small-batch enrichment testing
- Debug output and provider inspection

Likely do not expose in the normal Folio product. Preserve only if still useful for development/support.

# 3. Backend-heavy capabilities without their own page

## Deterministic unified evidence spine

Files:

- `src/lib/evidence/spine.ts`
- `src/lib/resume-draft/payload.ts`
- `src/lib/resume-draft/bullet-payload.ts`

Inputs:

- Work bullets
- Additional Experience
- Education
- Skills
- Evidence-tied keywords
- Company-context positioning notes
- Forced/excluded state
- Accepted wording
- JD relevance
- Recency, metrics and redundancy

Outputs:

- Ranked evidence
- Resume payload slices
- `evidenceSpine` snapshot
- `selectionAudit`
- Story-ready metadata

Visible endpoints:

- Generate output quality
- Application Package fit summary
- Evidence-tailoring diagnostics
- Fix resume evidence
- Cover-letter story spine

No HTTP endpoint. It runs deterministically before resume/cover-letter AI calls.

Why it exists:

- Prevent prompt ordering from deciding evidence selection.
- Make selection explainable.
- Let downstream UI explain what was used or omitted.

## Cover-letter story spine

Files:

- `src/lib/evidence/story-spine.ts`
- `src/lib/cover-letter/evidence-prompt.ts`

Produces:

- Positioning angle
- Why this role/company
- Proof stories, including evidence not on the resume draft
- Supporting signals
- Honest gaps
- Avoid-overclaim instructions
- Evidence not to use
- Resume-consistency notes

Visible endpoints:

- Cover-letter quality
- Evidence staging
- Package diagnostics
- Later cover-letter revision through saved `storySpinePrompt`

Why:

- A cover letter should not be limited to whatever fit onto the one-page resume.

## Resume quality/repair pipeline

Files:

- `generation-validation.ts`
- `repair-generated-content.ts`
- `tailoring-quality.ts`

Capabilities:

- Normalize model output
- Repair excess roles and bullets
- Preserve forced evidence where possible
- Detect invented metrics
- Detect duplicate/keyword-stuffed bullets
- Detect generic rationale
- Mark repaired drafts `needs_review`
- Hard-block only irreparable output

Visible endpoints:

- Generate
- Package repair banner
- Fit/diagnostic warnings

## Export engine

Capabilities:

- Canonical resume document model
- Shared preview/PDF/DOCX content
- Server Puppeteer measurement
- One-page PDF gate
- Layout sanitization
- Structured filenames
- Private export storage

Visible endpoints:

- Application Package
- Legacy draft history
- Folio Output

This engine should remain regardless of UI decisions.

# 4. Technical endpoint inventory

## AI/research

- `/api/ai/enrich`
- `/api/ai/extract-inventory-from-text`
- `/api/company/discover-website`
- `/api/ai/generate-company-context`
- `/api/ai/generate-resume`
- `/api/ai/generate-cover-letter`
- `/api/ai/revise-cover-letter`
- `/api/ai/revise-resume-scope`
- `/api/ai/rewrite-resume-role`

## Approval/export

- `/api/approve/resume-draft`
- `/api/validate/resume-pdf`
- `/api/export/resume-pdf`
- `/api/export/resume-docx`
- `/api/export/cover-letter-pdf`
- `/api/export/cover-letter-docx`

## Direct Supabase sources

- `resume_inventories`
- `job_descriptions`
- `application_records`
- `generated_resume_drafts`
- `generated_cover_letter_drafts`
- `application_communication_profiles`
- `stored_files`
- `original-resume-files`
- `generated-documents`

# 5. What is probably mandatory for pre-Folio functional parity

These are not optional UI flourishes:

- Authentication and user-scoped data loading
- DOCX parsing with visible partial/failure states
- Persisted inventory and overlays
- JD intake and saved-job handling
- Evidence-spine generation path
- Resume generation, repair and validation
- Cover-letter generation and partial-failure recovery
- Company-context policy
- Persisted application/draft linkage
- Direct reload of generated work
- Resume review/edit/save
- Approve and one-page PDF validation
- PDF/DOCX exports
- Cover-letter edit/save/export
- Archive-without-delete
- Trustworthy loading, saving, applied, preview-only and failed states

# 6. Capabilities that require a product decision

These may be valuable, but they should not automatically return merely because they existed:

- AI enrichment UI
- Small-batch enrichment test mode
- Keyword bank
- Full duplicate-review UI
- Source-resume debug view
- Saved-job management on multiple pages
- Unlinked draft history
- Model-tier selector
- Manual company-context editor
- Fit summary
- Evidence-tailoring diagnostics
- Resume custom revision queue
- Targeted evidence rewrite
- Secondary communication formats
- Browser layout sliders
- Developer-details drawer
- Communication Profile complexity

# 7. Proposed plan

## Phase 1 — Capability decision matrix

Before Claude Code changes anything, evaluate every capability using:

- User value
- Frequency
- Required for core job-application flow
- Quality impact
- Data/trust risk if removed
- AI cost
- UI complexity
- Whether it belongs in the foreground, progressive disclosure or backend only

Decision labels:

- Keep visibly
- Keep under progressive disclosure
- Keep backend-only
- Merge into another flow
- Simplify
- Park
- Remove

Output: one approved capability matrix grouped by Folio page.

## Phase 2 — Define minimum parity contracts

For each Folio page, write behavioral acceptance criteria before implementation.

Examples:

- Career Vault must preserve overlays and cleanup semantics.
- Generate must preserve context-policy and partial-failure behavior.
- Output must preserve approval/export gates.
- Applications must preserve linked artifacts and archive semantics.
- No active Folio route may be replaced by a legacy page client.

Add route-level contract checks preventing another legacy remount.

## Phase 3 — Restore by dependency, not by old-page order

### Milestone 1: Shared trust foundation

- Auth resolution
- Loading/error/empty distinctions
- Identity-keyed state
- Persisted reload behavior
- Cover-letter structured-output blocker
- No visual redesign

### Milestone 2: Career Vault minimum parity

- Source upload and parser honesty
- Required overlay edits
- Selected cleanup tools
- Required enrichment decisions
- Folio-native drawers/dialogs, not old panels wholesale

### Milestone 3: Generate minimum parity

- Job intake
- Saved-job behavior
- Context policy
- Website discovery
- AI cost disclosure
- Base resume
- Combined generation
- Partial-failure recovery

### Milestone 4: Output core delivery

- Persisted resume/cover-letter loading
- Review status
- Approval
- Server one-page gate
- PDF/DOCX export
- Mark application sent
- Missing versus failed-load honesty

### Milestone 5: Output editing and evidence

Decide and restore only approved:

- Structured manual editing
- Resume revision queue
- Evidence controls
- Fit summary
- Tailoring diagnostics
- Cover-letter evidence staging
- Company-context review

This should likely be several smaller milestones.

### Milestone 6: Applications

- Persisted applications
- Status/notes
- Artifact links
- Archive
- Selected saved-job/history functionality
- Folio-native presentation

### Milestone 7: Onboarding, Profile and secondary surfaces

- Real upload
- Honest format support
- Remove fake LinkedIn/scratch flows unless implemented
- Simplified Communication Profile
- Settings decision
- Dev tools removed from production navigation

### Milestone 8: Authenticated regression closure

Test:

`sign in → upload → parse → inspect Vault → save job → research → generate → review → edit → approve → export → Applications reload`

Include:

- Direct route reloads
- Partial AI failures
- Save failures
- Identity changes
- Desktop/mobile
- Existing persisted user data

# Recommendation

Do not begin with “restore Career Vault” or “restore Application Package” as implementation prompts. Those names encourage page-level copying.

Begin with the capability decision matrix. Then give Claude Code one Folio page and one approved behavioral slice at a time.

The first implementation milestone should be the shared trust foundation, followed by Career Vault input quality, Generate orchestration, and Output delivery. Advanced diagnostics and revision tools should return only after you explicitly decide they justify their UI weight.

This audit is large enough that the next planning step should be a fresh chat using this report as the handoff.
