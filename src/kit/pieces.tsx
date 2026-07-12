// Shared presentational pieces used across pages.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Amount } from '../components/Amount';
import { StatCard } from '../components/StatCard';
import { CategoryBadge } from '../components/CategoryBadge';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import type { Currency, Entry } from '../lib/types';
import { fmtDay } from '../lib/months';

// ── Overline section header ──────────────────────────────────────
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
      <span className="overline">{title}</span>
      {right}
    </div>
  );
}

// ── Month stepper ────────────────────────────────────────────────
export function MonthStepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconButton label="Previous month" variant="outline" onClick={onPrev}><Icon name="chevron-left" /></IconButton>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 600, minWidth: 150, textAlign: 'center' }}>{label}</span>
      <IconButton label="Next month" variant="outline" onClick={onNext}><Icon name="chevron-right" /></IconButton>
    </div>
  );
}

// ── Summary strip: Income / Spent / Left ─────────────────────────
export function SummaryStrip({ income, spent, currency }: { income: number; spent: number; currency: Currency }) {
  return (
    <div className="sl-summary">
      <StatCard label="Income" value={income} currency={currency} />
      <StatCard label="Spent" value={spent} currency={currency} delta={income ? Math.round((spent / income) * 100) + '% of income' : '—'} />
      <StatCard label="Left" value={income - spent} currency={currency} accent />
    </div>
  );
}

// ── Category breakdown with proportional bars ────────────────────
// twoLevel: parent rows expand to reveal subcategory amounts.
export function CategoryBreakdown({ byCategory, bySubcat, total, currency, twoLevel }: {
  byCategory: Record<string, number>;
  bySubcat: Record<string, Record<string, number>>;
  total: number;
  currency: Currency;
  twoLevel: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
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
export function EntryRow({ entry, onDelete, currency }: { entry: Entry; onDelete: (id: number) => void; currency: Currency }) {
  const income = entry.kind === 'income';
  return (
    <div className="sl-entry-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid var(--ink-100)' }}>
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
      <div className="sl-entry-delete" style={{ width: 28, flexShrink: 0 }}>
        <IconButton label="Delete entry" size="sm" onClick={() => onDelete(entry.id)}><Icon name="trash-2" size={15} /></IconButton>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────
export function EmptyState({ line, hint }: { line: string; hint?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text-secondary)', marginBottom: 6 }}>{line}</div>
      {hint && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}
