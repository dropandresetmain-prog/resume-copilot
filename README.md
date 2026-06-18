# Career Resume Copilot

Milestone 2: upload DOCX resumes, build a collated inventory, and review **AI-assisted enrichment suggestions** without overwriting parsed source data.

Parsing uses a layered architecture: generic section detection → profile-based extraction → unparsed fallbacks when confidence is low.

## What this project does

- Parses `.docx` resumes in the browser (original files are not stored)
- **Collated Inventory** (default view): merged work experience, structured education, additional experience items, and skills with source citations
- **AI enrichment** (review only): structured review cards (issue, before, suggested after, changes, rationale, risks) via interchangeable providers
- **Source Resumes / Debug**: per-resume parsed output for parser inspection
- Persists parsed JSON + enrichment review state in `localStorage` and supports export/import

## AI providers

Configure via environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `mock` (default), `gemini`, or `openai` |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` |
| `OPENAI_API_KEY` | Reserved for future OpenAI support |

The **mock provider** is test-only: it generates local rule-based suggestions to validate the review workflow. It is **not** real AI analysis. **Cursor does not perform enrichment** — enrichment runs through the configured `AI_PROVIDER` on the app server.

Real AI enrichment requires `AI_PROVIDER=gemini` (or future `openai`) plus the matching API key in `.env.local`.

Each suggestion is a review card showing what was detected, the original bullet (`beforeText`), optional suggested wording, keyword chips, what changed, why it matters, and risk warnings before you accept.

## Views

| View | Purpose |
|------|---------|
| Collated Inventory | Main working view — reusable items merged across resumes |
| AI Enrichment Review | Review cards with accept / reject / ignore; provider banner shows mock vs Gemini vs OpenAI |
| Source Resumes / Debug | Per-resume parser output with raw expandable fields |

## Data handling

- Parsed resumes are the source of truth
- Collated inventory is **derived** on load (not duplicated in export)
- Export JSON contains parsed resumes **and** enrichment review state (schema v2)
- Collated view is rebuilt on import

## Scripts

```bash
npm run dev
npm run test
npm run build
```

## Docs

`PROJECT_FILE_MAP.md` · `KNOWN_ISSUES.md` · `TEST_CHECKLIST.md` · `HANDOFF.md`
