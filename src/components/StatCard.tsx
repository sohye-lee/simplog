import type { CSSProperties } from 'react';
import { Amount } from './Amount';
import type { Currency } from '../lib/types';

/**
 * StatCard — a single headline figure with a label and optional
 * delta. Used in the monthly summary strip (Income / Spent / Left).
 */
export interface StatCardProps {
  label: string;
  value?: number;
  currency?: Currency;
  delta?: string;
  accent?: boolean;
  style?: CSSProperties;
}

export function StatCard({
  label,
  value = 0,
  currency = 'USD',
  delta,
  accent = false,
  style = {},
}: StatCardProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 'var(--space-5)',
      background: accent ? 'var(--accent-tint)' : 'var(--surface-card)',
      border: `1px solid ${accent ? 'var(--lime-300)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      minWidth: 0,
      containerType: 'inline-size',
      ...style,
    }}>
      {/* delta sits beside the label so every card keeps the same height */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span className="overline">{label}</span>
        {delta != null && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{delta}</span>
        )}
      </div>
      {/* cqw: scales with the card so long figures (USD cents) never clip */}
      <Amount value={value} currency={currency} size="lg" style={{ fontSize: 'clamp(14px, 10.5cqw, var(--text-2xl))' }} />
    </div>
  );
}
