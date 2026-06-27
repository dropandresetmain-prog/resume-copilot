# Folio design tokens

Source of truth: **`src/app/globals.css`** — `@theme inline` block (Tailwind CSS v4).

## Rules

1. **No hardcoded hex in components** — use `bg-folio-*`, `text-folio-*`, `border-folio-*`, or `var(--color-folio-*)` in inline styles when necessary.
2. **Add new colours to `@theme inline` first**, then reference via Tailwind utility classes.
3. **Typography** — `font-sans` resolves to Inter (loaded in `globals.css`).
4. **Layout constants** — sidebar width and content max width are tokens, not magic numbers in new code.

## Naming convention

Pattern: `--color-folio-{role}` → Tailwind class `bg-folio-{role}`, `text-folio-{role}`, etc.

Roles follow Material-inspired semantics adapted for Folio:

| Suffix | Meaning |
|--------|---------|
| `primary` | Brand green (text/icons on light surfaces) |
| `primary-container` | Teal accent — buttons, progress bars, active accents |
| `sidebar` | Forest green sidebar background |
| `secondary` / `secondary-container` | Warm accent pair (LinkedIn / secondary actions) |
| `surface*` | Background layers (page, cards, dim, container variants) |
| `on-surface` / `on-surface-variant` | Primary and secondary text |
| `outline` / `outline-variant` | Muted text, borders, placeholders |
| `cta` / `cta-hover` / `cta-secondary` | Terracotta primary actions |
| `error` | Destructive / validation errors |
| `warning-*` | Warning banners and surfaces |
| `sage-border`, `mint-surface`, `olive-*` | Grove palette accents for cards and chips |

## Colour reference

### Brand & chrome

| Token | Hex | Typical use |
|-------|-----|-------------|
| `folio-sidebar` | `#085041` | Left nav background |
| `folio-primary` | `#016147` | Brand mark, strong green text |
| `folio-primary-container` | `#2A7A5E` | Primary buttons, vault health bar, "+ Add experience" |
| `folio-cta` | `#B85C38` | Main call-to-action (Generate, onboarding) |
| `folio-cta-hover` | `#A34F2F` | CTA hover state |
| `folio-cta-secondary` | `#9A4523` | Secondary warm actions |

### Surfaces & text

| Token | Hex | Typical use |
|-------|-----|-------------|
| `folio-background` | `#FAFDF7` | App canvas, `html`/`body` |
| `folio-surface` | `#FCF9F5` | Onboarding / marketing panels |
| `folio-surface-dim` | `#DCDAD6` | Progress track backgrounds |
| `folio-surface-container-low` | `#F6F3EF` | Hover states on white FABs |
| `folio-surface-container` | `#F0EDEA` | Chips, table zebra, icon wells |
| `folio-surface-container-high` | `#EBE8E4` | Elevated surface variant |
| `folio-on-surface` | `#1C1C1A` | Headings, body text |
| `folio-on-surface-variant` | `#3F4944` | Secondary body text |
| `folio-outline` | `#6F7973` | Captions, placeholders, icons |
| `folio-outline-variant` | `#BEC9C2` | Input borders, dashed empty states |

### Grove accents

| Token | Hex | Typical use |
|-------|-----|-------------|
| `folio-sage-border` | `#D8ECC8` | Card borders, tab underlines |
| `folio-mint-surface` | `#EAF3DE` | Company avatar wells |
| `folio-surface-teal-ghost` | `#F0FAF6` | Subtle teal tint backgrounds |
| `folio-surface-warm-white` | `#F1EFE8` | Warm panel backgrounds |
| `folio-olive-text` | `#3B6D11` | Positive / success chip text |
| `folio-olive-border` | `#C0DD97` | Success chip borders |

### Semantic

| Token | Hex | Typical use |
|-------|-----|-------------|
| `folio-error` | `#BA1A1A` | Form errors |
| `folio-warning-surface` | `#FDF4E6` | Warning banner background |
| `folio-warning-border` | `#F5D9B0` | Warning banner border |

## Spacing & layout

| Token | Value | Use |
|-------|-------|-----|
| `--spacing-sidebar` | `220px` | Sidebar width; content `ml-[220px]` in `AppShell` |
| `--spacing-content-max` | `860px` | Max width for vault/editor content columns |
| `--spacing-container` | `40px` | Main horizontal padding (`px-10` ≈ 40px) |

Prefer `max-w-[860px]` or a future `max-w-folio-content` utility if added — stay consistent with vault/editor pages.

## Radius

| Token | Value |
|-------|-------|
| `radius-sm` | `0.25rem` |
| `radius-md` | `0.75rem` |
| `radius-lg` | `1rem` |
| `radius-xl` | `1.5rem` |
| `radius-full` | `9999px` |

Cards commonly use `rounded-xl`; buttons `rounded-lg` or `rounded-[8px]` on onboarding.

## Usage examples

```tsx
// Page canvas (already on root layout)
<div className="min-h-screen bg-folio-background">

// Primary action
<button className="bg-folio-primary-container text-white hover:opacity-90">

// Card
<div className="rounded-xl border border-folio-sage-border bg-white">

// Muted caption
<p className="text-sm text-folio-outline">

// CTA (Generate, onboarding continue)
<button className="bg-folio-cta text-white hover:bg-folio-cta-hover">
```

## Dialog / modal styling

`src/components/ui/dialog.tsx` uses Folio tokens on overlay, content border (`folio-sage-border`), and close button (`folio-outline`). New modals should compose from this component rather than bespoke overlays.

## Auditing for stragglers

Search for hex in `src/`:

```bash
rg "#[0-9A-Fa-f]{3,8}" src/ --glob "*.tsx" --glob "*.ts"
```

Legitimate exceptions: `globals.css` token definitions, PDF/export HTML generators that require literal colours for print, and third-party embeds.
