// Ledger UI-kit — app shell, nav routing, state + persistence.
const { Amount, Card, Button, IconButton, Input, Select, SegmentedControl } = window.LedgerExpenseTrackerDesignSystem_b8666b;
const Icon = window.LedgerIcon;
const { DEFAULT_CATEGORIES, INCOME_CATS, SUBCATEGORIES, SEED, MonthStepper } = window.LedgerKit;
const { OverviewPage, EntriesPage, ExportPage, SettingsPage } = window.LedgerPages;

const LS = 'ledger.state.v4';
const MONTH = 'July 2026';

function loadState() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { entries: SEED, currency: 'KRW', categories: DEFAULT_CATEGORIES, subcats: SUBCATEGORIES, catMode: 'twolevel', page: 'overview' };
}

// ── Add-entry bottom sheet ───────────────────────────────────────
function AddSheet({ open, onClose, onAdd, categories, subcats, currency, twoLevel }) {
  const [kind, setKind] = React.useState('Expense');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [sub, setSub] = React.useState('');
  const [note, setNote] = React.useState('');
  React.useEffect(() => { if (open) { setKind('Expense'); setAmount(''); setCategory(''); setSub(''); setNote(''); } }, [open]);
  if (!open) return null;
  const cats = kind === 'Income' ? INCOME_CATS : categories;
  const subs = twoLevel && kind === 'Expense' && subcats && subcats[category] ? subcats[category] : [];
  const canSave = Number(amount) > 0 && category;
  const submit = () => {
    if (!canSave) return;
    const e = { id: Date.now(), kind: kind.toLowerCase(), amount: Number(amount), category, note: note || sub || category, date: new Date().toISOString().slice(0, 10) };
    if (sub) e.sub = sub;
    onAdd(e);
    onClose();
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,13,10,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, animation: 'ledgerFade 160ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--surface-card)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderBottom: 'none', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)', animation: 'ledgerRise 220ms var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>New entry</h3>
          <IconButton label="Close" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SegmentedControl options={['Expense', 'Income']} value={kind} onChange={(v) => { setKind(v); setCategory(''); setSub(''); }} fullWidth />
          <Input label="Amount" prefix={currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'JPY' ? '¥' : '£'} align="right" numeric placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
          <Select label="Category" placeholder="Choose…" options={cats} value={category} onChange={(e) => { setCategory(e.target.value); setSub(''); }} />
          {subs.length > 0 && (
            <Select label="Subcategory (optional)" placeholder="—" options={subs} value={sub} onChange={(e) => setSub(e.target.value)} />
          )}
          <Input label="Note" placeholder="e.g. Lunch — Kim's" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="primary" size="lg" fullWidth disabled={!canSave} onClick={submit} leadingIcon={<Icon name="check" size={18} />}>Add entry</Button>
        </div>
      </div>
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'entries', label: 'Entries', icon: 'list' },
  { id: 'export', label: 'Export', icon: 'download' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];
function NavTabs({ page, onNav }) {
  return (
    <nav style={{ display: 'flex', gap: 2 }}>
      {NAV.map((n) => {
        const active = page === n.id;
        return (
          <button key={n.id} onClick={() => onNav(n.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 12px',
            border: 'none', background: active ? 'var(--surface-inset)' : 'transparent', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
            fontWeight: active ? 600 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'background 120ms, color 120ms',
          }}>
            <Icon name={n.icon} size={16} />
            <span style={{ display: 'inline' }}>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const [st, setSt] = React.useState(loadState);
  const [sheet, setSheet] = React.useState(false);
  const { entries, currency, categories, subcats, catMode, page } = st;
  const twoLevel = catMode === 'twolevel';

  React.useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} }, [st]);

  const patch = (p) => setSt((s) => ({ ...s, ...p }));
  const income = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const spent = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  const bySubcat = {};
  entries.filter((e) => e.kind === 'expense').forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    if (e.sub) { (bySubcat[e.category] = bySubcat[e.category] || {}); bySubcat[e.category][e.sub] = (bySubcat[e.category][e.sub] || 0) + e.amount; }
  });
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  const addEntry = (e) => setSt((s) => ({ ...s, entries: [e, ...s.entries] }));
  const del = (id) => setSt((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));

  const exportFile = (fmt) => {
    const rows = [['Date', 'Kind', 'Category', 'Subcategory', 'Note', 'Amount']].concat(
      sorted.map((e) => [e.date, e.kind, e.category, e.sub || '', e.note, (e.kind === 'income' ? '' : '-') + e.amount])
    );
    const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csv = fmt === 'Excel' ? '\ufeff' + body : body;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ledger-july-2026.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-card)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="56" height="56" rx="15" fill="#CCF017"/>
              <rect x="20" y="13" width="24" height="13" rx="3" fill="#FBFBF6"/>
              <rect x="12" y="21" width="40" height="30" rx="7" fill="#0C0D0A"/>
              <rect x="40" y="31" width="13" height="10" rx="3.2" fill="#CCF017"/>
              <circle cx="46.5" cy="36" r="2" fill="#0C0D0A"/>
            </svg>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.01em' }}>MoneyLog</span>
          </div>
          <NavTabs page={page} onNav={(p) => patch({ page: p })} />
        </div>
      </header>

      <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '24px 24px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <MonthStepper label={MONTH} onPrev={() => {}} onNext={() => {}} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{entries.length} entries</span>
        </div>

        {page === 'overview' && (
          <OverviewPage income={income} spent={spent} byCategory={byCategory} bySubcat={bySubcat} twoLevel={twoLevel} recent={sorted.slice(0, 4)} currency={currency} onSeeAll={() => patch({ page: 'entries' })} onDelete={del} />
        )}
        {page === 'entries' && (
          <EntriesPage entries={entries} categories={categories} currency={currency} onDelete={del} />
        )}
        {page === 'export' && (
          <ExportPage entries={sorted} monthLabel={MONTH} currency={currency} onExport={exportFile} />
        )}
        {page === 'settings' && (
          <SettingsPage
            currency={currency}
            categories={categories}
            catMode={catMode}
            onCatMode={(m) => patch({ catMode: m })}
            subcats={subcats}
            onCurrency={(c) => patch({ currency: c })}
            onAddCategory={(c) => setSt((s) => ({ ...s, categories: [...s.categories, c], subcats: { ...s.subcats, [c]: [] } }))}
            onRemoveCategory={(c) => setSt((s) => { const sc = { ...s.subcats }; delete sc[c]; return { ...s, categories: s.categories.filter((x) => x !== c), subcats: sc }; })}
            onAddSub={(cat, sub) => setSt((s) => ({ ...s, subcats: { ...s.subcats, [cat]: [...((s.subcats && s.subcats[cat]) || []), sub] } }))}
            onRemoveSub={(cat, sub) => setSt((s) => ({ ...s, subcats: { ...s.subcats, [cat]: ((s.subcats && s.subcats[cat]) || []).filter((x) => x !== sub) } }))}
            onReset={() => setSt({ entries: SEED, currency: 'KRW', categories: DEFAULT_CATEGORIES, subcats: SUBCATEGORIES, catMode: catMode, page: 'settings' })}
          />
        )}
      </main>

      {page !== 'export' && page !== 'settings' && (
        <div style={{ position: 'fixed', right: 'max(24px, calc((100vw - var(--container-max)) / 2 - 8px))', bottom: 28, zIndex: 20 }}>
          <Button variant="primary" size="lg" onClick={() => setSheet(true)} leadingIcon={<Icon name="plus" size={20} />} style={{ boxShadow: 'var(--shadow-md)' }}>Add</Button>
        </div>
      )}

      <AddSheet open={sheet} onClose={() => setSheet(false)} onAdd={addEntry} categories={categories} subcats={subcats} currency={currency} twoLevel={twoLevel} />
    </div>
  );
}

window.LedgerApp = App;
