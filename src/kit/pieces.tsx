// Shared presentational pieces used across pages.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Amount } from '../components/Amount';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import type { Currency, Entry } from '../lib/types';
import { fmtDay } from '../lib/months';

// ── Card section header ──────────────────────────────────────────
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, minHeight: 28 }}>
      <span className="sl-title">{title}</span>
      {right}
    </div>
  );
}

// ── Month stepper ────────────────────────────────────────────────
export function MonthStepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconButton label="Previous month" onClick={onPrev}><Icon name="chevron-left" /></IconButton>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', minWidth: 150, textAlign: 'center' }}>{label}</span>
      <IconButton label="Next month" onClick={onNext}><Icon name="chevron-right" /></IconButton>
    </div>
  );
}

// ── Month summary: Spent as the hero, Income / Left beneath ──────
export function SummaryStrip({ income, spent, currency }: { income: number; spent: number; currency: Currency }) {
  const left = income - spent;
  const pct = income ? Math.min(100, (spent / income) * 100) : 0;
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '20px 20px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span className="overline">Spent this month</span>
        {income > 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Math.round((spent / income) * 100)}% of income</span>}
      </div>
      <div style={{ marginTop: 8 }}>
        <Amount value={spent} size="xl" currency={currency} />
      </div>
      <div role="presentation" style={{ height: 8, marginTop: 18, background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: spent > income && income > 0 ? 'var(--ink-900)' : 'var(--accent)', borderRadius: 'var(--radius-pill)', transition: 'width 400ms var(--ease-out)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 16, gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Income</span>
          <Amount value={income} size="md" currency={currency} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Left</span>
          <Amount value={left} size="md" currency={currency} emphasis={left > 0 ? 'accent' : 'normal'} />
        </div>
      </div>
    </div>
  );
}

// ── Category breakdown with proportional bars ────────────────────
// Rows follow the user's category order (Settings — importance),
// not the amount. twoLevel: parent rows expand to reveal subcategory
// amounts.
export function CategoryBreakdown({ byCategory, bySubcat, total, currency, twoLevel, order = [] }: {
  byCategory: Record<string, number>;
  bySubcat: Record<string, Record<string, number>>;
  total: number;
  currency: Currency;
  twoLevel: boolean;
  order?: string[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const rank = (cat: string) => { const i = order.indexOf(cat); return i === -1 ? order.length : i; };
  const rows = Object.entries(byCategory).sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map(([cat, amt]) => {
        const subs = twoLevel && bySubcat[cat] ? Object.entries(bySubcat[cat]).sort((a, b) => b[1] - a[1]) : [];
        const canExpand = subs.length > 0;
        const isOpen = open[cat];
        return (
          <div key={cat}>
            <div
              onClick={() => canExpand && setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: canExpand ? 'pointer' : 'default' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {canExpand && (
                  <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>
                    <Icon name="chevron-right" size={13} />
                  </span>
                )}
                <span style={{ fontSize: 'var(--text-md)', fontWeight: 500 }}>{cat}</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{total ? Math.round((amt / total) * 100) : 0}%</span>
                <Amount value={amt} size="sm" currency={currency} />
              </div>
            </div>
            <div style={{ height: 5, background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
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

// ── A single ledger row — tap to edit, trash to delete ──────────
export function EntryRow({ entry, onDelete, onEdit, currency }: { entry: Entry; onDelete: (id: number) => void; onEdit?: (entry: Entry) => void; currency: Currency }) {
  const income = entry.kind === 'income';
  return (
    <div
      className="sl-entry-row"
      onClick={() => onEdit?.(entry)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--ink-100)', cursor: onEdit ? 'pointer' : 'default' }}
    >
      <div aria-hidden="true" style={{
        width: 40, height: 40, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: income ? 'var(--accent-tint)' : 'var(--surface-inset)', color: income ? 'var(--text-accent)' : 'var(--ink-600)',
        fontSize: 15, fontWeight: 600,
      }}>
        {(entry.category.trim()[0] || '·').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.note}</div>
        <div style={{ marginTop: 2, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[entry.category, entry.sub, fmtDay(entry.date)].filter(Boolean).join(' · ')}
        </div>
      </div>
      <Amount value={income ? entry.amount : -entry.amount} size="sm" signed={income} emphasis={income ? 'accent' : 'normal'} currency={currency} />
      <div className="sl-entry-delete" style={{ width: 28, flexShrink: 0 }}>
        <IconButton label="Delete entry" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}><Icon name="trash-2" size={15} /></IconButton>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────
export function EmptyState({ line, hint }: { line: string; hint?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>{line}</div>
      {hint && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}
