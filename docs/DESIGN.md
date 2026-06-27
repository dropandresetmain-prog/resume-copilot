---
name: Folio
colors:
  surface: '#fcf9f5'
  surface-dim: '#dcdad6'
  surface-bright: '#fcf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ef'
  surface-container: '#f0edea'
  surface-container-high: '#ebe8e4'
  surface-container-highest: '#e5e2de'
  on-surface: '#1c1c1a'
  on-surface-variant: '#3f4944'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f3f0ec'
  outline: '#6f7973'
  outline-variant: '#bec9c2'
  surface-tint: '#166b50'
  primary: '#016147'
  on-primary: '#ffffff'
  primary-container: '#2a7a5e'
  on-primary-container: '#b7ffdf'
  inverse-primary: '#88d6b5'
  secondary: '#9a4523'
  on-secondary: '#ffffff'
  secondary-container: '#ff946c'
  on-secondary-container: '#772b0a'
  tertiary: '#1f5f4f'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a7867'
  on-tertiary-container: '#bdfee8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a4f3d0'
  primary-fixed-dim: '#88d6b5'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#7b2f0e'
  tertiary-fixed: '#b0efdb'
  tertiary-fixed-dim: '#94d3bf'
  on-tertiary-fixed: '#002019'
  on-tertiary-fixed-variant: '#095041'
  background: '#fcf9f5'
  on-background: '#1c1c1a'
  surface-variant: '#e5e2de'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  section-heading:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.7'
    letterSpacing: '0'
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 220px
  content_max_width: 860px
  container_padding: 40px
  card_padding: 16px
  stack_gap: 12px
  section_gap: 32px
---

## Brand & Style
The design system is built on the philosophy of "Craft meets Linear." It moves away from sterile, corporate aesthetics toward a warm, human-centric interface that feels considered and purposeful. It targets modern professionals who value intentionality in their career tools.

The visual style is **Minimalist-Tactile**. It eschews modern trends like heavy gradients and shadows in favor of flat surfaces, crisp hairlines, and a sophisticated, organic color palette. The emotional response is one of calm productivity—clean and highly organized, yet soft and approachable. The interface uses a "light-first" approach for focus areas, anchored by a deep, grounding sidebar.

## Colors
The palette is inspired by natural, earthy tones. The primary "Forest" and "Teal" tones provide a stable professional foundation, while "Terracotta" serves as a warm, high-visibility accent for growth-oriented actions.

Color is applied flatly. Depth is achieved through shifts in hue and hairline borders rather than luminosity or shadow. Surfaces use "washes" of color (Sage and Terracotta tints) to group related information without adding visual weight.

## Typography
This design system utilizes **Inter** for its neutral, highly legible character. To reinforce the "human and considered" brand personality, the system strictly enforces **Sentence case** for all UI elements, including headers and buttons. This reduces visual noise and creates a more conversational tone.

Line heights are intentionally generous (1.7 for body text) to promote readability and provide a sense of "air" within data-heavy career documents.

## Layout & Spacing
The layout uses a **Fixed-Fluid hybrid model**. A permanent 220px left sidebar anchors the navigation, while the main content area is capped at a readable 860px max-width and centered. This prevents line lengths from becoming too long on ultra-wide monitors and mimics the feel of a physical "folio" or document.

Vertical rhythm is driven by a 4px baseline, with standard increments of 8px, 16px, and 32px for grouping. Generous whitespace around the central container is mandatory to maintain the "considered" aesthetic.

## Elevation & Depth
This design system rejects the use of shadows and blurs. Depth is purely structural:
- **Tonal Layering:** The sidebar occupies the lowest visual plane in deep Forest. The page background sits above it in a soft Green Wash.
- **Surface Definition:** Cards and interactive containers are defined by 0.5px hair-line borders in slightly darker tints of the background color. 
- **Active States:** Instead of "lifting" an element with shadow, active states are indicated by subtle background color shifts (e.g., White to Sage Tint) or border weight/color changes.

## Shapes
The shape language is "Soft-Modern." We use a tiered rounding system to differentiate between structural and interactive elements:
- **Cards & Containers:** 12px radius creates a friendly, framed appearance for content blocks.
- **Controls (Inputs/Buttons):** 8px radius provides a tighter, more precise feel for interactive touchpoints.
- **Badges/Pills:** Full 999px radius for status indicators to distinguish them from actionable buttons.

## Components
- **Buttons:** Three distinct tiers.
    - *Primary:* Solid Teal (#2A7A5E) with white text. 
    - *CTA:* Solid Terracotta (#B85C38) with white text for "Add" or "Export" actions.
    - *Ghost:* Transparent background with a Muted Green (#B0CCBA) border and Primary text.
- **Cards:** White background with a 0.5px Sage border (#D8ECC8). No shadow. 16px internal padding.
- **Badges:** Pill-shaped. Must use the specific status palette provided in the Colors section. Text and border colors are high-contrast versions of the tint background.
- **Input Fields:** 8px radius, White background, Text Muted for placeholders. Focus state uses a 1px Primary Teal border.
- **Sidebar Items:** Clear text on the dark Forest background. Active states should use a subtle opacity shift or a small left-aligned Teal "accent" bar.
- **Lists:** Flat, separated by 0.5px horizontal rules in the Text Muted color at 20% opacity.