# SimplyLog

A deliberately minimal personal expense tracker. It answers three questions per month and nothing else: how much came in, how much went out, and where it went.

Built from the bundled design system in [`design-system/`](design-system/readme.md) — monotone warm-neutral ink + one point color (Lime `#CCF017`), IBM Plex Mono with tabular figures. See [`design-system/BUILD.md`](design-system/BUILD.md) for the full product spec.

## Features

- **Overview** — monthly Income / Spent / Left, category breakdown with proportional bars (expandable subcategories in two-level mode), recent entries.
- **Entries** — month-scoped ledger with search and category filter chips.
- **Add entry** — bottom sheet: expense/income, amount, category (+optional subcategory), note, date.
- **Export** — the active month as **CSV** (UTF-8 BOM), **Excel** (real .xlsx), or **PDF** (monthly statement, Korean text supported via embedded NanumGothic Coding).
- **Settings** — simple/two-level category mode, currency (₩ $ € ¥ £), category & subcategory editor, JSON backup/restore, data reset.
- **Sync** — email-code sign-in (Supabase); offline-first: everything works from `localStorage` and a pending-ops queue syncs to the server whenever online. Same account on phone/tablet/web = same data.
- **Month navigation** — ◀ ▶ stepper on every page; all views and exports follow the active month.
- PWA: installable on iPhone / Android / tablet home screens, works offline.
- Native shells: `ios/` and `android/` (Capacitor) share this exact web code.

## Development

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # type-check + production build to dist/
```

Without `.env.local` the app runs in local-only mode (no login, no sync) — everything else works.

## Supabase setup (one time)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Dashboard → **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. Dashboard → **Authentication → Email Templates → Magic Link**: make sure the body includes the code, e.g. add a line `Your code: {{ .Token }}` — the app signs in with the 6-digit code, not the link, so it works identically on web and in the native apps.
4. Dashboard → **Settings → API**: copy the URL and anon key into `.env.local` (see [`.env.example`](.env.example)). Never put the service_role key in the client.
5. Rebuild / restart dev server. The Sync card appears in Settings.

## Native builds (Capacitor)

```bash
npm run build && npx cap sync   # after any web code change
npx cap open ios                # Xcode → run on device / archive for App Store
npx cap open android            # Android Studio (install first) → Play Store
```

Exports (CSV/Excel/PDF/backup) automatically use the native share sheet inside the apps, and the browser download on the web.

## Replacing the app icon

The current icon is the design system's lime wallet mark. To swap in a final logo, replace:

- `public/favicon.svg` (browser tab)
- `public/apple-touch-icon.png` (180×180, iOS home screen)
- `public/icon-192.png`, `public/icon-512.png` (Android/manifest)

## Going native (later)

The app is a plain client-only Vite + React SPA, so wrapping it with [Capacitor](https://capacitorjs.com) is the intended path to App Store / Play Store builds — no code changes needed to keep testing it as a web app in the meantime.
