// Offline-first sync engine.
//
// The app always works from localStorage. Every add/delete is also
// appended to a pending-ops queue; whenever we're online and signed
// in, the queue is pushed to Supabase and the fresh server state is
// pulled back. Deletes are tombstones server-side so offline devices
// can't resurrect removed entries. Settings sync last-write-wins.
import { supabase } from './supabase';
import type { AppState, Entry } from './types';

type PendingOp = { t: 'add'; e: Entry } | { t: 'del'; id: number };

const PENDING_KEY = 'simplelog.pending.v1';
const BOOTSTRAPPED_KEY = 'simplelog.bootstrapped.v1';
const SETTINGS_AT_KEY = 'simplelog.settingsAt.v1';
const LAST_SYNC_KEY = 'simplelog.lastSync.v1';

// ── Pending queue ────────────────────────────────────────────────

function loadPending(): PendingOp[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function savePending(ops: PendingOp[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
}

export function enqueueAdd(e: Entry): void {
  savePending([...loadPending(), { t: 'add', e }]);
}
export function enqueueDelete(id: number): void {
  savePending([...loadPending(), { t: 'del', id }]);
}
export function markSettingsChanged(): void {
  localStorage.setItem(SETTINGS_AT_KEY, new Date().toISOString());
}
export function lastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

function applyPending(entries: Entry[], ops: PendingOp[]): Entry[] {
  let out = entries;
  for (const op of ops) {
    if (op.t === 'add') out = [op.e, ...out.filter((e) => e.id !== op.e.id)];
    else out = out.filter((e) => e.id !== op.id);
  }
  return out;
}

// ── Row mapping ──────────────────────────────────────────────────

function rowFromEntry(e: Entry) {
  return { id: e.id, kind: e.kind, amount: e.amount, category: e.category, sub: e.sub ?? null, note: e.note, date: e.date, deleted: false, updated_at: new Date().toISOString() };
}

function entryFromRow(r: Record<string, unknown>): Entry {
  const e: Entry = {
    id: Number(r.id),
    kind: r.kind as Entry['kind'],
    amount: Number(r.amount),
    category: String(r.category),
    note: String(r.note ?? ''),
    date: String(r.date),
  };
  if (r.sub) e.sub = String(r.sub);
  return e;
}

// ── Auth ─────────────────────────────────────────────────────────

export async function sendCode(email: string): Promise<string | null> {
  if (!supabase) return 'Sync is not configured.';
  const { error } = await supabase.auth.signInWithOtp({ email });
  return error ? error.message : null;
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  if (!supabase) return 'Sync is not configured.';
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  localStorage.removeItem(BOOTSTRAPPED_KEY);
  savePending([]);
}

export async function sessionEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

// ── Full sync ────────────────────────────────────────────────────

let running = false;

/**
 * Push pending ops, reconcile settings, pull entries.
 * Returns a state patch to apply, or null when signed out, offline,
 * or unconfigured. Throws on network/server errors.
 */
export async function fullSync(state: AppState): Promise<Partial<AppState> | null> {
  if (!supabase || !navigator.onLine) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  if (running) return null;   // caller re-schedules; queue survives either way
  running = true;
  try {
    // First sync on this device: upload everything local once so
    // entries logged before signing in survive.
    if (!localStorage.getItem(BOOTSTRAPPED_KEY)) {
      const rows = state.entries.map(rowFromEntry);
      if (rows.length) {
        const { error } = await supabase.from('entries').upsert(rows);
        if (error) throw error;
      }
      localStorage.setItem(BOOTSTRAPPED_KEY, '1');
    }

    // Push the queued ops (snapshot — ops enqueued while we sync
    // stay in the queue for the next run). Collapse to one final op
    // per id, last op wins: duplicates in one upsert batch are a
    // Postgres error (React StrictMode can double-enqueue), and
    // del-then-re-add (Reset data) must end with the row alive.
    const ops = loadPending();
    const finalOp = new Map<number, PendingOp>();
    ops.forEach((o) => finalOp.set(o.t === 'add' ? o.e.id : o.id, o));
    const adds: ReturnType<typeof rowFromEntry>[] = [];
    const dels: number[] = [];
    finalOp.forEach((o) => { if (o.t === 'add') adds.push(rowFromEntry(o.e)); else dels.push(o.id); });
    if (adds.length) {
      const { error } = await supabase.from('entries').upsert(adds);
      if (error) throw error;
    }
    if (dels.length) {
      const { error } = await supabase.from('entries')
        .update({ deleted: true, updated_at: new Date().toISOString() })
        .in('id', dels);
      if (error) throw error;
    }
    savePending(loadPending().slice(ops.length));

    // Settings — last write wins.
    const localAt = localStorage.getItem(SETTINGS_AT_KEY);
    const { data: remote, error: settingsErr } = await supabase.from('settings').select('data, updated_at').maybeSingle();
    if (settingsErr) throw settingsErr;
    let settingsPatch: Partial<AppState> = {};
    const localData = { currency: state.currency, categories: state.categories, subcats: state.subcats, catMode: state.catMode, recurring: state.recurring };
    const localNewer = localAt && (!remote || new Date(localAt).getTime() > new Date(remote.updated_at).getTime());
    if (!remote || localNewer) {
      const { error } = await supabase.from('settings').upsert({
        user_id: session.user.id,
        data: localData,
        updated_at: localAt || new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      settingsPatch = remote.data as Partial<AppState>;
    }

    // Pull all live entries (paged — Supabase caps a query at 1000 rows).
    const pulled: Entry[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error } = await supabase.from('entries')
        .select('id, kind, amount, category, sub, note, date')
        .eq('deleted', false)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      pulled.push(...(rows ?? []).map(entryFromRow));
      if (!rows || rows.length < PAGE) break;
    }

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    // Ops enqueued mid-sync aren't on the server yet — overlay them.
    return { entries: applyPending(pulled, loadPending()), ...settingsPatch };
  } finally {
    running = false;
  }
}
