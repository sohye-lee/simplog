import React from 'react';

const CURRENCY = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', GBP: '£' };

/**
 * Amount — the core money figure of Ledger. Renders a number as a
 * tabular, right-alignable currency figure. This is the single most
 * repeated element in the product, so it lives as a primitive.
 */
export function Amount({
  value = 0,
  currency = 'KRW',
  size = 'md',
  signed = false,
  emphasis = 'normal',   // 'normal' | 'muted' | 'accent'
  decimals,
  style = {},
}) {
  const sym = CURRENCY[currency] || '';
  const zeroDecimals = currency === 'KRW' || currency === 'JPY';
  const frac = decimals != null ? decimals : (zeroDecimals ? 0 : 2);

  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac });
  const sign = value < 0 ? '−' : signed ? '+' : '';

  const sizes = {
    xl: { fontSize: 'var(--text-3xl)', weight: 'var(--weight-semibold)', symScale: 0.5 },
    lg: { fontSize: 'var(--text-2xl)', weight: 'var(--weight-semibold)', symScale: 0.55 },
    md: { fontSize: 'var(--text-lg)', weight: 'var(--weight-medium)', symScale: 0.7 },
    sm: { fontSize: 'var(--text-md)', weight: 'var(--weight-medium)', symScale: 0.8 },
    xs: { fontSize: 'var(--text-sm)', weight: 'var(--weight-medium)', symScale: 0.85 },
  };
  const s = sizes[size] || sizes.md;

  const color = emphasis === 'muted' ? 'var(--money-zero)'
    : emphasis === 'accent' ? 'var(--text-accent)'
    : 'var(--text-primary)';

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: s.fontSize,
      fontWeight: s.weight,
      color,
      fontVariantNumeric: 'tabular-nums slashed-zero',
      letterSpacing: 'var(--tracking-tight)',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      ...style,
    }}>
      {sign}
      <span style={{ fontSize: `${s.symScale}em`, color: 'var(--text-muted)', marginRight: '0.15em', fontWeight: 'var(--weight-regular)' }}>{sym}</span>
      {formatted}
    </span>
  );
}
