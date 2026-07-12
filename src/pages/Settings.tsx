import { useRef, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../kit/pieces';
import { SyncCard } from '../kit/SyncCard';
import type { CatMode, Currency } from '../lib/types';

// A pill chip with an ✕ remove button.
function Chip({ label, onRemove, tone }: { label: string; onRemove: () => void; tone?: 'sub' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 6px 0 10px', borderRadius: 'var(--radius-pill)', background: tone === 'sub' ? 'var(--surface-card)' : 'var(--surface-inset)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
      {label}
      <button onClick={onRemove} aria-label={'Remove ' + label} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><Icon name="x" size={13} /></button>
    </span>
  );
}

// One category with an expandable subcategory editor (two-level mode).
function CategoryEditorRow({ cat, subs, onRemoveCategory, onAddSub, onRemoveSub }: {
  cat: string;
  subs: string[];
  onRemoveCategory: (cat: string) => void;
  onAddSub: (cat: string, sub: string) => void;
  onRemoveSub: (cat: string, sub: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const addSub = () => { const v = val.trim(); if (v && !subs.includes(v)) { onAddSub(cat, v); setVal(''); } };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-sunken)' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', padding: 0 }}>
          <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}><Icon name="chevron-right" size={14} /></span>
          {cat}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>{subs.length} sub</span>
        </button>
        <button onClick={() => onRemoveCategory(cat)} aria-label={'Remove ' + cat} style={{ display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Icon name="trash-2" size={15} /></button>
      </div>
      {open && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {subs.map((s) => <Chip key={s} label={s} tone="sub" onRemove={() => onRemoveSub(cat, s)} />)}
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
  catMode: CatMode;
  onCatMode: (mode: CatMode) => void;
  onCurrency: (currency: Currency) => void;
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  onAddSub: (cat: string, sub: string) => void;
  onRemoveSub: (cat: string, sub: string) => void;
  onReset: () => void;
  onBackup: () => Promise<void>;
  onImport: (file: File) => void;
  onSyncNow: () => Promise<void>;
}

export function SettingsPage({ currency, categories, subcats, catMode, onCatMode, onCurrency, onAddCategory, onRemoveCategory, onAddSub, onRemoveSub, onReset, onBackup, onImport, onSyncNow }: SettingsPageProps) {
  const [newCat, setNewCat] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const add = () => { const v = newCat.trim(); if (v && !categories.includes(v)) { onAddCategory(v); setNewCat(''); } };
  const twoLevel = catMode === 'twolevel';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SyncCard onSyncNow={onSyncNow} />
      <Card padding="md">
        <SectionHeader title="Category style" />
        <SegmentedControl options={[{ value: 'simple', label: 'Simple' }, { value: 'twolevel', label: 'Two-level' }]} value={catMode} onChange={(m) => onCatMode(m as CatMode)} fullWidth />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
          {catMode === 'simple'
            ? 'One flat list. Fastest to log — pick a category and go. Details live in the note.'
            : 'A subcategory under each category (Food › Coffee). More precise, one extra tap per entry. Overview rows expand to show sub-totals.'}
        </div>
      </Card>
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
        <SectionHeader title={twoLevel ? 'Categories & subcategories' : 'Categories'} right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{categories.length}</span>} />
        {twoLevel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {categories.map((c) => (
              <CategoryEditorRow key={c} cat={c} subs={subcats[c] || []} onRemoveCategory={onRemoveCategory} onAddSub={onAddSub} onRemoveSub={onRemoveSub} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {categories.map((c) => <Chip key={c} label={c} onRemove={() => onRemoveCategory(c)} />)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input label="Add category" placeholder="e.g. Subscriptions" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          </div>
          <Button variant="secondary" onClick={add} leadingIcon={<Icon name="plus" size={16} />} style={{ height: 44 }}>Add</Button>
        </div>
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
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Reset everything to the sample dataset.</div>
            <Button variant="secondary" onClick={onReset}>Reset data</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
