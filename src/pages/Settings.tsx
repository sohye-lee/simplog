import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Icon } from '../components/Icon';
import { Amount } from '../components/Amount';
import { SectionHeader } from '../kit/pieces';
import { SyncCard } from '../kit/SyncCard';
import type { Currency, RecurringRule } from '../lib/types';
import { nextOccurrence } from '../lib/recurring';
import { todayISO } from '../lib/months';

// A subcategory chip: rename inline, reorder with ‹ ›, remove with ✕.
function SubChip({ value, canLeft, canRight, onRename, onMove, onRemove }: {
  value: string;
  canLeft: boolean;
  canRight: boolean;
  onRename: (next: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { const v = draft.trim(); if (v && v !== value) onRename(v); else setDraft(value); };
  const arrowBtn = (dir: -1 | 1, enabled: boolean) => (
    <button type="button" disabled={!enabled} onClick={() => onMove(dir)} aria-label={dir === -1 ? 'Move left' : 'Move right'}
      style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: enabled ? 'pointer' : 'default', color: enabled ? 'var(--text-muted)' : 'var(--ink-200)', padding: '2px 1px' }}>
      <Icon name={dir === -1 ? 'chevron-left' : 'chevron-right'} size={13} />
    </button>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, height: 30, padding: '0 4px 0 4px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
      {arrowBtn(-1, canLeft)}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        aria-label={'Rename ' + value}
        style={{ width: `${Math.max(draft.length, 3) + 0.5}ch`, minWidth: '3ch', border: 'none', background: 'transparent', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 0 }} />
      {arrowBtn(1, canRight)}
      <button type="button" onClick={onRemove} aria-label={'Remove ' + value} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 2px 2px 3px', borderLeft: '1px solid var(--border)', marginLeft: 2 }}><Icon name="x" size={13} /></button>
    </span>
  );
}

// One category row: drag handle (order = importance), editable name,
// expandable subcategory editor.
function CategoryEditorRow({ cat, subs, dragging, onHandleDown, onRenameCategory, onRemoveCategory, onAddSub, onRenameSub, onMoveSub, onRemoveSub }: {
  cat: string;
  subs: string[];
  dragging: boolean;
  onHandleDown: (e: ReactPointerEvent) => void;
  onRenameCategory: (cat: string, next: string) => void;
  onRemoveCategory: (cat: string) => void;
  onAddSub: (cat: string, sub: string) => void;
  onRenameSub: (cat: string, oldSub: string, next: string) => void;
  onMoveSub: (cat: string, index: number, dir: -1 | 1) => void;
  onRemoveSub: (cat: string, sub: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const [name, setName] = useState(cat);
  useEffect(() => setName(cat), [cat]);
  const addSub = () => { const v = val.trim(); if (v && !subs.includes(v)) { onAddSub(cat, v); setVal(''); } };
  const commitName = () => { const v = name.trim(); if (v && v !== cat) onRenameCategory(cat, v); else setName(cat); };
  return (
    <div style={{
      border: `1px solid ${dragging ? 'var(--border-focus)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
      boxShadow: dragging ? 'var(--shadow-md)' : 'none',
      opacity: dragging ? 0.95 : 1,
      background: 'var(--surface-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', background: 'var(--surface-sunken)' }}>
        <span
          onPointerDown={onHandleDown}
          style={{ display: 'inline-flex', color: 'var(--text-muted)', cursor: 'grab', padding: '6px 6px 6px 0', touchAction: 'none' }}
          aria-label={'Reorder ' + cat}
        >
          <Icon name="grip" size={15} />
        </span>
        <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Collapse ' + cat : 'Expand ' + cat} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <span style={{ display: 'inline-flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}><Icon name="chevron-right" size={14} /></span>
        </button>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          aria-label={'Rename category ' + cat}
          style={{ flex: 1, minWidth: 0, border: '1px solid transparent', borderRadius: 'var(--radius-xs)', background: 'transparent', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', padding: '4px 6px' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--surface-card)'; }}
          onBlurCapture={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0 }}>{subs.length} sub</span>
        <button onClick={() => onRemoveCategory(cat)} aria-label={'Remove ' + cat} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Icon name="trash-2" size={15} /></button>
      </div>
      {open && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {subs.map((s, i) => (
              <SubChip key={s} value={s} canLeft={i > 0} canRight={i < subs.length - 1}
                onRename={(next) => { if (next && !subs.includes(next)) onRenameSub(cat, s, next); }}
                onMove={(dir) => onMoveSub(cat, i, dir)}
                onRemove={() => onRemoveSub(cat, s)} />
            ))}
            {subs.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No subcategories yet.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSub(); }} placeholder={'Add to ' + cat + '…'}
              style={{ flex: 1, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', minWidth: 0 }} />
            <Button variant="secondary" size="sm" onClick={addSub} leadingIcon={<Icon name="plus" size={15} />} style={{ height: 38 }}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsPageProps {
  currency: Currency;
  categories: string[];
  subcats: Record<string, string[]>;
  recurring: RecurringRule[];
  onCurrency: (currency: Currency) => void;
  onAddCategory: (cat: string) => void;
  onRenameCategory: (cat: string, next: string) => void;
  onRemoveCategory: (cat: string) => void;
  onReorderCategories: (categories: string[]) => void;
  onAddSub: (cat: string, sub: string) => void;
  onRenameSub: (cat: string, oldSub: string, next: string) => void;
  onMoveSub: (cat: string, index: number, dir: -1 | 1) => void;
  onRemoveSub: (cat: string, sub: string) => void;
  onRemoveRecurring: (id: number) => void;
  onReset: () => void;
  onBackup: () => Promise<void>;
  onImport: (file: File) => void;
  onSyncNow: () => Promise<void>;
}

export function SettingsPage({ currency, categories, subcats, recurring, onCurrency, onAddCategory, onRenameCategory, onRemoveCategory, onReorderCategories, onAddSub, onRenameSub, onMoveSub, onRemoveSub, onRemoveRecurring, onReset, onBackup, onImport, onSyncNow }: SettingsPageProps) {
  const [newCat, setNewCat] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const add = () => { const v = newCat.trim(); if (v && !categories.includes(v)) { onAddCategory(v); setNewCat(''); } };

  // ── Drag-to-reorder (pointer events → works for mouse + touch) ──
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDown = (i: number) => (e: ReactPointerEvent) => {
    e.preventDefault();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    setDragIdx(i);
  };
  const handleMove = (e: ReactPointerEvent) => {
    if (dragIdx === null) return;
    const y = e.clientY;
    for (let j = 0; j < categories.length; j++) {
      if (j === dragIdx) continue;
      const r = rowRefs.current[j]?.getBoundingClientRect();
      if (!r) continue;
      const mid = r.top + r.height / 2;
      if ((j < dragIdx && y < mid) || (j > dragIdx && y > mid)) {
        const next = [...categories];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(j, 0, moved);
        onReorderCategories(next);
        setDragIdx(j);
        break;
      }
    }
  };
  const handleUp = () => setDragIdx(null);

  const today = todayISO();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SyncCard onSyncNow={onSyncNow} />

      <Card padding="md">
        <SectionHeader title="Currency" />
        <Select value={currency} onChange={(e) => onCurrency(e.target.value as Currency)} options={[
          { value: 'KRW', label: '₩  Korean won (KRW)' },
          { value: 'USD', label: '$  US dollar (USD)' },
          { value: 'EUR', label: '€  Euro (EUR)' },
          { value: 'JPY', label: '¥  Japanese yen (JPY)' },
          { value: 'GBP', label: '£  British pound (GBP)' },
        ]} />
      </Card>

      <Card padding="md">
        <SectionHeader title="Categories" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>drag ≡ to set importance</span>} />
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        >
          {categories.map((c, i) => (
            <div key={c} ref={(el) => { rowRefs.current[i] = el; }}>
              <CategoryEditorRow
                cat={c}
                subs={subcats[c] || []}
                dragging={dragIdx === i}
                onHandleDown={handleDown(i)}
                onRenameCategory={onRenameCategory}
                onRemoveCategory={onRemoveCategory}
                onAddSub={onAddSub}
                onRenameSub={onRenameSub}
                onMoveSub={onMoveSub}
                onRemoveSub={onRemoveSub}
              />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
          The order here is the order on the Overview breakdown — most important first.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input label="Add category" placeholder="e.g. Subscriptions" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          </div>
          <Button variant="secondary" onClick={add} leadingIcon={<Icon name="plus" size={16} />} style={{ height: 44 }}>Add</Button>
        </div>
      </Card>

      <Card padding="md">
        <SectionHeader title="Recurring" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{recurring.length || ''}</span>} />
        {recurring.length === 0 ? (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            No recurring entries. Choose "Repeats monthly / weekly" when adding an entry — rent, salary, subscriptions log themselves.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recurring.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}><Icon name="repeat" size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-md)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.note}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    {r.category}{r.sub ? ` › ${r.sub}` : ''} · {r.freq} · next {nextOccurrence(r, today)}
                  </div>
                </div>
                <Amount value={r.kind === 'expense' ? -r.amount : r.amount} size="sm" signed={r.kind === 'income'} emphasis={r.kind === 'income' ? 'accent' : 'normal'} currency={currency} />
                <button onClick={() => onRemoveRecurring(r.id)} aria-label={'Stop recurring ' + r.note} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Icon name="trash-2" size={15} /></button>
              </div>
            ))}
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 10 }}>
              Removing a rule stops future entries — already-logged ones stay.
            </div>
          </div>
        )}
      </Card>

      <Card padding="md">
        <SectionHeader title="Data" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Save everything as a JSON backup file.</div>
            <Button variant="secondary" onClick={onBackup} leadingIcon={<Icon name="download" size={15} />}>Backup</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Restore from a backup file (replaces current data).</div>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import</Button>
            <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Erase all entries and restore default categories.</div>
            <Button variant="secondary" onClick={onReset}>Reset data</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
