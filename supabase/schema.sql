-- SimpleLog — Supabase schema.
-- Run this once in the SQL editor of a fresh Supabase project
-- (Dashboard → SQL Editor → paste → Run).

-- ── Entries ─────────────────────────────────────────────────────
-- Mirrors the client Entry shape. Deletes are tombstones (deleted
-- flag) so offline devices can't resurrect removed entries.
create table public.entries (
  id          bigint primary key,                 -- Date.now() at creation (client)
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('expense', 'income')),
  amount      double precision not null check (amount > 0),
  category    text not null,
  sub         text,
  note        text not null default '',
  date        date not null,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index entries_user_date_idx on public.entries (user_id, date);

alter table public.entries enable row level security;

create policy "own entries — select" on public.entries
  for select using (auth.uid() = user_id);
create policy "own entries — insert" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "own entries — update" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries — delete" on public.entries
  for delete using (auth.uid() = user_id);

-- ── Settings ────────────────────────────────────────────────────
-- One row per user: currency, categories, subcats, catMode as JSON.
-- Last write wins via updated_at.
create table public.settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "own settings — select" on public.settings
  for select using (auth.uid() = user_id);
create policy "own settings — insert" on public.settings
  for insert with check (auth.uid() = user_id);
create policy "own settings — update" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
