-- SimplyLog — Supabase schema.
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

-- ── Smart-import AI usage ───────────────────────────────────────
-- One row per import run (a run may make several AI calls: map,
-- categorize, PDF chunks). Only the import-ai edge function touches this
-- table, with the service role; clients have no policies, so no access.
create table public.ai_usage (
  user_id     uuid not null references auth.users (id) on delete cascade,
  import_id   uuid not null,
  month       text not null,               -- 'YYYY-MM' (UTC)
  calls       int  not null default 1,
  created_at  timestamptz not null default now(),
  primary key (user_id, import_id)
);
create index ai_usage_user_month_idx on public.ai_usage (user_id, month);
alter table public.ai_usage enable row level security;

-- Count one AI call. Returns 'ok', 'monthly_limit' (a new import would
-- exceed p_monthly imports this month) or 'import_limit' (this import
-- already made p_calls calls).
create or replace function public.ai_use(p_user uuid, p_import uuid, p_monthly int, p_calls int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
  n int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select calls into n from ai_usage where user_id = p_user and import_id = p_import;
  if found then
    if n >= p_calls then return 'import_limit'; end if;
    update ai_usage set calls = calls + 1 where user_id = p_user and import_id = p_import;
    return 'ok';
  end if;
  select count(*) into n from ai_usage where user_id = p_user and month = m;
  if n >= p_monthly then return 'monthly_limit'; end if;
  insert into ai_usage (user_id, import_id, month) values (p_user, p_import, m);
  return 'ok';
end $$;
revoke all on function public.ai_use(uuid, uuid, int, int) from public, anon, authenticated;
grant execute on function public.ai_use(uuid, uuid, int, int) to service_role;

-- Imports used this month (for the "N left" hint).
create or replace function public.ai_used(p_user uuid)
returns int
language sql security definer set search_path = public as $$
  select count(*)::int from ai_usage
  where user_id = p_user and month = to_char(now() at time zone 'utc', 'YYYY-MM');
$$;
revoke all on function public.ai_used(uuid) from public, anon, authenticated;
grant execute on function public.ai_used(uuid) to service_role;
