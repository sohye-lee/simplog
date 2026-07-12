import React from 'react';

/**
 * CategoryBadge — a compact chip labelling a spend category. Ledger
 * stays monotone, so categories are told apart by their short label
 * and a small ink dot, not by color. `selected` fills it with lime.
 */
export function CategoryBadge({
  children,
  selected = false,
  dot = true,
  size = 'md',
  style = {},
  ...rest
}) {
  const h = size === 'sm' ? 22 : 26;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: h,
        padding: size === 'sm' ? '0 8px' : '0 10px',
        borderRadius: 'var(--radius-pill)',
        background: selected ? 'var(--accent)' : 'var(--surface-inset)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        color: selected ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: selected ? 'var(--ink-900)' : 'var(--ink-400)',
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
