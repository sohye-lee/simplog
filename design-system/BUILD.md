# Ledger — Build Guide

Everything needed to build the **Ledger** expense tracker for real. This repo is a **design system + working prototype**; this file is the spec that turns it into a shippable app. Hand this whole folder to Claude Code and start from here.

> **Source of truth:** the interactive prototype in `ui_kits/ledger/` already implements every behavior described below. When in doubt, read that code — it is intentionally simple and maps 1:1 to the spec. Preview it by opening `ui_kits/ledger/index.html`, or open the bundled single file `Ledger.html`.

---

## 1. What we're building

A deliberately minimal **personal** expense tracker. It answers three questions per month and nothing else:

1. How much came in?
2. How much went out?
3. Where did it go?

Core loop: **log an entry in seconds → review the month → export to CSV/Excel.** No budgets, no goals, no bank sync, no social — those are explicitly out of scope. "아주아주 심플" is the product thesis; protect it.

**Non-goals (do not build unless asked):** bank/card import, multi-currency per entry, receipts/attachments, recurring-transaction automation, charts beyond the single category bar list, accounts/login, multi-user.

---

## 2. Recommended stack

The prototype is React (via Babel in-browser) purely for zero-build previewing. For the real app:

- **React + Vite + TypeScript** — single-page, client-only.
- **No backend required.** It's a personal tool; persist to `localStorage` (the prototype already does). Data never leaves the device. Add sync later only if the user asks (see §12).
- **Styling:** import this design system's `styles.css` and use the CSS custom properties directly (inline styles or CSS Modules). The prototype uses inline styles referencing the tokens — copy that approach.
- **Components:** reuse the design-system components (see §3). They're plain React + CSS-variable styling with no dependencies.
- **State:** a single app-state object in React context or a small store (the prototype uses one `useState` object — fine to start). Shape in §4.
- **No date library needed** — `Intl.DateTimeFormat` / `toLocaleDateString` cover all formatting.

Suggested project layout:
```
src/
  tokens/            ← copy from this repo's /tokens (or import styles.css)
  components/         ← copy from /components (Button, Amount, StatCard, …)
  lib/                ← money.ts, csv.ts, storage.ts, seed.ts
  pages/              ← Overview, Entries, Export, Settings
  App.tsx
  main.tsx
```

---

## 3. Design system

The brand is fully specified — **do not redesign.** Read `readme.md` for the full brand guide (voice, visual foundations, iconography). Key facts:

- **One stylesheet to import:** `styles.css` (pulls in all tokens + fonts).
- **Monotone warm-neutral ink ramp + one point color: Ledger Lime `#CCF017`.** Lime is loud — one primary action / one hero figure per view. Everything else is ink.
- **Type:** IBM Plex Mono everywhere (tabular figures are the whole point). IBM Plex Serif only for large display/empty-state moments. Loaded from Google Fonts CDN today — self-host the binaries for production (see `readme.md` → Font substitution).
- **Icons:** Lucide, inline SVG (see `ui_kits/ledger/Icons.jsx` for the exact set used).
- **No emoji, no imagery, no gradients.** Borders over shadows. Small crisp radii.

**Components available** (in `/components`, each with `.jsx` + `.d.ts` + `.prompt.md`):
- `Button` — primary / secondary / ghost / dark; sizes sm/md/lg; leading/trailing icon.
- `IconButton` — square icon-only; ghost / outline / solid.
- `Input` — money-aware (`prefix`, `align="right"`, `numeric`, `invalid`, `hint`).
- `Select` — styled native select; options as strings or `{value,label}`.
- `SegmentedControl` — the toggle (Expense/Income, Simple/Two-level, Overview/Entries).
- `Amount` — **the core tabular currency figure.** `value`, `currency`, `size` xs–xl, `signed`, `emphasis`.
- `StatCard` — headline figure + label; `accent` for the hero stat.
- `CategoryBadge` — monotone category chip; `selected`, `dot`, `size`.
- `Card` — bordered surface; `padding`, `elevated`.

Tokens namespace for the compiled bundle (prototype only): `window.LedgerExpenseTrackerDesignSystem_b8666b`. In a real Vite build you'll import the component source directly instead.

---

## 4. Data model

Two persisted objects. Keep them flat and boring.

### Entry
```ts
interface Entry {
  id: number;            // Date.now() at creation
  kind: 'expense' | 'income';
  amount: number;        // positive number, in major units (₩ has no decimals)
  category: string;      // top-level category (see §6)
  sub?: string;          // subcategory — only when catMode === 'twolevel'
  note: string;          // free text; defaults to sub || category if blank
  date: string;          // 'YYYY-MM-DD'
}
```

### Settings / app state
```ts
interface AppState {
  entries: Entry[];
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP';   // default 'KRW'
  categories: string[];                               // top-level, ordered
  subcats: Record<string, string[]>;                 // category → subcategories
  catMode: 'simple' | 'twolevel';                    // default 'twolevel'
  page: 'overview' | 'entries' | 'export' | 'settings';
}
```

**Derived (compute, never store):**
- `income` = sum of `amount` where `kind === 'income'`.
- `spent` = sum of `amount` where `kind === 'expense'`.
- `left` = `income - spent`.
- `byCategory`: `{ [category]: totalExpense }`.
- `bySubcat`: `{ [category]: { [sub]: totalExpense } }` (only entries that have `sub`).

See `ui_kits/ledger/App.jsx` for the exact reducers.

---

## 5. Screens

Single narrow column, `max-width: 760px`, centered. Sticky header: lime `₩` tile + "Ledger" wordmark on the left, nav on the right (Overview · Entries · Export · Settings). A month stepper row sits below the header on every page (`◀  July 2026  ▶` + entry count).

### 5.1 Overview (home)
- **Summary strip:** three `StatCard`s — Income, Spent (with "N% of income" delta), Left (`accent`).
- **Where it went:** `Card` with category bars, sorted desc by amount. Each row: `CategoryBadge` + percent + `Amount`, and a proportional lime bar.
  - **Two-level mode:** each category row is expandable (chevron); expanding reveals indented subcategory sub-totals.
- **Recent:** last 4 entries with a "See all" → Entries.
- **Floating "Add" button** (lime, bottom-right) opens the add-entry sheet.

### 5.2 Entries
- **Search input** (matches note + category, case-insensitive).
- **Filter chips:** `All` + each top-level category (selected chip is lime).
- **List:** all entries, newest first. Each row: date · note · `CategoryBadge` (+ sub label in two-level) · signed `Amount` · delete (reveals on hover).
- Empty state when no matches.

### 5.3 Export
- Card: month label, entry count, format toggle **CSV / Excel**, big **Download** button.
- "What's included" card lists the columns.
- CSV = plain `text/csv`. Excel = same CSV **prefixed with a UTF-8 BOM (`\ufeff`)** so Korean text opens correctly in Excel.
- Columns: `Date, Kind, Category, Subcategory, Note, Amount`. Amount is signed (`-` for expense). Filename: `ledger-<month>.csv`.
- See `exportFile()` in `App.jsx`.

### 5.4 Settings
- **Category style:** SegmentedControl `Simple ↔ Two-level` with an explainer line.
- **Currency:** Select (₩ / $ / € / ¥ / £).
- **Categories:**
  - *Simple mode:* flat chips with ✕ to remove + "Add category" field.
  - *Two-level mode:* accordion — each category is a row showing its sub-count and a delete (trash); expand to see subcategory chips (✕ to remove) and an inline "Add to <category>…" field. Below: "Add category" (creates a category with an empty sub list).
- **Data:** "Reset data" → restores the sample July dataset.

---

## 6. Category system (two-level is the default)

**Default top-level set** (`DEFAULT_CATEGORIES`): `Food, Housing, Transport, Bills, Shopping, Health, Entertainment, Other`. Income categories: `Salary, Side, Other`.

**Default subcategories** (`SUBCATEGORIES`):
- Food → Groceries, Dining out, Coffee, Delivery
- Housing → Rent, Maintenance, Furniture
- Transport → Transit, Taxi, Fuel
- Bills → Phone, Internet, Utilities, Subscriptions
- Shopping → Clothing, Electronics, Home
- Health → Pharmacy, Clinic, Fitness
- Entertainment → Movies, Games, Events, Hobbies
- Other → Misc, Gifts, Fees

**Rules:**
- Subcategory is **always optional** on entry — never block logging on it.
- Subcategories live in state (`subcats`), fully user-editable in Settings; the defaults are just a seed.
- Removing a category also removes its subcategories.
- `catMode` controls behavior everywhere: in `simple` mode the `sub` field, the subcategory picker, the accordion editor, and the Overview expansion are all hidden. Existing `sub` values on entries are harmless when hidden.
- Income entries don't use subcategories.

---

## 7. Add-entry flow

Bottom sheet (slides up, dims background). Fields in order:
1. **Expense / Income** SegmentedControl.
2. **Amount** — `Input` with currency prefix, right-aligned, numeric. Strip non-numeric input.
3. **Category** — `Select` (expense → user categories; income → income categories).
4. **Subcategory** — `Select`, shown only in two-level mode when the chosen category has subs. Optional.
5. **Note** — free text.
6. **Add entry** — primary button, disabled until `amount > 0 && category`. On save: prepend to `entries`, close, reset.

`note` falls back to `sub || category` when left blank. `date` = today (`YYYY-MM-DD`).

---

## 8. Money & formatting

- **`Amount` component owns all figure rendering.** Digits are tabular + slashed-zero so columns align. Currency symbol is de-emphasized (smaller, muted).
- **Decimals:** 0 for KRW/JPY, 2 for USD/EUR/GBP.
- **Sign:** expenses render `−`, income optionally `+` (`signed` prop). Direction is shown by sign and lime accent — **never red/green** (monotone brand rule).
- Store amounts as positive numbers; derive sign from `kind` at render/export time.

---

## 9. Persistence

- One `localStorage` key holding the whole `AppState` as JSON. Prototype key: `ledger.state.v4` — **bump the version suffix whenever the shape changes** so stale state doesn't break a new build.
- Write on every state change; read on load; fall back to the seed dataset if absent/corrupt.
- "Reset data" overwrites with the seed (`SEED` in `Screens.jsx`).
- Never clear keys you didn't write.

---

## 10. Reference files in this repo

- `ui_kits/ledger/index.html` — mounts the prototype.
- `ui_kits/ledger/App.jsx` — **shell, routing, state, persistence, add-sheet, export.** The heart of the spec.
- `ui_kits/ledger/Pages.jsx` — Overview / Entries / Export / Settings bodies + category editor.
- `ui_kits/ledger/Screens.jsx` — shared pieces + `DEFAULT_CATEGORIES`, `SUBCATEGORIES`, `SEED`, `SummaryStrip`, `CategoryBreakdown`, `EntryRow`.
- `ui_kits/ledger/Icons.jsx` — the Lucide icon set actually used.
- `components/*` — the reusable primitives to port.
- `tokens/*` + `styles.css` — the design tokens.
- `readme.md` — full brand guide. `SKILL.md` — skill wrapper for reuse.

---

## 11. Build checklist

1. Scaffold Vite + React + TS; import `styles.css`; self-host the two fonts.
2. Port the `components/` primitives (they're already framework-agnostic React).
3. Implement `AppState`, `localStorage` load/save, and the seed dataset.
4. Build the header + month stepper + nav shell.
5. Overview → Entries → Add-sheet → Export → Settings, in that order.
6. Wire the `catMode` two-level behavior through all five surfaces.
7. CSV/Excel export.
8. QA the money formatting across currencies.

---

## 12. Open decisions (confirm with the owner)

- **App name** — currently the placeholder "Ledger". Rename the wordmark + tile if desired.
- **Multiple months** — the prototype shows one fixed month (July 2026); the ◀ ▶ stepper is inert. To support real month navigation: give each entry its month via its `date`, filter the active month by `YYYY-MM`, and make the stepper change the active month. Straightforward but not yet built.
- **Fonts** — confirm IBM Plex Mono/Serif and whether to self-host.
- **Sync/backup** — out of scope by default. If wanted later, the cleanest minimal option is export/import of the JSON state, before any server.
