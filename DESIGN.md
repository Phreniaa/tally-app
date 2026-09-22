---
name: Tally
description: A private, local-first habit log designed like a calm daily ledger.
colors:
  ground: "#E9ECE6"
  sheet: "#F7F8F4"
  sheet-raised: "#FFFFFF"
  ink: "#171B16"
  ink-secondary: "#4C5348"
  ink-muted: "#7E8579"
  rule: "#D6DACF"
  rule-strong: "#C3C9BA"
  accent-moss: "#2E5545"
  accent-moss-hover: "#3F7159"
  accent-wash: "#DEE7DF"
  warning: "#9C4230"
  warning-wash: "#F0DFDA"
  rest: "#4A6E86"
  rest-wash: "#DCE6EC"
  note: "#F7E8B8"
  note-rule: "#C9A961"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.45
  data:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.15
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-moss}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "34px"
    padding: "0 13px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "34px"
    padding: "0 13px"
  surface:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.sm}"
    height: "27px"
    padding: "0 11px"
---

# Design System: Tally

## Overview

**Creative North Star: "The Quiet Logbook"**

Tally is a private habit log, not a performance dashboard. Its visual language borrows from a well-used daily ledger: clear ruled divisions, measured numbers, a small set of meaningful marks, and enough warmth to make returning feel easy. The interface is intentionally quiet so the act of recording remains the focus.

The system is restrained and operational. It uses a pale ground, paper-like sheets, dark text, one configurable accent, and compact controls. Density is comfortable by default and can become compact for frequent use. The product supports light, warm, dark, and dim themes without changing its underlying hierarchy.

**Key Characteristics:**
- Local-first, private, and calm
- Ruled ledger structure instead of dashboard chrome
- Semantic color for completion, rest, notes, and warnings
- Compact, tabular data presentation

## Colors

The palette is built from quiet neutrals with a single configurable accent. Color carries state and emphasis rather than decoration.

### Primary
- **Moss:** #2E5545. The default action color, used for completion, primary actions, focus emphasis, and selected states.
- **Moss Hover:** #3F7159. The responsive state for primary controls.

### Secondary
- **Rest Blue:** #4A6E86. Identifies intentional rest days without implying failure.
- **Warning Clay:** #9C4230. Reserved for destructive actions and warnings.

### Neutral
- **Ledger Ground:** #E9ECE6. The page-level background.
- **Ledger Sheet:** #F7F8F4. The main reading and input surface.
- **Raised Sheet:** #FFFFFF. The highest light-theme surface for controls and active fields.
- **Ink:** #171B16. Primary text and strong selected controls.
- **Secondary Ink:** #4C5348. Supporting text and labels.
- **Muted Ink:** #7E8579. Metadata, hints, and inactive navigation.
- **Rule:** #D6DACF. Standard dividers and borders.
- **Strong Rule:** #C3C9BA. Control borders and stronger separators.
- **Note Paper:** #F7E8B8. User-authored notes, with #C9A961 as the rule accent.

### Named Rules
**The State-First Color Rule.** Use saturated color to communicate completion, rest, warnings, or the current action. Do not scatter accent color as ornament.

## Typography

**Display Font:** System sans stack (`ui-sans-serif`, system-ui, Segoe UI, Roboto)
**Body Font:** The same system sans stack
**Label/Mono Font:** System monospace stack for counts, metrics, and measured values

**Character:** Neutral, legible, and utilitarian. Sans-serif text keeps the log easy to scan, while tabular monospace numerals make counts and statistics feel dependable without turning the interface into a technical console.

### Hierarchy
- **Display** (600, 34px, 1): The daily completion count.
- **Title** (600, 21px, 1.25): The Tally wordmark and primary modal titles.
- **Row title** (500, 15.5px, 1.25): Habit names and list-level identity.
- **Body** (400, 15px, 1.5): Default interface copy and form content.
- **Label** (500, 12.5px, 1.45): Filters, metadata, field labels, and supporting controls.
- **Data** (600, 15px, 1.15): Counts, stepper values, and ranking values.

### Named Rules
**The Ledger Hierarchy Rule.** Use weight, spacing, and tabular numerals to establish hierarchy; do not use oversized marketing typography or decorative display faces.

## Layout

The main shell is centered at a maximum width of 980px with 16px horizontal padding on larger screens and 12px on small screens. The masthead establishes the current date and global tools, followed by a horizontally scrollable view tab bar and one active work surface.

The daily view leads with the completion count, then filters, then the habit ledger. Rows use a three-column grid: a 1px habit-color rail, flexible content, and right-aligned completion controls. Sheets and stat panels use a 1px ruled grid rather than floating card stacks.

The spacing rhythm is based on 4px increments, with 8px and 16px as the most common control and block spacing. Comfortable density uses 14px row padding; compact density reduces row and modal spacing for high-frequency use. At 720px the tool row can wrap, and at 480px search fields and toolbar controls become full width. Touch layouts enlarge grid cells and preserve 40px completion controls.

## Elevation & Depth

Tally is flat by default. Depth comes from tonal surface changes, borders, and the separation between the page ground and ledger sheets. A single soft offset shadow is reserved for overlays such as dialogs and toasts. Focus uses an accent wash ring rather than a shadowed glow.

### Shadow Vocabulary
- **Overlay:** `0 18px 40px -24px rgba(23, 27, 22, .45)` in light themes; a darker equivalent in dark themes. Use only for modals and transient toasts.

### Named Rules
**The Ruled-Surface Rule.** Prefer a border or tonal change over a floating shadow. Surfaces should feel placed on a page, not suspended above it.

## Shapes

The form language is lightly rounded and document-like: 4px for compact controls, 6px for sheets and buttons, and 8px for larger dialogs. Borders are 1px and semantic. Sheets clip their rows so the outer corners remain clean. Pills use small rectangular radii or a compact status capsule only when the content is a status.

Controls maintain visible keyboard focus with a 2px accent outline and offset. Completion controls are square-ish 40px targets with a 5–6px radius, making their state legible as a mark in the ledger.

## Components

### Buttons
- **Shape:** Lightly rounded, usually 6px, with compact horizontal padding.
- **Primary:** Moss background with sheet-colored text; 34px minimum height and an optional icon.
- **Secondary:** Sheet background with a strong rule border and ink text.
- **Danger:** Ink or sheet background with warning-colored text; warning wash on hover.
- **Hover / Focus:** Slight tonal shift, stronger border, and the shared visible focus outline. Active controls move down 1px; no decorative bounce.

### Tabs
- **Style:** Text-first navigation on a ruled baseline.
- **State:** Inactive tabs use muted ink; the selected tab uses primary ink, semibold weight, and a 2px accent underline. The tab bar remains visible while scrolling.

### Filters and Chips
- **Style:** Compact 27px controls with transparent resting backgrounds.
- **State:** Selected filters use ink background and ground-colored text. Hover adds a sheet surface without introducing a new accent.

### Cards / Containers
- **Style:** `.sheet`, `.panel`, and `.figure` use sheet backgrounds, 1px rules, and 6px corners.
- **Behavior:** Containers organize ledger content; they are not used as decorative nested cards.

### Habit Rows
- **Style:** A ruled list row with a 1px habit-color rail, flexible title/meta content, and a right-side check or numeric stepper.
- **State:** Hover raises the row tonally to the raised sheet. Completed rows mute and strike the title. Rest rows use the semantic rest-blue treatment.

### Forms and Dialogs
- **Style:** Dialogs use a ruled header and footer, sheet background, 8px corners, and constrained width. Inputs use raised-sheet backgrounds and strong rule borders.
- **Behavior:** Advanced habit options stay collapsed until requested. Dialogs preserve protected focus and provide explicit Cancel/Save actions.

### Notes and Feedback
- **Notes:** User-authored notes use a warm note-paper surface and a 1px rule accent, with italic text to distinguish reflection from status.
- **Toasts:** Short-lived confirmations use an ink surface, ground-colored text, and the overlay shadow. They never replace a persistent error message.

## Do's and Don'ts

### Do
- Keep the page calm, ruled, and scan-friendly.
- Use the accent for meaningful actions and state.
- Preserve the distinction between done, partially logged, rest, missed, and unscheduled.
- Keep counts and measured values tabular and easy to compare.
- Support light, warm, dark, dim, comfortable, and compact modes through the same hierarchy.
- Preserve keyboard focus, 40px completion targets, and full-width mobile search controls.

### Don't
- Don't turn the log into a dashboard of floating cards or decorative charts.
- Don't use gradients, glass effects, or strong shadows as visual personality.
- Don't use monospace for ordinary prose.
- Don't use warning colors for ordinary incomplete habits.
- Don't replace the ledger's ruled structure with large hero areas or oversized promotional type.
- Don't introduce a new color without assigning it a semantic state or documenting its theme behavior.
