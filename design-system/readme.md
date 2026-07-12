# Ledger — Design System

A design system for **Ledger**, an intentionally minimal personal expense tracker. Ledger answers three questions and nothing else: *how much came in this month, how much went out, and where it went.* You log an entry in seconds, browse a month, and export the month to CSV/Excel.

> **No brand assets were provided.** There is no supplied logo, so the mark is simply the wordmark **Ledger** set in IBM Plex Mono, paired with a lime `₩` tile. Do not invent or draw a logo. Fonts are loaded from Google Fonts CDN, not self-hosted (see *Font substitution*).

## Product concept

- **Single-column, narrow web app** (max ~760px). Calm, dense, spreadsheet-honest.
- Core surfaces: a **monthly Overview** (income / spent / left + where-it-went breakdown), an **All entries** ledger list, a quick **Add entry** sheet, and **Export CSV**.
- Aesthetic: monotone warm-neutral ink + one loud point color (Ledger Lime `#CCF017`), mono-forward typography with tabular figures.

## Sources

Built from scratch — no codebase, Figma, or deck was provided. The brief: a very simple expense tracker with monthly income/spend-by-category, quick entry, monthly review, and Excel export; monotone with one point color `#CCF017`; monospace (or serif) type.

---

## Content fundamentals

- **Voice:** plain, quiet, second-person implied. Short verb-first labels — "Add entry", "Export CSV", "Add". No marketing language, no exclamation.
- **Casing:** Sentence case for everything except **overline labels**, which are UPPERCASE with wide tracking (`Where it went`, `Income`, `Spent`, `Left`). Buttons are sentence case.
- **Numbers are the content.** Amounts always render tabular with slashed zeros so columns align. Currency symbol is de-emphasized (smaller, muted) so the digits lead. KRW/JPY show 0 decimals; USD/EUR/GBP show 2.
- **Money direction:** expenses render with a minus (`−₩48,300`), income with an optional `+` and the lime accent color. We never use red/green — direction is shown by sign and (sparingly) the point color.
- **Category names:** one or two words, sentence-case nouns (Food, Rent, Transport, Fun, Health, Other; income: Salary, Side).
- **No emoji.** Iconography is line icons only (see below).
- **Tone example (empty state / hero, serif):** "Know exactly where your *won* went this month."

## Visual foundations

- **Color:** a warm-neutral ink ramp (`--ink-900` near-black → `--paper`) carries ~95% of the UI. **Ledger Lime `#CCF017`** is the sole point color — used for one primary action per view, the active segment/filter, the "Left" hero stat, and income figures. Text on lime is always dark ink (`--text-on-accent`). For lime-as-text on paper use `--lime-700` (accessible).
- **Type:** **IBM Plex Mono** is the workhorse (labels, body, and critically the tabular numbers). **IBM Plex Serif** appears only at large display sizes for warmth (heroes, empty states). Hierarchy comes from size and weight, not typeface switching. Overlines: 11px, uppercase, `0.08em` tracking, muted.
- **Spacing:** 4px base grid. Generous outer padding (24px gutters), tight inner rows (12px). Single narrow column, `--container-max: 760px`.
- **Corners:** small and crisp — inputs/chips `5px`, cards/buttons `8px`, large panels `12px`, pills for chips. This is a ledger, not a bubbly consumer toy.
- **Borders over shadows.** Default surface is a 1px `--border` with **no** shadow. Shadows are barely-there and reserved for transient layers (the add-entry sheet, menus). No colored glows except the **lime focus ring** (`--ring-accent`).
- **Backgrounds:** flat `--paper` page, white cards, `--ink-50/100` sunken fills. No gradients, no images, no textures, no patterns.
- **Motion:** quick and precise — 120–180ms, `cubic-bezier(0.2,0,0,1)`, no bounce. Buttons nudge down 1px on press; rows reveal a delete action on hover (opacity fade). Reduced-motion safe (fades only).
- **Hover / press states:** buttons darken (`--accent-hover`, `--ink-800`) or fill with a sunken wash (ghost/secondary); press = `translateY(1px)`. Icon buttons gain a sunken fill + darker icon on hover.
- **Focus:** 1px border goes to `--ink-900` plus the lime `--ring-accent` glow.
- **Imagery:** none. Ledger is text and figures only.

## Iconography

- **Lucide** (MIT), stroke-based, 2px stroke, 24×24, `currentColor` — matches the clean mono aesthetic. **Substitution flag:** the source provided no icon set; Lucide is a chosen default. To swap, change `ui_kits/ledger/Icons.jsx`.
- Rendered **inline as SVG path data** (in `Icons.jsx`) using Lucide's real geometry, so the kit has no runtime icon dependency and no hand-approximated shapes. Icons used: `plus, minus, chevron-left, chevron-right, download, trash-2, search, x, calendar, check, arrow-up-right`.
- **No emoji, no unicode glyph icons** (except the `₩` currency symbol used typographically, not as an icon).

---

## Components

Reusable primitives, grouped by concern. Consume via `window.LedgerExpenseTrackerDesignSystem_b8666b.<Name>` after loading `_ds_bundle.js`.

- **Forms** (`components/forms/`): **Button** (primary/secondary/ghost/dark), **IconButton**, **Input** (money-aware: prefix, right-align, numeric), **Select** (native, styled), **SegmentedControl**.
- **Data** (`components/data/`): **Amount** (the core tabular currency figure), **StatCard** (headline figure + label), **CategoryBadge** (monotone category chip).
- **Layout** (`components/layout/`): **Card** (bordered surface, borders-over-shadows).

Each component ships a `.jsx`, a `.d.ts` props contract, a `.prompt.md` usage note, and a directory `@dsCard` for the Design System tab.

### Intentional additions
- **Amount** and **StatCard** are money-specific primitives (not in a generic UI-kit list) — they exist because the currency figure is the single most-repeated element in the product and must be consistent.

## UI kit

- **`ui_kits/ledger/`** — an interactive recreation of the Ledger app: header + CSV export, month stepper, Overview↔All-entries toggle, summary strip (Income/Spent/Left), category breakdown with proportional bars, a live ledger list with delete, and an Add-entry bottom sheet that really appends. `index.html` is the entry; logic is split into `Icons.jsx`, `Screens.jsx`, `App.jsx`.

## Foundations (Design System tab cards)

`guidelines/` holds specimen cards: neutral ramp, Ledger Lime scale, semantic surfaces/text (Colors); type scale, serif accent, tabular figures (Type); spacing scale, radii, elevation & focus ring (Spacing).

---

## Font substitution

**IBM Plex Mono** and **IBM Plex Serif** are loaded from the **Google Fonts CDN** (`tokens/fonts.css`), not self-hosted binaries. If you need offline/self-hosted copies, download the families from Google Fonts and replace the `@import` with local `@font-face` rules pointing at the binaries. → *Please confirm this is acceptable, or send preferred/licensed font files.*

## File index (root manifest)

- `styles.css` — entry point; `@import` manifest only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `components/` — `forms/`, `data/`, `layout/` (each: `.jsx` + `.d.ts` + `.prompt.md` + `*.card.html`).
- `ui_kits/ledger/` — the expense-tracker app recreation.
- `guidelines/` — foundation specimen cards.
- `readme.md` (this file), `SKILL.md`.
- `BUILD.md` — **product build guide**: the spec to turn this system + prototype into a shippable app (data model, screens, category system, export). Start here when building in Claude Code.
- Generated (do not edit): `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`.

**Namespace:** `window.LedgerExpenseTrackerDesignSystem_b8666b`
