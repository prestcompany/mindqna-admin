# DESIGN.md — mindqna-admin

## Overview

The admin is an exercise in subtraction. The page is a near-white sheet (`{colors.canvas}` — #fafafa) carrying near-black ink (`{colors.ink}` — #171717), and almost nothing else competes. Headings, body copy, primary buttons, and the thin 1px borders that define every card all draw from the same ink-and-grey ladder. Every grey is chromatically neutral — saturation zero. There is no blue-tinted slate anywhere.

Typography does the heavy lifting. Display type is tightly tracked at weight 600; hierarchy comes from weight and lightness (`{colors.ink}` vs `{colors.body}`), never from color. Numbers are always tabular so columns don't jitter. Color exists only as a signal — a status dot, a currency direction, a category tag — never as chrome.

Surfaces barely lift. White cards sit on the #fafafa canvas separated by a 1px hairline (`{colors.hairline}` — #ebebeb) and **no shadow at all**; the lightness step between canvas and card does the separating. Shadow is reserved for things that genuinely float — menus, modals, tooltips. Buttons, inputs, badges, and checkboxes are flat. The page reads like a spec sheet that happens to be an application — engineered, exact, dense, and confident enough to let a hairline carry the structure.

**Key Characteristics:**
- A single near-black ink (`{colors.ink}`) carries headings, body, primary actions, and borders on a near-white canvas (`{colors.canvas}`) — near-zero chromatic chrome.
- All greys are pure neutral (saturation 0). Blue-tinted greys are forbidden.
- Static surfaces get a 1px hairline and **zero shadow**; only floating surfaces (menu, modal, tooltip) carry elevation.
- Two radii by context: tight 6px squares (`{rounded.control}`) for buttons/inputs/badges, 12px (`{rounded.card}`) for cards and tables. Pills are for filter chips only.
- Tightly-tracked display type (`{typography.display}` at -1.28px); weight is binary — 600 headings, 500 labels/buttons, 400 everything else.
- Color is a signal, not a surface: status uses a dot + label, categories use soft 50/700 pairs, currency direction uses rose/emerald.
- Numbers are always `tabular-nums` and chromatically neutral.

---

## Colors

### Brand & Accent
- **Ink** (`{colors.primary}` / `{colors.ink}` — #171717): the defining near-black. Headings, primary button fill, and the darkest text tier. Paired with `{colors.on-primary}` (#ffffff).
- **Link Blue** (`{colors.link}` — #0070f3): links, focus rings, and the info signal. Press tone `{colors.link-deep}` (#0761d1), pale wash `{colors.link-soft}` (#d3e5ff).
- **Violet** (`{colors.violet}` — #7928ca), **Cyan** (`{colors.cyan}` — #50e3c2), **Pink** (`{colors.pink}` — #ff0080), **Magenta** (`{colors.magenta}` — #eb367f): the chromatic family. Charts and illustration accents only — never chrome fills.

### Surface
- **Canvas** (`{colors.canvas}` — #fafafa): the page background. Every white card floats on this.
- **Elevated** (`{colors.canvas-elevated}` — #ffffff): cards, tables, inputs, code blocks.
- **Hairline-Soft** (`{colors.hairline-soft}` — #f2f2f2): inset wells, muted fills, alternating panels.

### Text
- **Ink** (`{colors.ink}` — #171717): headings, primary values, high-emphasis text. 16.9:1 on canvas.
- **Body** (`{colors.body}` — #4d4d4d): paragraphs, secondary copy, labels, nav. 8.1:1.
- **Caption** (`{colors.caption}` — #737373): captions and metadata. 4.54:1 — **the floor for any text**.
- **Mute** (`{colors.mute}` — #8f8f8f): 3.1:1 — icons, dividers, decoration. **Never text.**
- **Faint** (`{colors.faint}` — #a1a1a1): placeholders and disabled labels only.

### Borders
- **Hairline** (`{colors.hairline}` — #ebebeb): the 1px border on every card, table, input, and divider — the structural workhorse. Single value; no opacity variants.

### Semantic
- **Error** (`{colors.error}` — #ee0000): destructive actions and validation, with press tier `{colors.error-deep}` (#c50000).
- **Success** (`{colors.success}` — emerald): positive state. *Diverges from Vercel, which maps success to link blue — this product must distinguish grant from charge by hue.*
- **Warning** (`{colors.warning}` — #f5a623): caution states.
- **Info** (`{colors.info}`) maps to `{colors.link}` (#0070f3).

### Data Semantics
Color carrying meaning about the data itself, not the chrome:
- **Currency direction**: spend/deduct = rose-600, grant/earn = emerald-600. Always paired with a `+`/`−` sign.
- **Currency kind**: heart = rose family, star = amber family.
- **Recency**: within 7 days = success tone, within 30 days = warning tone, older = neutral.
- **Zero and empty values are neutral** (`{colors.caption}`) — never red.

### Brand Gradient
Three two-stop gradients, for charts and illustration washes only:
- **Develop**: `{colors.gradient-develop-start}` (#007cf0) → `{colors.gradient-develop-end}` (#00dfd8)
- **Preview**: `{colors.gradient-preview-start}` (#7928ca) → `{colors.gradient-preview-end}` (#ff0080)
- **Ship**: `{colors.gradient-ship-start}` (#ff4d4d) → `{colors.gradient-ship-end}` (#f9cb28)

---

## Typography

### Font Family
**Pretendard** sets all UI and prose — Latin and Korean alike. Geist Sans is the reference family for this system but carries no Korean glyphs, so Pretendard stands in; keep the tracking and weight rules below and the result reads the same. **JetBrains Mono** sets code, IDs, transaction hashes, and uppercase section eyebrows (Geist Mono is an equivalent substitute). No third face. No italic.

### Hierarchy

| Token | Size | Weight | Letter Spacing | Use |
|---|---|---|---|---|
| `{typography.display}` | 24px | 600 | -1.28px | Page titles, large KPI values |
| `{typography.heading}` | 16px | 600 | -0.4px | Section and card headings |
| `{typography.label}` | 14px | 500 | -0.28px | Field labels, nav emphasis, button text |
| `{typography.body}` | 15px | 400 | 0 | Default body (root size) |
| `{typography.body-sm}` | 14px | 400 | 0 | Table cells, dense body |
| `{typography.caption}` | 12px | 400 | 0 | Captions, metadata, table headers |
| `{typography.mono-eyebrow}` | 12px | 500 | wide, uppercase | Section eyebrow labels (mono) |
| `{typography.code}` | 14px | 400 | 0 | Code, IDs, transaction values (mono) |

### Principles
- Display type is defined by tight negative tracking — the larger the heading, the tighter. Body type sits at neutral spacing.
- Weight is binary: 600 for headings, 500 for buttons and labels, 400 for everything else. No light, no black, no italic.
- The scale is fixed at five steps — 12 / 14 / 15 / 16 / 24+. Arbitrary sizes (`text-[Npx]`) are forbidden.
- **Floors**: data values and body never below 14px; captions and labels never below 12px.
- **Never stack small size with low contrast**: 12px text requires `{colors.body}` or darker.
- Mono has two roles only: code/IDs, and the uppercase eyebrow that opens a section.
- Numbers are always `tabular-nums` and chromatically neutral.
- Korean glyphs are denser than Latin at the same pixel size — apply one step larger than a Latin-based reference would suggest.

---

## Layout

### Spacing System
- **Base unit**: 4px. Scale: 4 → 8 → 12 → 16 → 24 → 32 → 40 → 64 → 96 → 128px.
- **Tokens**: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.2xl}` 40 · `{spacing.3xl}` 64 · `{spacing.4xl}` 96 · `{spacing.section}` 128.
- **Card interiors** run `{spacing.md}`–`{spacing.lg}` (16–24px); dense tables use 8px row padding for a ~36px row.
- **20px is off-scale** — never use it.

### Grid & Container
- Centered max-width container at 1600px with `{spacing.md}` gutters (`{spacing.xl}` at desktop).
- KPI grids expand stepwise with viewport (2-up → 3-up → 6-up). Never overcrowd a narrow column.
- Detail views open in a right-side sheet rather than a page transition.

### Responsive

| Name | Width | Key Changes |
|---|---|---|
| Mobile | ≤ 640px | Single-column stacks; sidebar → menu trigger; filter controls wrap full-width |
| Tablet | 768px | 2-up card grids; condensed toolbar |
| Laptop | 1024px | 3-up grids; full toolbar row |
| Desktop | 1600px | Centered max-width container, full multi-column grids |

Wide tables scroll horizontally inside their own container with sticky action columns; the page body never scrolls sideways.

---

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| **0 — Flat** | 1px hairline (`{colors.hairline}`), **no shadow** | **The default.** Cards, tables, inputs, buttons, badges, toolbars, dividers |
| 1 — Whisper | `0 1px 1px rgba(0,0,0,0.04)` | Switch knob, active tab |
| 2 — Floating | `0 2px 2px rgba(0,0,0,0.04), 0 8px 16px -4px rgba(0,0,0,0.06)` | Menus, modals, sheets, tooltips, toasts |

Depth is deliberately minimal. **Never put a visible border and a drop shadow on the same static surface** — the canvas-to-card lightness step plus a hairline is the separation. There is no 5-step shadow scale; anything heavier than Level 2 does not exist.

A functional exception: horizontally scrolled tables use a low-alpha neutral edge shadow on sticky columns to signal overflow. That is an affordance, not elevation.

---

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.micro}` | 4px | Checkboxes, micro controls |
| `{rounded.control}` | 6px | Buttons, inputs, selects, badges |
| `{rounded.card}` | 12px | Cards, table containers, code blocks |
| `{rounded.panel}` | 16px | Large panels, sheets |
| `{rounded.pill}` | 100px | Filter chips, category tabs |
| `{rounded.full}` | 9999px | Avatars, circular icon buttons |

The radius language is bimodal: tight 6px squares for functional chrome, 12px for content surfaces. Pills are reserved for removable filter chips — this product has no marketing CTA, so it has no pill buttons.

### Geometry
Cards and tables are rectangles at 12px. Controls are 6px squares. Avatars and status dots are circular. Iconography is line-weight vector (lucide) in ink or mute — **never emoji**.

---

## Motion

| Token | Value | Use |
|---|---|---|
| `{motion.fast}` | 120ms | Hover and press color/opacity, table row hover |
| `{motion.base}` | 160ms | Popover, dropdown, tooltip fade + scale |
| `{motion.slow}` | 200ms | Sheet and modal enter |
| `{motion.exit}` | 140ms | Sheet and modal exit — always shorter than enter |

Easing: enter `ease-out`, exit `ease-in`. `prefers-reduced-motion` is respected globally. Arbitrary durations are forbidden. Avoid scale-on-hover that shifts layout.

---

## Components

### Navigation

**`sidebar`** — persistent left navigation
- Background `{colors.canvas}`, right hairline, links at `{typography.body-sm}` in `{colors.body}`. Active item takes a tinted primary wash with a ring, no shadow.

**`header`** — sticky top bar
- Background `{colors.canvas}` with blur, bottom hairline, height 64px. Holds breadcrumb, command-palette trigger, and account menu.

**`page-header`** — title block
- White card, hairline, `{rounded.card}`, padding `{spacing.lg} {spacing.md}`, **no shadow**. Title at `{typography.display}`; optional description at `{typography.body-sm}` in `{colors.body}`; actions right-aligned.

### Buttons

All buttons are 6px squares (`{rounded.control}`) and **flat** — no shadow, ever.

**`button-primary`** — the ink action ("추가", "저장")
- Background `{colors.primary}`, text `{colors.on-primary}`, `{typography.label}`, height 32px in toolbars / 36px for standalone primary actions.

**`button-secondary`** — white outline action
- Background `{colors.canvas-elevated}`, 1px hairline, text `{colors.ink}`, same metrics as primary.

**`button-ghost`** — transparent utility action
- No border or fill until hover, which takes the `{colors.hairline-soft}` wash.

**`button-destructive`** — irreversible action
- Background `{colors.error}`, text `{colors.on-primary}`. Always behind a confirm dialog.

### Inputs & Forms

**`text-input`** — default field
- Background `{colors.canvas-elevated}`, 1px hairline, ink text, `{rounded.control}`, height 36px (32px in toolbars), no shadow. Focus shows a `{colors.link}` ring.

**`select`** — dropdown trigger
- Same chrome as `text-input`. The menu is a Level-2 floating surface.

**`form-section`** — grouped field block
- White card, hairline, `{rounded.card}`, no shadow. Optional header row separated by a hairline; padding `{spacing.lg} {spacing.md}`.

Validation is schema-driven; errors render below the field in `{colors.error}` with text, never color alone.

### Data Display

**`data-table`** — the canonical list surface
- White card, 1px hairline, `{rounded.card}`, **no shadow**. Header row 36px with `{typography.caption}` labels in `{colors.body}`, lowercase preserved. Body rows ~36px with 8px vertical padding, cells at `{typography.body-sm}` with `tabular-nums`. Long text truncates with a tooltip. Row hover takes `{colors.canvas}`. Action column sticks right.

**`filter-bar`** — the list toolbar
- **Flat, not a card** — no border, no fill, vertical padding `{spacing.sm}`. All controls 32px tall. Primary action right-aligned via a flex spacer. Active filters render below as removable chips.

**`filter-chip`** — active filter token
- White fill, hairline, `{rounded.pill}`, `{typography.caption}` in `{colors.body}`, with a 24px circular remove button.

**`kpi-tile`** — metric card
- White card, hairline, no shadow. Label at `{typography.label}` in `{colors.body}`; value at `{typography.display}` with `tabular-nums`, chromatically neutral unless the metric itself carries meaning.

**`badge`** — status and category token
- `{rounded.control}`, `{typography.caption}`, flat. Three families:
  - **Status** → dot variants: a colored 6px dot plus neutral text, no fill. Always paired with a text label.
  - **Category** → soft variants: 50-tint fill with 700-tone text and a matching border.
  - **Emphasis** → solid fill. Reserved for form and button contexts, not data cells.

**`timeline-row`** — ledger entry
- Left: category chip (color). Center: actor and reason. Right: signed amount in the direction color plus a compact date.

### Overlays

**`side-sheet`** — right detail panel
- Level-2 floating. Sticky header with blur, scrolling body at `{spacing.lg}` horizontal padding, sticky footer actions. Widths are tokenized (sm 520 / md 600 / lg 720 / xl 1200 / full 95vw).

**`modal`** — centered dialog
- Level-2 floating, `{rounded.card}`, max-height with internal scroll so it never escapes a small viewport.

**`confirm-dialog`** — destructive confirmation
- Always used for irreversible actions. States the target by name. Confirm button takes `{colors.error}`.

**`dropdown-menu`** — row and account actions
- Level-2 floating, `{rounded.control}`, items at `{typography.body-sm}`. Row actions live here rather than as inline buttons.

**`toast`** — transient feedback
- Level-2 floating, bottom-anchored. Success and error carry an icon plus text, never color alone.

---

## Accessibility

- **Contrast**: text never below `{colors.caption}` (#737373, 4.54:1). `{colors.mute}` and lighter are decoration only.
- **Never color alone**: pair every color signal with a label, sign, or icon.
- **Hit areas** (desktop pointer): toolbar and inline controls minimum 32px; standalone primary actions 36px. Micro controls such as a chip's remove button may go to 24px with surrounding padding. Touch surfaces use 44px.
- **Focus**: a visible `{colors.link}` ring on every interactive element. Clickable table rows are keyboard-operable.
- **Motion**: only the four tokens above; `prefers-reduced-motion` disables animation globally.

---

## Do's and Don'ts

### Do
- Keep the canvas near-white (`{colors.canvas}`) and let near-black ink carry headings, actions, and borders.
- Define every static surface with a 1px hairline and nothing else.
- Keep every grey at saturation 0.
- Step the text ladder deliberately: `{colors.ink}` → `{colors.body}` → `{colors.caption}`.
- Use 6px squares for controls and 12px for content surfaces.
- Set display type at weight 600 with tight negative tracking.
- Render status as a dot plus label, categories as soft tags.
- Set every number in `tabular-nums` and leave it neutral.
- Reach for the existing component before inventing a pattern.

### Don't
- Don't put a border and a shadow on the same static surface — the single most damaging mistake in this system.
- Don't fill large surfaces with accent color; violet, cyan, and pink live in charts and illustration.
- Don't set body copy in pure black — the ink is #171717.
- Don't mix blue-tinted greys into the neutral ramp.
- Don't use pill buttons; pills are for filter chips only.
- Don't stack shadows or invent elevation levels.
- Don't paint a zero or empty value red.
- Don't use arbitrary values — no `text-[Npx]`, no `duration-[Nms]`, no 20px spacing.
- Don't use emoji in the interface; use line icons.
- Don't add a second decorative system — ink and hairline are the whole vocabulary.

---

## Agent Prompt Guide

When generating or modifying UI in this repository:

1. **Start flat.** A new surface gets `background: elevated`, a 1px hairline, `{rounded.card}`, and no shadow. Add elevation only if the element genuinely floats above the page.
2. **Reach for the existing component first.** The canonical list surface is `data-table`, the canonical toolbar is `filter-bar`, the canonical detail view is `side-sheet`, the canonical row action is `dropdown-menu`. Introducing a new pattern requires justification.
3. **Resolve color through the token layer**, not raw palette values. If a semantic token exists for the role, use it.
4. **Ask what the color means before applying it.** Chrome is neutral. Status takes a dot. A category takes a soft tag. Currency direction takes rose or emerald with a sign. If the color carries no meaning, remove it.
5. **Check contrast against the text ladder** before using any grey on text. Below `{colors.caption}` is decoration only.
6. **Keep to the scales.** Five type sizes, the 4px spacing scale, five radii, three elevation levels, four motion durations. If a value isn't on a scale, it's wrong.
7. **When this document and the code disagree, this document wins** — update the code, or update this document first if the design direction genuinely changed.
