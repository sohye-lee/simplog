import type { CSSProperties } from 'react';

export type SegmentOption = string | { value: string; label: string };

/**
 * Segmented control — the SimplyLog toggle for small mutually-exclusive
 * choices (Income / Expense, format pickers). The active segment gets
 * the lime fill.
 */
export interface SegmentedControlProps {
  options?: SegmentOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: CSSProperties;
}

export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  style = {},
}: SegmentedControlProps) {
  const h = size === 'sm' ? 32 : 40;
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <div style={{
      display: 'inline-flex',
      width: fullWidth ? '100%' : 'auto',
      padding: 3,
      gap: 2,
      background: 'var(--surface-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      ...style,
    }}>
      {norm.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange && onChange(o.value)}
            style={{
              flex: fullWidth ? 1 : 'none',
              height: h,
              padding: '0 16px',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-md)',
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
