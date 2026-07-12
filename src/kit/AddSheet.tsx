// Add-entry bottom sheet — slides up, dims the background.
// "Frequent" chips prefill the whole form from past entries; the
// Repeat select turns the entry into a recurring rule.
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon } from '../components/Icon';
import { CURRENCY_SYMBOL } from '../components/Amount';
import type { Currency, Entry, Freq } from '../lib/types';
import { INCOME_CATS } from '../lib/data';
import { todayISO } from '../lib/months';

interface Preset {
  kind: Entry['kind'];
  category: string;
  sub?: string;
  note: string;
  amount: number;
  count: number;
}

// Most-logged (note+category) combos — min 2 occurrences, newest
// amount wins, expenses first since that's what you log on the go.
function frequentPresets(entries: Entry[], limit = 6): Preset[] {
  const map = new Map<string, Preset & { lastDate: string }>();
  for (const e of entries) {
    const key = `${e.kind}|${e.category}|${e.sub || ''}|${e.note}`;
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      if (e.date > cur.lastDate) { cur.amount = e.amount; cur.lastDate = e.date; }
    } else {
      map.set(key, { kind: e.kind, category: e.category, sub: e.sub, note: e.note, amount: e.amount, count: 1, lastDate: e.date });
    }
  }
  return [...map.values()]
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
    .slice(0, limit);
}

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: Entry, repeat?: Freq) => void;
  categories: string[];
  subcats: Record<string, string[]>;
  currency: Currency;
  entries: Entry[];       // full history — feeds the Frequent chips
}

export function AddSheet({ open, onClose, onAdd, categories, subcats, currency, entries }: AddSheetProps) {
  const [kind, setKind] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [sub, setSub] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [repeat, setRepeat] = useState('');

  useEffect(() => {
    if (open) { setKind('Expense'); setAmount(''); setCategory(''); setSub(''); setNote(''); setDate(todayISO()); setRepeat(''); }
  }, [open]);

  const presets = useMemo(() => frequentPresets(entries), [entries]);

  if (!open) return null;

  const cats = kind === 'Income' ? INCOME_CATS : categories;
  const subs = kind === 'Expense' && subcats[category] ? subcats[category] : [];
  const canSave = Number(amount) > 0 && !!category && !!date;

  const applyPreset = (p: Preset) => {
    setKind(p.kind === 'income' ? 'Income' : 'Expense');
    setAmount(String(p.amount));
    setCategory(p.category);
    setSub(p.sub || '');
    setNote(p.note);
  };

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
    onAdd(e, (repeat || undefined) as Freq | undefined);
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
          {presets.length > 0 && (
            <div>
              <div className="overline" style={{ marginBottom: 8 }}>Frequent</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {presets.map((p) => (
                  <button key={`${p.kind}-${p.category}-${p.note}`} onClick={() => applyPreset(p)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-inset)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '100%' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.note}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                      {CURRENCY_SYMBOL[currency]}{p.amount.toLocaleString('en-US')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <SegmentedControl options={['Expense', 'Income']} value={kind} onChange={(v) => { setKind(v); setCategory(''); setSub(''); }} fullWidth />
          <Input label="Amount" prefix={CURRENCY_SYMBOL[currency]} align="right" numeric placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} autoFocus />
          <Select label="Category" placeholder="Choose…" options={cats} value={category} onChange={(e) => { setCategory(e.target.value); setSub(''); }} />
          {subs.length > 0 && (
            <Select label="Subcategory (optional)" placeholder="—" options={subs} value={sub} onChange={(e) => setSub(e.target.value)} />
          )}
          <Input label="Note" placeholder="e.g. Lunch — Kim's" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label="Repeat" options={[
              { value: '', label: 'No repeat' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'weekly', label: 'Weekly' },
            ]} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </div>
          {repeat && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: -8 }}>
              Logs itself every {repeat === 'monthly' ? 'month' : 'week'} from the date above. Manage in Settings › Recurring.
            </div>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!canSave} onClick={submit} leadingIcon={<Icon name="check" size={18} />}>Add entry</Button>
        </div>
      </div>
    </div>
  );
}
