import * as React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Uppercase overline label above the field */
  label?: string;
  /** Leading adornment, e.g. "₩" or "$" */
  prefix?: React.ReactNode;
  /** Trailing adornment, e.g. a unit */
  suffix?: React.ReactNode;
  /** Text alignment — use "right" for money amounts */
  align?: 'left' | 'right';
  /** Sets numeric inputMode for the mobile keypad */
  numeric?: boolean;
  invalid?: boolean;
  /** Helper / error text below the field */
  hint?: string;
}

export function Input(props: InputProps): JSX.Element;
