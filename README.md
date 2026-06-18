# Career Resume Copilot

Milestone 1: upload DOCX resumes, inspect per-resume parsing, and work from a **collated inventory** across all uploaded resumes.

Parsing uses a layered architecture: generic section detection → generic extraction with confidence scoring → format-specific profiles (your two-line column layout is the first profile) → unparsed fallbacks when confidence is low.

## What this project does

- Parses `.docx` resumes in the browser (original files are not stored)
- **Collated Inventory** (default view): merged work experience, structured education (institution → programmes → dates → bullets), additional experience items, and individual skills with source citations
- **Source Resumes / Debug**: per-resume parsed output for parser inspection
- Persists parsed JSON in `localStorage` and supports export/import for cross-device transfer

## Views

| View | Purpose |
|------|---------|
| Collated Inventory | Main working view — reusable items merged across resumes |
| Source Resumes / Debug | Per-resume parser output with raw expandable fields |

## Data handling

- Parsed resumes are the source of truth
- Collated inventory is **derived** on load (not duplicated in export)
- Export JSON contains parsed resumes; collated view is rebuilt on import

## Scripts

```bash
npm run dev
npm run test
npm run build
```

## Docs

`PROJECT_FILE_MAP.md` · `KNOWN_ISSUES.md` · `TEST_CHECKLIST.md` · `HANDOFF.md`
