# HANDOFF

## Current version

**v0.9.8B** (code) · **v0.9.8C** doc audit sync

## Latest milestone (code)

**v0.9.8B — Resume Generation Auto-Repair & Non-Blocking Validation**

Gemini structure violations (too many roles/bullets) are auto-repaired before save. Repaired drafts get `needs_review` status, visible repair banner on application package, and `resume_structure_needs_review` risk flag. Hard-block only on missing work experience, unparseable JSON, missing skills groups, or unnormalizable additional experience.

## Milestone history (v0.9.x)

| Version | Theme |
|---------|--------|
| v0.9.8B | Resume auto-repair (roles/bullets), non-blocking validation |
| v0.9.8A | Company name consistency, export naming, cover letter readability, research discoverability |
| v0.9.8 | Application package UX — inline cover letter, collapsed research, approve near resume |
| v0.9.7 | Cover letter architecture rewrite (bridges, story ranking, display names) |
| v0.9.6 | Auto research flow + dynamic progress stages |
| v0.9.5 | Firecrawl website research |
| v0.9.4 | Auto company context + Gemini retry |
| v0.9.3 | Company context generator (per-application) |
| v0.9.0–2 | Cover letter generation, revision, quality gates |

## Architecture (current)

```
Inventory (Supabase) + JD
  → buildResumeDraftPayloadFromInventory()
  → ensureCompanyContextForGeneration()  [Firecrawl if website + no saved website research]
  → POST /api/ai/generate-resume
      → parse JSON → normalize → repairGeneratedResumeContent() → validate → save draft
  → POST /api/ai/generate-cover-letter (uses saved company context + resume evidence spine)
  → /resume-preview/[draftId]  (application package)
```

**Key modules**

| Area | Entry points |
|------|----------------|
| Resume generation | `resume-draft-gemini.ts`, `generation-validation.ts`, `repair-generated-content.ts` |
| Cover letter | `cover-letter-gemini.ts`, `story-ranking.ts`, `generation-validation.ts` |
| Company research | `ensure-for-generation.ts`, `research.ts`, `firecrawl/scrape-company-website.ts` |
| Export | `buildExportResumeDocumentModel()`, `resolveExportDocumentModelForDraft()` |
| Application shell | `application_records`, `GenerateTailoredResumeSection`, `ResumePreviewPageClient` |

## Application package page order

1. Summary (company, role, status chips)
2. Structure repair banner (when auto-repair ran)
3. Resume — PDF preview, layout sliders, **Approve for Export**, downloads
4. Cover letter — **inline body**, Edit / PDF / DOCX
5. Company research — collapsed by default; summary visible in header
6. Edit resume content — hidden until toggled (evidence + regenerate)
7. Advanced options — assessment, browser layout, HTML debug, JSON

## Post-generation navigation

```
Generate → /resume-preview/{resumeDraftId}  (application package)
  → Edit cover letter → /cover-letter-preview/{coverLetterId}
  → Back to application package
```

## Run

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Next milestone

**v0.9.9 — Application Quality Checker** (post-generation review before export). Not started.

Parked after that: v0.10.0 Edit Learning Log, v0.10.1 Cover Letter Version History.
