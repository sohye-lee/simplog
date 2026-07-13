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
import { evalExpr, isExpression } from '../lib/calc';

// ── Mini calculator pad ──────────────────────────────────────────
const CALC_KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '⌫', '+'] as const;

function CalcPad({ expr, setExpr, currency, onUse }: {
  expr: string;
  setExpr: (fn: (e: string) => string) => void;
  currency: Currency;
  onUse: (value: number) => void;
}) {
  const val = evalExpr(expr);
  const press = (k: string) => setExpr((e) => (k === '⌫' ? e.slice(0, -1) : e + k));
  return (
    <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10, background: 'var(--surface-sunken)' }}>
      <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '0 6px', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums slashed-zero' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expr || '0'}</span>
        {expr && val !== null && isExpression(expr) && (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>= {val.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {CALC_KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(k)}
            style={{ height: 42, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '÷×−+⌫'.includes(k) ? 'var(--surface-inset)' : 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', cursor: 'pointer', lineHeight: 1 }}>
            {k}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" onClick={() => setExpr(() => '')}
          style={{ width: 72, height: 42, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1 }}>
          C
        </button>
        <Button variant="primary" fullWidth disabled={val === null || val <= 0}
          onClick={() => val !== null && onUse(Math.round(val * 100) / 100)}>
          {val !== null && val > 0
            ? `Use ${CURRENCY_SYMBOL[currency]}${(Math.round(val * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
            : 'Use'}
        </Button>
      </div>
    </div>
  );
}

interface Preset {
  kind: Entry['kind'];
  category: string;
  sub?: string;
  note: string;
  amount: number;
  count: number;
}

// Most-logged (note+category) combos — min 2 occurrences, newest
// amount/sub win. Sub is NOT part of the key: "Coffee" logged with
// and without a subcategory is still the same habit.
function frequentPresets(entries: Entry[], limit = 6): Preset[] {
  const map = new Map<string, Preset & { lastDate: string }>();
  for (const e of entries) {
    const key = `${e.kind}|${e.category}|${e.note}`;
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      if (e.date > cur.lastDate) { cur.amount = e.amount; cur.lastDate = e.date; }
      if (!cur.sub && e.sub) cur.sub = e.sub;
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
  editing?: Entry | null; // set → the sheet edits this entry in place
}

export function AddSheet({ open, onClose, onAdd, categories, subcats, currency, entries, editing = null }: AddSheetProps) {
  const [kind, setKind] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [sub, setSub] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [repeat, setRepeat] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setKind(editing.kind === 'income' ? 'Income' : 'Expense');
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setSub(editing.sub || '');
      setNote(editing.note);
      setDate(editing.date);
    } else {
      setKind('Expense'); setAmount(''); setCategory(''); setSub(''); setNote(''); setDate(todayISO());
    }
    setRepeat(''); setCalcOpen(false); setCalcExpr('');
  }, [open, editing]);

  const presets = useMemo(() => frequentPresets(entries), [entries]);

  if (!open) return null;

  const cats = kind === 'Income' ? INCOME_CATS : categories;
  const subs = kind === 'Expense' && subcats[category] ? subcats[category] : [];
  const computed = evalExpr(amount);
  const canSave = computed !== null && computed > 0 && !!category && !!date;

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
      id: editing ? editing.id : Date.now(),
      kind: kind.toLowerCase() as Entry['kind'],
      amount: Math.round((computed as number) * 100) / 100,
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
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{editing ? 'Edit entry' : 'New entry'}</h3>
          <IconButton label="Close" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!editing && presets.length > 0 && (
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
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label="Amount" prefix={CURRENCY_SYMBOL[currency]} align="right" numeric placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.+\-*/×÷()]/g, ''))}
                  suffix={isExpression(amount) && computed !== null
                    ? `= ${computed.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                    : undefined}
                  autoFocus />
              </div>
              <IconButton label="Calculator" size="lg" variant={calcOpen ? 'solid' : 'outline'}
                onClick={() => { if (!calcOpen) setCalcExpr(amount); setCalcOpen((o) => !o); }}>
                <Icon name="calculator" size={18} />
              </IconButton>
            </div>
            {calcOpen && (
              <CalcPad expr={calcExpr} setExpr={(fn) => setCalcExpr(fn)} currency={currency}
                onUse={(v) => { setAmount(String(v)); setCalcOpen(false); }} />
            )}
          </div>
          <Select label="Category" placeholder="Choose…" options={cats} value={category} onChange={(e) => { setCategory(e.target.value); setSub(''); }} />
          {subs.length > 0 && (
            <Select label="Subcategory (optional)" placeholder="—" options={subs} value={sub} onChange={(e) => setSub(e.target.value)} />
          )}
          <Input label="Note" placeholder="e.g. Lunch — Kim's" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {!editing && (
              <Select label="Repeat" options={[
                { value: '', label: 'No repeat' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'weekly', label: 'Weekly' },
              ]} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
            )}
          </div>
          {repeat && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: -8 }}>
              Logs itself every {repeat === 'monthly' ? 'month' : 'week'} from the date above. Manage in Settings › Recurring.
            </div>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!canSave} onClick={submit} leadingIcon={<Icon name="check" size={18} />}>
            {editing ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}
