import type { CSSProperties, HTMLAttributes } from 'react';

/**
 * Card — the base surface for SimplyLog panels. A 1px border, small
 * radius, no shadow by default (borders over elevation).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  style?: CSSProperties;
}

export function Card({
  padding = 'md',
  elevated = false,
  children,
  style = {},
  ...rest
}: CardProps) {
  const pads: Record<string, string | number> = { none: 0, sm: 'var(--space-4)', md: 'var(--space-5)', lg: 'var(--space-8)' };
  return (
    <div
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
    </div>
  );
}
