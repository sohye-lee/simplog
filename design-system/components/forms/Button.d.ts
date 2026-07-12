import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `primary` is the loud lime button — one per view. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  /** Icon element rendered before the label */
  leadingIcon?: React.ReactNode;
  /** Icon element rendered after the label */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Ledger button.
 * @startingPoint section="Forms" subtitle="Primary / secondary / ghost / dark actions" viewport="700x160"
 */
export function Button(props: ButtonProps): JSX.Element;
