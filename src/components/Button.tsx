import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

/**
 * SimpleLog primary action button. Lime is loud — use ONE `primary`
 * per view. `secondary` and `ghost` carry everything else.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  style?: CSSProperties;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  leadingIcon = null,
  trailingIcon = null,
  children,
  style = {},
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 'var(--text-sm)', height: 32, gap: 6 },
    md: { padding: '9px 16px', fontSize: 'var(--text-md)', height: 40, gap: 8 },
    lg: { padding: '13px 22px', fontSize: 'var(--text-md)', height: 48, gap: 8 },
  };
  const s = sizes[size] || sizes.md;

  const variants: Record<string, CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid var(--accent)',
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid transparent',
    },
    dark: {
      background: 'var(--ink-900)',
      color: 'var(--text-inverse)',
      border: '1px solid var(--ink-900)',
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        width: fullWidth ? '100%' : 'auto',
        height: s.height,
        padding: s.padding,
        fontFamily: 'var(--font-mono)',
        fontSize: s.fontSize,
        fontWeight: 500,
        letterSpacing: '0.01em',
        lineHeight: 1,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (disabled) return;
        if (variant === 'primary') e.currentTarget.style.background = 'var(--accent)';
        if (variant === 'ghost') e.currentTarget.style.background = 'transparent';
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--surface-card)';
        if (variant === 'dark') e.currentTarget.style.background = 'var(--ink-900)';
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') e.currentTarget.style.background = 'var(--accent-hover)';
        if (variant === 'ghost') e.currentTarget.style.background = 'var(--surface-inset)';
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--surface-sunken)';
        if (variant === 'dark') e.currentTarget.style.background = 'var(--ink-800)';
      }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
