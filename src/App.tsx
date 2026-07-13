// SimplyLog — app shell, auth gate, nav routing, month navigation,
// state + persistence + sync.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './components/Button';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { MonthStepper } from './kit/pieces';
import { AddSheet } from './kit/AddSheet';
import { SignInScreen } from './kit/SignInScreen';
import { OverviewPage } from './pages/Overview';
import { EntriesPage } from './pages/Entries';
import { ExportPage } from './pages/Export';
import { SettingsPage } from './pages/Settings';
import type { AppState, Entry, Freq, Page, RecurringRule } from './lib/types';
import { loadState, saveState, defaultState } from './lib/storage';
import { monthOf, monthLabel, shiftMonth, thisMonth, todayISO } from './lib/months';
import { exportMonth, exportBackup, parseBackup } from './lib/export';
import type { ExportFormat } from './lib/export';
import { enqueueAdd, enqueueDelete, markSettingsChanged, fullSync, signOut, deleteAccount } from './lib/sync';
import { materialize, entryIdFor } from './lib/recurring';
import { supabase } from './lib/supabase';

const NAV: Array<{ id: Page; label: string; icon: IconName }> = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'entries', label: 'Entries', icon: 'list' },
  { id: 'export', label: 'Export', icon: 'download' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];

function NavTabs({ page, onNav }: { page: Page; onNav: (page: Page) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 2 }}>
      {NAV.map((n) => {
        const active = page === n.id;
        return (
          <button key={n.id} onClick={() => onNav(n.id)} aria-label={n.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 12px',
            border: 'none', background: active ? 'var(--surface-inset)' : 'transparent', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
            fontWeight: active ? 600 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'background 120ms, color 120ms',
          }}>
            <Icon name={n.icon} size={16} />
            <span className="sl-nav-label">{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="15" fill="#CCF017" />
      <rect x="20" y="13" width="24" height="13" rx="3" fill="#FBFBF6" />
      <rect x="12" y="21" width="40" height="30" rx="7" fill="#0C0D0A" />
      <rect x="40" y="31" width="13" height="10" rx="3.2" fill="#CCF017" />
      <circle cx="46.5" cy="36" r="2" fill="#0C0D0A" />
    </svg>
  );
}

type AuthPhase = 'loading' | 'out' | 'in' | 'local';

export default function App() {
  const [st, setSt] = useState<AppState>(loadState);
  const [month, setMonth] = useState<string>(thisMonth);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [auth, setAuth] = useState<AuthPhase>(supabase ? 'loading' : 'local');
  const { entries, currency, categories, subcats, recurring, page } = st;

  useEffect(() => { saveState(st); }, [st]);

  const patch = (p: Partial<AppState>) => setSt((s) => ({ ...s, ...p }));

  // ── Sync ────────────────────────────────────────────────────────
  const stRef = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);

  const runSync = useCallback(async () => {
    const result = await fullSync(stRef.current);
    if (result) setSt((s) => ({ ...s, ...result }));
  }, []);

  const syncTimer = useRef<ReturnType<typeof setTimeout>>();
  const scheduleSync = useCallback(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { runSync().catch(() => {}); }, 1200);
  }, [runSync]);

  useEffect(() => {
    const onOnline = () => { runSync().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);

  // ── Auth gate ───────────────────────────────────────────────────
  // The gate only reflects whether a session exists — it never wipes
  // local data. That way a transient token hiccup can't destroy work
  // in progress; only the explicit Sign out button clears the device.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuth(data.session ? 'in' : 'out'));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setAuth(session ? 'in' : 'out');
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        runSync().catch(() => {});
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [runSync]);

  // Coming back to the tab (or waking from sleep) proactively refreshes
  // the session so an expired access token gets renewed instead of
  // bouncing the user to the sign-in screen mid-task.
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      sb.auth.getSession().then(({ data }) => {
        setAuth(data.session ? 'in' : 'out');
        if (data.session) runSync().catch(() => {});
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [runSync]);

  // Explicit sign out: clear the device, then end the session.
  const doSignOut = async () => {
    setSt({ ...defaultState(), entries: [], recurring: [] });
    setMonth(thisMonth());
    await signOut();
  };

  // Delete account: erase server data + sign out, then clear the device.
  const doDeleteAccount = async (): Promise<string | null> => {
    const err = await deleteAccount();
    if (err) return err;
    setSt({ ...defaultState(), entries: [], recurring: [] });
    setMonth(thisMonth());
    return null;
  };

  // ── Recurring: materialize due entries whenever rules change ────
  useEffect(() => {
    const { newEntries, rules, changed } = materialize(recurring, todayISO());
    if (!changed) return;
    setSt((s) => ({ ...s, entries: [...newEntries, ...s.entries.filter((e) => !newEntries.some((n) => n.id === e.id))], recurring: rules }));
    newEntries.forEach(enqueueAdd);
    markSettingsChanged();
    scheduleSync();
  }, [recurring, scheduleSync]);

  const changeSettings = (p: Partial<AppState>) => { patch(p); markSettingsChanged(); scheduleSync(); };
  const mutateSettings = (fn: (s: AppState) => AppState) => { setSt(fn); markSettingsChanged(); scheduleSync(); };

  // Everything below is scoped to the active month.
  const monthEntries = useMemo(() => entries.filter((e) => monthOf(e.date) === month), [entries, month]);
  const income = monthEntries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const spent = monthEntries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const { byCategory, bySubcat } = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySubcat: Record<string, Record<string, number>> = {};
    monthEntries.filter((e) => e.kind === 'expense').forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      if (e.sub) {
        (bySubcat[e.category] = bySubcat[e.category] || {})[e.sub] = (bySubcat[e.category][e.sub] || 0) + e.amount;
      }
    });
    return { byCategory, bySubcat };
  }, [monthEntries]);
  const sorted = useMemo(() => [...monthEntries].sort((a, b) => (a.date < b.date ? 1 : -1)), [monthEntries]);

  const addEntry = (e: Entry, repeat?: Freq) => {
    if (repeat) {
      const rule: RecurringRule = {
        id: e.id, kind: e.kind, amount: e.amount, category: e.category,
        note: e.note, freq: repeat, anchor: e.date, lastGen: 0,
      };
      if (e.sub) rule.sub = e.sub;
      e = { ...e, id: entryIdFor(rule, 0) };   // deterministic id for occurrence 0
      setSt((s) => ({ ...s, entries: [e, ...s.entries], recurring: [...s.recurring, rule] }));
      markSettingsChanged();                    // rules travel with settings
    } else {
      setSt((s) => ({ ...s, entries: [e, ...s.entries] }));
    }
    setMonth(monthOf(e.date));   // jump to the month the entry landed in
    enqueueAdd(e);
    scheduleSync();
  };
  const del = (id: number) => {
    setSt((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    enqueueDelete(id);
    scheduleSync();
  };

  // Editing reuses the add sheet; saving upserts by the same id.
  const openEdit = (e: Entry) => { setEditing(e); setSheet(true); };
  const closeSheet = () => { setSheet(false); setEditing(null); };
  const submitEntry = (e: Entry, repeat?: Freq) => {
    if (editing) {
      setSt((s) => ({ ...s, entries: s.entries.map((x) => (x.id === e.id ? e : x)) }));
      setMonth(monthOf(e.date));
      enqueueAdd(e);           // upsert — same id overwrites the row
      scheduleSync();
    } else {
      addEntry(e, repeat);
    }
  };

  // Renaming a category/subcategory also rewrites the entries and
  // recurring rules that reference it, then upserts the changed entries
  // so the new names reach the server (settings sync alone won't move them).
  const renameCategory = (oldName: string, next: string) => {
    if (oldName === next || categories.includes(next)) return;
    const changed = entries.filter((e) => e.category === oldName).map((e) => ({ ...e, category: next }));
    setSt((s) => {
      const subcats = { ...s.subcats };
      if (oldName in subcats) { subcats[next] = subcats[oldName]; delete subcats[oldName]; }
      return {
        ...s,
        categories: s.categories.map((c) => (c === oldName ? next : c)),
        subcats,
        entries: s.entries.map((e) => (e.category === oldName ? { ...e, category: next } : e)),
        recurring: s.recurring.map((r) => (r.category === oldName ? { ...r, category: next } : r)),
      };
    });
    changed.forEach(enqueueAdd);
    markSettingsChanged();
    scheduleSync();
  };
  const renameSub = (cat: string, oldSub: string, next: string) => {
    if (oldSub === next || (subcats[cat] || []).includes(next)) return;
    const changed = entries.filter((e) => e.category === cat && e.sub === oldSub).map((e) => ({ ...e, sub: next }));
    setSt((s) => ({
      ...s,
      subcats: { ...s.subcats, [cat]: (s.subcats[cat] || []).map((x) => (x === oldSub ? next : x)) },
      entries: s.entries.map((e) => (e.category === cat && e.sub === oldSub ? { ...e, sub: next } : e)),
      recurring: s.recurring.map((r) => (r.category === cat && r.sub === oldSub ? { ...r, sub: next } : r)),
    }));
    changed.forEach(enqueueAdd);
    markSettingsChanged();
    scheduleSync();
  };
  const moveSub = (cat: string, index: number, dir: -1 | 1) => {
    mutateSettings((s) => {
      const list = [...(s.subcats[cat] || [])];
      const j = index + dir;
      if (j < 0 || j >= list.length) return s;
      [list[index], list[j]] = [list[j], list[index]];
      return { ...s, subcats: { ...s.subcats, [cat]: list } };
    });
  };

  const onExport = (format: ExportFormat) => exportMonth(format, sorted, month, currency);

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const restored = parseBackup(String(reader.result));
      if (!restored) { window.alert('Not a valid SimplyLog backup file.'); return; }
      setSt({ ...restored, page: 'settings' });
      setMonth(thisMonth());
      restored.entries.forEach(enqueueAdd);   // pushed to the server on next sync
      markSettingsChanged();
      scheduleSync();
    };
    reader.readAsText(file);
  };

  // ── Gate ────────────────────────────────────────────────────────
  if (auth === 'loading') {
    return <div style={{ minHeight: '100dvh', background: 'var(--surface-page)' }} />;
  }
  if (auth === 'out') {
    return <SignInScreen />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-card)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Logo />
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.01em' }}>SimplyLog</span>
          </div>
          <NavTabs page={page} onNav={(p) => patch({ page: p })} />
        </div>
      </header>

      <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <MonthStepper label={monthLabel(month)} onPrev={() => setMonth((m) => shiftMonth(m, -1))} onNext={() => setMonth((m) => shiftMonth(m, 1))} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{monthEntries.length} entries</span>
        </div>

        {page === 'overview' && (
          <OverviewPage income={income} spent={spent} byCategory={byCategory} bySubcat={bySubcat}
            categories={categories} allEntries={entries} month={month}
            recent={sorted.slice(0, 4)} currency={currency}
            onSeeAll={() => patch({ page: 'entries' })} onDelete={del} onEdit={openEdit} />
        )}
        {page === 'entries' && (
          <EntriesPage entries={monthEntries} categories={categories} currency={currency} onDelete={del} onEdit={openEdit} />
        )}
        {page === 'export' && (
          <ExportPage entries={sorted} monthLabel={monthLabel(month)} onExport={onExport} />
        )}
        {page === 'settings' && (
          <SettingsPage
            currency={currency}
            categories={categories}
            subcats={subcats}
            recurring={recurring}
            onCurrency={(c) => changeSettings({ currency: c })}
            onAddCategory={(c) => mutateSettings((s) => ({ ...s, categories: [...s.categories, c], subcats: { ...s.subcats, [c]: [] } }))}
            onRenameCategory={renameCategory}
            onRemoveCategory={(c) => mutateSettings((s) => { const sc = { ...s.subcats }; delete sc[c]; return { ...s, categories: s.categories.filter((x) => x !== c), subcats: sc }; })}
            onReorderCategories={(next) => changeSettings({ categories: next })}
            onAddSub={(cat, sub) => mutateSettings((s) => ({ ...s, subcats: { ...s.subcats, [cat]: [...(s.subcats[cat] || []), sub] } }))}
            onRenameSub={renameSub}
            onMoveSub={moveSub}
            onRemoveSub={(cat, sub) => mutateSettings((s) => ({ ...s, subcats: { ...s.subcats, [cat]: (s.subcats[cat] || []).filter((x) => x !== sub) } }))}
            onRemoveRecurring={(id) => mutateSettings((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }))}
            onReset={() => {
              // Reset the account, not just this device: tombstone every
              // current entry on the server before starting fresh.
              stRef.current.entries.forEach((e) => enqueueDelete(e.id));
              const fresh = defaultState();
              fresh.entries.forEach((e) => enqueueAdd(e));
              setSt({ ...fresh, page: 'settings' });
              setMonth(thisMonth());
              markSettingsChanged();
              scheduleSync();
            }}
            onBackup={() => exportBackup(stRef.current)}
            onImport={onImport}
            onSyncNow={runSync}
            onSignOut={doSignOut}
            onDeleteAccount={doDeleteAccount}
          />
        )}
      </main>

      {page !== 'export' && page !== 'settings' && (
        <div className="sl-fab">
          <Button variant="primary" size="lg" onClick={() => setSheet(true)} leadingIcon={<Icon name="plus" size={20} />} style={{ boxShadow: 'var(--shadow-md)' }}>Add</Button>
        </div>
      )}

      <AddSheet open={sheet} onClose={closeSheet} onAdd={submitEntry} categories={categories} subcats={subcats} currency={currency} entries={entries} editing={editing} />
    </div>
  );
}
