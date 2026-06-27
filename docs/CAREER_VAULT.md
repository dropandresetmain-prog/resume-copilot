# Career Vault

Route: **`/inventory`** → `CareerVaultPageClient` (`src/components/pages/CareerVaultPageClient.tsx`).

Nav label: **Career vault**. This is the primary surface for viewing collated inventory, uploading resumes, and adding experience from pasted text.

Legacy **`InventoryPageClient`** remains in the repo for reference but is not mounted on any route.

## Page structure

1. **Header** — title + **Add experience** (opens text extraction flow)
2. **Vault health** — completeness meter from resume/work/education/skills counts
3. **Tabs** — Work experience, Skills, Education, Additional
4. **FAB stack** (bottom-right, fixed) — Import from resume, Paste career text
5. **Panels** — inline extraction panel; import via Radix `Dialog` + `UploadCard`

## "Used in N applications" data flow

Per-experience counts on work cards show how often source resumes backing that experience appear in generated applications.

```
ParsedResume (upload)
  └─ collated experiences with sourceCitations[].resumeId
       │
       ▼
fetchResumeApplicationCountsFromCloud()
  queries generated_resume_drafts
  WHERE reference_resume_id IS NOT NULL
    AND application_id IS NOT NULL
  counts DISTINCT application_id per reference_resume_id
       │
       ▼
Map<resumeId, count>  (loaded once on mount in CareerVaultPageClient)
       │
       ▼
For each CollatedExperience:
  expAppCount = sum over exp.sourceCitations of map.get(cite.resumeId)
  display: "Used in N applications" | "Not used in active apps"
```

### Load-bearing fields

| Field | Table / type | Role |
|-------|--------------|------|
| `sourceCitations[].resumeId` | `CollatedExperience` / parsed inventory | Links experience bullets to uploaded resume IDs |
| `reference_resume_id` | `generated_resume_drafts` | Which base resume was used for generation |
| `application_id` | `generated_resume_drafts` | Which application record owns the draft |

**Risk:** Schema or generation changes that drop `reference_resume_id` or break citation linkage will zero out counts silently. Any migration touching `generated_resume_drafts` must preserve this chain.

### Implementation

- Query: `fetchResumeApplicationCountsFromCloud()` in `src/lib/supabase/generated-resume-drafts.ts`
- UI: `useEffect` on mount in `CareerVaultPageClient`; failures are non-critical (counts stay at zero)
- Aggregation: sum across all citations on an experience (an experience cited from two resumes adds both resumes' application counts)

## Panel & modal trigger pattern

Reference for future features: **FAB or header button → React state → panel or Dialog**.

### Pattern A — Inline panel (text extraction)

Used for multi-step flows that stay in page context.

```tsx
const [extractionPanelOpen, setExtractionPanelOpen] = useState(false);

// Trigger (header button or FAB)
<button onClick={() => setExtractionPanelOpen(true)}>Add experience</button>

// Render below content when open
{extractionPanelOpen && (
  <InventoryTextExtractionPanel
    isOpen={extractionPanelOpen}
    onOpenChange={setExtractionPanelOpen}
    collated={collated}
    draftEdits={draftEdits}
    onDraftEditsChange={setDraftEdits}
    onSaveApplied={async (edits, enrichment) => {
      await handleSaveInventoryEdits(edits, { enrichment });
    }}
    // ...
  />
)}
```

`InventoryTextExtractionPanel` owns extract → review → apply; parent owns `InventoryEdits` draft state and persists via `handleSaveInventoryEdits` from `WorkspaceProvider`.

### Pattern B — Dialog modal (file import)

Used for focused single-action flows (upload).

```tsx
const [importPanelOpen, setImportPanelOpen] = useState(false);

<button onClick={() => setImportPanelOpen(true)}>Import from resume</button>

<Dialog open={importPanelOpen} onOpenChange={setImportPanelOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Import from resume</DialogTitle>
    </DialogHeader>
    <UploadCard
      onFilesSelected={(files) => {
        handleFilesSelected(files);
        setImportPanelOpen(false);
      }}
      isProcessing={isProcessing}
    />
  </DialogContent>
</Dialog>
```

Dialog component: `src/components/ui/dialog.tsx` (Radix UI, `@radix-ui/react-dialog`).

### Triggers on Career Vault

| UI control | State | Surface |
|------------|-------|---------|
| Header **Add experience** | `extractionPanelOpen` | `InventoryTextExtractionPanel` (inline) |
| FAB **Paste career text** | `extractionPanelOpen` | Same panel |
| FAB **Import from resume** | `importPanelOpen` | `Dialog` + `UploadCard` |

### Workspace integration

All vault mutations go through **`useWorkspace()`**:

| Handler | Purpose |
|---------|---------|
| `handleFilesSelected` | Parse DOCX, upsert inventory |
| `handleSaveInventoryEdits` | Persist overlay edits (+ optional enrichment) |
| `handleClearResumeInventory` | Clear uploads (UploadCard) |
| `collated`, `inventory`, `totals` | Read models for display |

## Related modules

| Module | Role |
|--------|------|
| `src/components/setup/InventoryTextExtractionPanel.tsx` | Paste → AI extract → apply suggestions |
| `src/components/setup/UploadCard.tsx` | DOCX dropzone |
| `src/lib/inventory/edits.ts` | Hide/edit bullet overlay helpers |
| `src/lib/inventory/collation.ts` | Build `collated` view from parsed resumes |
| `src/lib/supabase/resume-inventories.ts` | Cloud persistence |

## Inventory overlay (unchanged semantics)

Career Vault edits use the same **`InventoryEdits`** overlay as pre-redesign Inventory — source resumes are never mutated. See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for project routing, duplicate cleanup, and CRUD limitations.
