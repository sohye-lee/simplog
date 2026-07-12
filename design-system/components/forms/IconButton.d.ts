import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid';
  /** Accessible label (required — icon-only button) */
  label: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
