import React from 'react';

/**
 * Card — the base surface for Ledger panels. A 1px border, small
 * radius, no shadow by default (Ledger prefers borders to elevation).
 */
export function Card({
  padding = 'md',
  elevated = false,
  as = 'div',
  children,
  style = {},
  ...rest
}) {
  const pads = { none: 0, sm: 'var(--space-4)', md: 'var(--space-5)', lg: 'var(--space-8)' };
  const El = as;
  return (
    <El
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: pads[padding] != null ? pads[padding] : pads.md,
        boxShadow: elevated ? 'var(--shadow-md)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </El>
  );
}
