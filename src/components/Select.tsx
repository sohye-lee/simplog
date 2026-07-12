import { useState } from 'react';
import type { CSSProperties, SelectHTMLAttributes } from 'react';

export type SelectOption = string | { value: string; label: string };

/**
 * SimpleLog select — a styled native <select> for category / month
 * pickers. Native keeps it accessible and simple.
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  style?: CSSProperties;
}

export function Select({
  label,
  options = [],
  placeholder,
  invalid = false,
  id,
  style = {},
  ...rest
}: SelectProps) {
  const [focused, setFocused] = useState(false);
  const selectId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label htmlFor={selectId} className="overline">{label}</label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: 44,
        background: 'var(--surface-card)',
        border: `1px solid ${invalid ? 'var(--ink-700)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: focused ? 'var(--ring-accent)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
      }}>
        <select
          id={selectId}
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            flex: 1,
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '0 36px 0 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-md)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            ...style,
          }}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const value = typeof o === 'string' ? o : o.value;
            const text = typeof o === 'string' ? o : o.label;
            return <option key={value} value={value}>{text}</option>;
          })}
        </select>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="var(--ink-500)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
