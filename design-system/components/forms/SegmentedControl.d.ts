import * as React from 'react';

export interface SegmentOption { value: string; label: string; }

export interface SegmentedControlProps {
  /** Strings or { value, label } objects */
  options: Array<string | SegmentOption>;
  value: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
