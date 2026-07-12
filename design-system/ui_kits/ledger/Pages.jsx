// Ledger UI-kit — the four app pages.
const { Amount, StatCard, CategoryBadge, Card, Button, IconButton, Input, Select, SegmentedControl } = window.LedgerExpenseTrackerDesignSystem_b8666b;
const LIcon = window.LedgerIcon;
const K = window.LedgerKit;

// ═══ OVERVIEW ════════════════════════════════════════════════════
function OverviewPage({ income, spent, byCategory, bySubcat, twoLevel, recent, currency, onSeeAll, onDelete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <K.SummaryStrip income={income} spent={spent} currency={currency} />
      <Card padding="md">
        <K.SectionHeader title="Where it went" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Object.keys(byCategory).length} categories{twoLevel ? ' · tap to expand' : ''}</span>} />
        <K.CategoryBreakdown byCategory={byCategory} bySubcat={bySubcat} twoLevel={twoLevel} total={spent} currency={currency} />
      </Card>
      <Card padding="md">
        <K.SectionHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={onSeeAll} trailingIcon={<LIcon name="chevron-right" size={15} />}>See all</Button>} />
        {recent.length ? recent.map((e) => <K.EntryRow key={e.id} entry={e} onDelete={onDelete} currency={currency} />)
          : <K.EmptyState line="Nothing logged yet." hint="Tap Add to record your first entry." />}
      </Card>
    </div>
  );
}

// ═══ ENTRIES ═════════════════════════════════════════════════════
function EntriesPage({ entries, categories, currency, onDelete }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const chips = ['All', ...categories];
  const filtered = entries
    .filter((e) => filter === 'All' || e.category === filter)
    .filter((e) => !query || (e.note + ' ' + e.category).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}><LIcon name="search" size={16} /></span>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes or categories…"
          style={{ width: '100%', height: 44, padding: '0 12px 0 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <span key={c} onClick={() => setFilter(c)} style={{ cursor: 'pointer' }}>
            <CategoryBadge selected={filter === c} dot={c !== 'All'}>{c}</CategoryBadge>
          </span>
        ))}
      </div>
      <Card padding="md">
        <K.SectionHeader title={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`} />
        {filtered.length ? filtered.map((e) => <K.EntryRow key={e.id} entry={e} onDelete={onDelete} currency={currency} />)
          : <K.EmptyState line="No matching entries." hint="Try a different search or filter." />}
      </Card>
    </div>
  );
}

// ═══ EXPORT ══════════════════════════════════════════════════════
function ExportPage({ entries, monthLabel, currency, onExport }) {
  const [fmt, setFmt] = React.useState('CSV');
  const count = entries.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding="lg">
        <K.SectionHeader title="Export this month" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{monthLabel}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{count} entries · ready to download</div>
            </div>
            <span style={{ color: 'var(--text-muted)' }}><LIcon name="file-down" size={30} strokeWidth={1.5} /></span>
          </div>
          <div>
            <div className="ledger-overline" style={{ marginBottom: 8 }}>Format</div>
            <SegmentedControl options={['CSV', 'Excel']} value={fmt} onChange={setFmt} fullWidth />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
              {fmt === 'CSV' ? 'A plain .csv file — opens in any spreadsheet app.' : 'A .csv encoded for Excel (UTF-8 BOM) so Korean text stays intact.'}
            </div>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={() => onExport(fmt)} leadingIcon={<LIcon name="download" size={18} />}>
            Download {monthLabel}
          </Button>
        </div>
      </Card>
      <Card padding="md">
        <K.SectionHeader title="What's included" />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Date', 'Kind (income / expense)', 'Category', 'Note', 'Amount (signed)'].map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--lime-700)' }}><LIcon name="check" size={15} /></span>{c}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══ SETTINGS ════════════════════════════════════════════════════

// A pill chip with an ✕ remove button.
function Chip({ label, onRemove, tone }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 6px 0 10px', borderRadius: 'var(--radius-pill)', background: tone === 'sub' ? 'var(--surface-card)' : 'var(--surface-inset)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
      {label}
      <button onClick={onRemove} aria-label={'Remove ' + label} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><LIcon name="x" size={13} /></button>
    </span>
  );
}

// One category with an expandable subcategory editor (two-level mode).
function CategoryEditorRow({ cat, subs, onRemoveCategory, onAddSub, onRemoveSub }) {
  const [open, setOpen] = React.useState(false);
  const [val, setVal] = React.useState('');
  const addSub = () => { const v = val.trim(); if (v && !subs.includes(v)) { onAddSub(cat, v); setVal(''); } };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-sunken)' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', padding: 0 }}>
          <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}><LIcon name="chevron-right" size={14} /></span>
          {cat}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>{subs.length} sub</span>
        </button>
        <button onClick={() => onRemoveCategory(cat)} aria-label={'Remove ' + cat} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><LIcon name="trash-2" size={15} /></button>
      </div>
      {open && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {subs.map((s) => <Chip key={s} label={s} tone="sub" onRemove={() => onRemoveSub(cat, s)} />)}
            {subs.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No subcategories yet.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }} placeholder={'Add to ' + cat + '…'}
              style={{ flex: 1, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
            <Button variant="secondary" size="sm" onClick={addSub} leadingIcon={<LIcon name="plus" size={15} />} style={{ height: 38 }}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ currency, categories, subcats, catMode, onCatMode, onCurrency, onAddCategory, onRemoveCategory, onAddSub, onRemoveSub, onReset }) {
  const [newCat, setNewCat] = React.useState('');
  const add = () => { const v = newCat.trim(); if (v && !categories.includes(v)) { onAddCategory(v); setNewCat(''); } };
  const twoLevel = catMode === 'twolevel';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding="md">
        <K.SectionHeader title="Category style" />
        <SegmentedControl options={[{ value: 'simple', label: 'Simple' }, { value: 'twolevel', label: 'Two-level' }]} value={catMode} onChange={onCatMode} fullWidth />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
          {catMode === 'simple'
            ? 'One flat list. Fastest to log — pick a category and go. Details live in the note.'
            : 'A subcategory under each category (Food › Coffee). More precise, one extra tap per entry. Overview rows expand to show sub-totals.'}
        </div>
      </Card>
      <Card padding="md">
        <K.SectionHeader title="Currency" />
        <Select value={currency} onChange={(e) => onCurrency(e.target.value)} options={[
          { value: 'KRW', label: '₩  Korean won (KRW)' },
          { value: 'USD', label: '$  US dollar (USD)' },
          { value: 'EUR', label: '€  Euro (EUR)' },
          { value: 'JPY', label: '¥  Japanese yen (JPY)' },
          { value: 'GBP', label: '£  British pound (GBP)' },
        ]} />
      </Card>

      <Card padding="md">
        <K.SectionHeader title={twoLevel ? 'Categories & subcategories' : 'Categories'} right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{categories.length}</span>} />
        {twoLevel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {categories.map((c) => (
              <CategoryEditorRow key={c} cat={c} subs={(subcats && subcats[c]) || []} onRemoveCategory={onRemoveCategory} onAddSub={onAddSub} onRemoveSub={onRemoveSub} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {categories.map((c) => <Chip key={c} label={c} onRemove={() => onRemoveCategory(c)} />)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input label={twoLevel ? 'Add category' : 'Add category'} placeholder="e.g. Subscriptions" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          </div>
          <Button variant="secondary" onClick={add} leadingIcon={<LIcon name="plus" size={16} />} style={{ height: 44 }}>Add</Button>
        </div>
      </Card>

      <Card padding="md">
        <K.SectionHeader title="Data" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Reset the prototype to its sample July data.</div>
          <Button variant="secondary" onClick={onReset}>Reset data</Button>
        </div>
      </Card>
    </div>
  );
}

window.LedgerPages = { OverviewPage, EntriesPage, ExportPage, SettingsPage };
