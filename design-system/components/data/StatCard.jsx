import React from 'react';
import { Amount } from './Amount.jsx';

/**
 * StatCard — a single headline figure with a label and optional
 * delta. Used in the monthly summary strip (Income / Spent / Left).
 */
export function StatCard({
  label,
  value = 0,
  currency = 'KRW',
  delta,
  accent = false,
  style = {},
}) {
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
      ...style,
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 'var(--weight-medium)',
      }}>{label}</span>
      <Amount value={value} currency={currency} size="lg" />
      {delta != null && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{delta}</span>
      )}
    </div>
  );
}
