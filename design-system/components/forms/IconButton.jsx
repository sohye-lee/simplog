import React from 'react';

/**
 * Square icon-only button. Used for row actions, toolbar controls,
 * and the month stepper. Pass an icon element as children.
 */
export function IconButton({
  size = 'md',
  variant = 'ghost',
  disabled = false,
  label,
  children,
  style = {},
  ...rest
}) {
  const dims = { sm: 28, md: 36, lg: 44 }[size] || 36;

  const variants = {
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    outline: { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
    solid: { background: 'var(--ink-900)', color: 'var(--text-inverse)', border: '1px solid var(--ink-900)' },
  };
  const v = variants[variant] || variants.ghost;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dims,
        height: dims,
        padding: 0,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'ghost') { e.currentTarget.style.background = 'var(--surface-inset)'; e.currentTarget.style.color = 'var(--text-primary)'; }
        if (variant === 'outline') e.currentTarget.style.background = 'var(--surface-sunken)';
        if (variant === 'solid') e.currentTarget.style.background = 'var(--ink-800)';
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }
        if (variant === 'outline') e.currentTarget.style.background = 'var(--surface-card)';
        if (variant === 'solid') e.currentTarget.style.background = 'var(--ink-900)';
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
