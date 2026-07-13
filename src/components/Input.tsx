import { useState } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

/**
 * Simplylog text/number input. For money entry pass `prefix="₩"` and
 * `align="right"` so the amount reads like a ledger figure.
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  align?: 'left' | 'right';
  numeric?: boolean;
  invalid?: boolean;
  hint?: string;
  style?: CSSProperties;
}

export function Input({
  label,
  prefix,
  suffix,
  align = 'left',
  numeric = false,
  invalid = false,
  hint,
  id,
  style = {},
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label htmlFor={inputId} className="overline">{label}</label>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        padding: '0 12px',
        background: 'var(--surface-card)',
        border: `1px solid ${invalid ? 'var(--ink-700)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: focused ? 'var(--ring-accent)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
      }}>
        {prefix && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-md)' }}>{prefix}</span>}
        <input
          id={inputId}
          inputMode={numeric ? 'decimal' : undefined}
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-md)',
            color: 'var(--text-primary)',
            textAlign: align,
            fontVariantNumeric: 'tabular-nums slashed-zero',
            ...style,
          }}
          {...rest}
        />
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{suffix}</span>}
      </div>
      {hint && (
        <span style={{ fontSize: 'var(--text-xs)', color: invalid ? 'var(--ink-700)' : 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
}
