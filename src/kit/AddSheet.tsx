// Add-entry bottom sheet — slides up, dims the background.
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon } from '../components/Icon';
import { CURRENCY_SYMBOL } from '../components/Amount';
import type { Currency, Entry } from '../lib/types';
import { INCOME_CATS } from '../lib/data';
import { todayISO } from '../lib/months';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: Entry) => void;
  categories: string[];
  subcats: Record<string, string[]>;
  currency: Currency;
  twoLevel: boolean;
}

export function AddSheet({ open, onClose, onAdd, categories, subcats, currency, twoLevel }: AddSheetProps) {
  const [kind, setKind] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [sub, setSub] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (open) { setKind('Expense'); setAmount(''); setCategory(''); setSub(''); setNote(''); setDate(todayISO()); }
  }, [open]);

  if (!open) return null;

  const cats = kind === 'Income' ? INCOME_CATS : categories;
  const subs = twoLevel && kind === 'Expense' && subcats[category] ? subcats[category] : [];
  const canSave = Number(amount) > 0 && !!category && !!date;

  const submit = () => {
    if (!canSave) return;
    const e: Entry = {
      id: Date.now(),
      kind: kind.toLowerCase() as Entry['kind'],
      amount: Number(amount),
      category,
      note: note || sub || category,
      date,
    };
    if (sub) e.sub = sub;
    onAdd(e);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,13,10,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, animation: 'slFade 160ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--surface-card)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderBottom: 'none', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)', paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom, 0px))', animation: 'slRise 220ms var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>New entry</h3>
          <IconButton label="Close" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SegmentedControl options={['Expense', 'Income']} value={kind} onChange={(v) => { setKind(v); setCategory(''); setSub(''); }} fullWidth />
          <Input label="Amount" prefix={CURRENCY_SYMBOL[currency]} align="right" numeric placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
          <Select label="Category" placeholder="Choose…" options={cats} value={category} onChange={(e) => { setCategory(e.target.value); setSub(''); }} />
          {subs.length > 0 && (
            <Select label="Subcategory (optional)" placeholder="—" options={subs} value={sub} onChange={(e) => setSub(e.target.value)} />
          )}
          <Input label="Note" placeholder="e.g. Lunch — Kim's" value={note} onChange={(e) => setNote(e.target.value)} />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="primary" size="lg" fullWidth disabled={!canSave} onClick={submit} leadingIcon={<Icon name="check" size={18} />}>Add entry</Button>
        </div>
      </div>
    </div>
  );
}
