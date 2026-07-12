import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Array of strings or { value, label } objects */
  options?: Array<string | SelectOption>;
  placeholder?: string;
  invalid?: boolean;
}

export function Select(props: SelectProps): JSX.Element;
