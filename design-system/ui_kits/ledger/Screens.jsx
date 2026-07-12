// Ledger UI-kit — shared data + presentational pieces.
// Shares via window; consumed by Pages.jsx and App.jsx.
const { Amount, StatCard, CategoryBadge, Card, Button, IconButton, Input, Select, SegmentedControl } = window.LedgerExpenseTrackerDesignSystem_b8666b;
const Icon = window.LedgerIcon;

// A well-organized standard personal-finance set. Users add/remove
// their own in Settings.
const DEFAULT_CATEGORIES = ['Food', 'Housing', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'];
const INCOME_CATS = ['Salary', 'Side', 'Other'];

// Optional second level — used only when Category style = Two-level.
const SUBCATEGORIES = {
  Food: ['Groceries', 'Dining out', 'Coffee', 'Delivery'],
  Housing: ['Rent', 'Maintenance', 'Furniture'],
  Transport: ['Transit', 'Taxi', 'Fuel'],
  Bills: ['Phone', 'Internet', 'Utilities', 'Subscriptions'],
  Shopping: ['Clothing', 'Electronics', 'Home'],
  Health: ['Pharmacy', 'Clinic', 'Fitness'],
  Entertainment: ['Movies', 'Games', 'Events', 'Hobbies'],
  Other: ['Misc', 'Gifts', 'Fees'],
};

const SEED = [
  { id: 1, kind: 'income',  amount: 3200000, category: 'Salary',        note: 'July salary',        date: '2026-07-25' },
  { id: 2, kind: 'expense', amount: 900000,  category: 'Housing',       sub: 'Rent',       note: 'Monthly rent',       date: '2026-07-01' },
  { id: 3, kind: 'expense', amount: 48300,   category: 'Food',          sub: 'Groceries',  note: 'Groceries · Emart',  date: '2026-07-03' },
  { id: 4, kind: 'expense', amount: 12500,   category: 'Transport',     sub: 'Transit',    note: 'Metro top-up',       date: '2026-07-04' },
  { id: 5, kind: 'expense', amount: 41000,   category: 'Food',          sub: 'Coffee',     note: 'Coffee · 10 cups',   date: '2026-07-06' },
  { id: 6, kind: 'income',  amount: 420000,  category: 'Side',          note: 'Freelance invoice',  date: '2026-07-07' },
  { id: 7, kind: 'expense', amount: 29000,   category: 'Entertainment', sub: 'Movies',     note: 'Cinema + snacks',    date: '2026-07-08' },
  { id: 8, kind: 'expense', amount: 66000,   category: 'Health',        sub: 'Pharmacy',   note: 'Pharmacy',           date: '2026-07-09' },
  { id: 9, kind: 'expense', amount: 158000,  category: 'Food',          sub: 'Dining out', note: 'Dinner · birthday',  date: '2026-07-09' },
  { id: 10, kind: 'expense', amount: 55000,  category: 'Bills',         sub: 'Phone',      note: 'Phone + internet',   date: '2026-07-10' },
  { id: 11, kind: 'expense', amount: 89000,  category: 'Shopping',      sub: 'Clothing',   note: 'Summer tee',         date: '2026-07-12' },
];

function fmtDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Overline section header ──────────────────────────────────────
function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
      <span className="ledger-overline">{title}</span>
      {right}
    </div>
  );
}

// ── Month stepper ────────────────────────────────────────────────
function MonthStepper({ label, onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconButton label="Previous month" variant="outline" onClick={onPrev}><Icon name="chevron-left" /></IconButton>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 600, minWidth: 150, textAlign: 'center' }}>{label}</span>
      <IconButton label="Next month" variant="outline" onClick={onNext}><Icon name="chevron-right" /></IconButton>
    </div>
  );
}

// ── Summary strip: Income / Spent / Left ─────────────────────────
function SummaryStrip({ income, spent, currency }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <StatCard label="Income" value={income} currency={currency} />
      <StatCard label="Spent" value={spent} currency={currency} delta={income ? Math.round((spent / income) * 100) + '% of income' : '—'} />
      <StatCard label="Left" value={income - spent} currency={currency} accent />
    </div>
  );
}

// ── Category breakdown with proportional bars ────────────────────
// twoLevel: parent rows expand to reveal subcategory amounts.
function CategoryBreakdown({ byCategory, bySubcat, total, currency, twoLevel }) {
  const [open, setOpen] = React.useState({});
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map(([cat, amt]) => {
        const subs = twoLevel && bySubcat && bySubcat[cat] ? Object.entries(bySubcat[cat]).sort((a, b) => b[1] - a[1]) : [];
        const canExpand = subs.length > 0;
        const isOpen = open[cat];
        return (
          <div key={cat}>
            <div
              onClick={() => canExpand && setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: canExpand ? 'pointer' : 'default' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {canExpand && (
                  <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>
                    <Icon name="chevron-right" size={13} />
                  </span>
                )}
                <CategoryBadge>{cat}</CategoryBadge>
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{total ? Math.round((amt / total) * 100) : 0}%</span>
                <Amount value={amt} size="sm" currency={currency} />
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (total ? (amt / total) * 100 : 0) + '%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)', transition: 'width 260ms var(--ease-out)' }} />
            </div>
            {canExpand && isOpen && (
              <div style={{ margin: '10px 0 4px 18px', paddingLeft: 12, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subs.map(([s, sAmt]) => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{s}</span>
                    <Amount value={sAmt} size="xs" currency={currency} emphasis="muted" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && <EmptyState line="No spending logged this month." />}
    </div>
  );
}

// ── A single ledger row ──────────────────────────────────────────
function EntryRow({ entry, onDelete, currency }) {
  const [hover, setHover] = React.useState(false);
  const income = entry.kind === 'income';
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid var(--ink-100)' }}
    >
      <div style={{ width: 46, flexShrink: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
        {fmtDay(entry.date)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.note}</div>
        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CategoryBadge size="sm" dot={!income}>{entry.category}</CategoryBadge>
          {entry.sub && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{entry.sub}</span>}
        </div>
      </div>
      <Amount value={income ? entry.amount : -entry.amount} size="sm" signed={income} emphasis={income ? 'accent' : 'normal'} currency={currency} />
      <div style={{ width: 28, flexShrink: 0, opacity: hover ? 1 : 0, transition: 'opacity 120ms' }}>
        <IconButton label="Delete entry" size="sm" onClick={() => onDelete(entry.id)}><Icon name="trash-2" size={15} /></IconButton>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────
function EmptyState({ line, hint }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text-secondary)', marginBottom: 6 }}>{line}</div>
      {hint && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}

window.LedgerKit = {
  DEFAULT_CATEGORIES, INCOME_CATS, SUBCATEGORIES, SEED, fmtDay,
  SectionHeader, MonthStepper, SummaryStrip, CategoryBreakdown, EntryRow, EmptyState,
};
