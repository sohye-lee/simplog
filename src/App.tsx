// SimpleLog — app shell, nav routing, month navigation, state + persistence.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './components/Button';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { MonthStepper } from './kit/pieces';
import { AddSheet } from './kit/AddSheet';
import { OverviewPage } from './pages/Overview';
import { EntriesPage } from './pages/Entries';
import { ExportPage } from './pages/Export';
import { SettingsPage } from './pages/Settings';
import type { AppState, Entry, Page } from './lib/types';
import { loadState, saveState, defaultState } from './lib/storage';
import { monthOf, monthLabel, shiftMonth, thisMonth } from './lib/months';
import { exportMonth, exportBackup, parseBackup } from './lib/export';
import type { ExportFormat } from './lib/export';
import { enqueueAdd, enqueueDelete, markSettingsChanged, fullSync } from './lib/sync';

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

export default function App() {
  const [st, setSt] = useState<AppState>(loadState);
  const [month, setMonth] = useState<string>(thisMonth);
  const [sheet, setSheet] = useState(false);
  const { entries, currency, categories, subcats, catMode, page } = st;
  const twoLevel = catMode === 'twolevel';

  useEffect(() => { saveState(st); }, [st]);

  const patch = (p: Partial<AppState>) => setSt((s) => ({ ...s, ...p }));

  // ── Sync ────────────────────────────────────────────────────────
  // Offline-first: every change lands in localStorage immediately and
  // is queued; runSync pushes the queue and pulls fresh server state.
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
    runSync().catch(() => {});
    const onOnline = () => { runSync().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);

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

  const addEntry = (e: Entry) => {
    setSt((s) => ({ ...s, entries: [e, ...s.entries] }));
    setMonth(monthOf(e.date));   // jump to the month the entry landed in
    enqueueAdd(e);
    scheduleSync();
  };
  const del = (id: number) => {
    setSt((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    enqueueDelete(id);
    scheduleSync();
  };

  const onExport = (format: ExportFormat) => exportMonth(format, sorted, month, currency);

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const restored = parseBackup(String(reader.result));
      if (!restored) { window.alert('Not a valid SimpleLog backup file.'); return; }
      setSt({ ...restored, page: 'settings' });
      setMonth(thisMonth());
      restored.entries.forEach(enqueueAdd);   // pushed to the server on next sync
      markSettingsChanged();
      scheduleSync();
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-card)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Logo />
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.01em' }}>SimpleLog</span>
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
          <OverviewPage income={income} spent={spent} byCategory={byCategory} bySubcat={bySubcat} twoLevel={twoLevel} recent={sorted.slice(0, 4)} currency={currency} onSeeAll={() => patch({ page: 'entries' })} onDelete={del} />
        )}
        {page === 'entries' && (
          <EntriesPage entries={monthEntries} categories={categories} currency={currency} onDelete={del} />
        )}
        {page === 'export' && (
          <ExportPage entries={sorted} monthLabel={monthLabel(month)} onExport={onExport} />
        )}
        {page === 'settings' && (
          <SettingsPage
            currency={currency}
            categories={categories}
            subcats={subcats}
            catMode={catMode}
            onCatMode={(m) => changeSettings({ catMode: m })}
            onCurrency={(c) => changeSettings({ currency: c })}
            onAddCategory={(c) => mutateSettings((s) => ({ ...s, categories: [...s.categories, c], subcats: { ...s.subcats, [c]: [] } }))}
            onRemoveCategory={(c) => mutateSettings((s) => { const sc = { ...s.subcats }; delete sc[c]; return { ...s, categories: s.categories.filter((x) => x !== c), subcats: sc }; })}
            onAddSub={(cat, sub) => mutateSettings((s) => ({ ...s, subcats: { ...s.subcats, [cat]: [...(s.subcats[cat] || []), sub] } }))}
            onRemoveSub={(cat, sub) => mutateSettings((s) => ({ ...s, subcats: { ...s.subcats, [cat]: (s.subcats[cat] || []).filter((x) => x !== sub) } }))}
            onReset={() => { setSt({ ...defaultState(), catMode, page: 'settings' }); setMonth(thisMonth()); }}
            onBackup={() => exportBackup(stRef.current)}
            onImport={onImport}
            onSyncNow={runSync}
          />
        )}
      </main>

      {page !== 'export' && page !== 'settings' && (
        <div className="sl-fab">
          <Button variant="primary" size="lg" onClick={() => setSheet(true)} leadingIcon={<Icon name="plus" size={20} />} style={{ boxShadow: 'var(--shadow-md)' }}>Add</Button>
        </div>
      )}

      <AddSheet open={sheet} onClose={() => setSheet(false)} onAdd={addEntry} categories={categories} subcats={subcats} currency={currency} twoLevel={twoLevel} />
    </div>
  );
}
