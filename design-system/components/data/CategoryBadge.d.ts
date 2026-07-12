import * as React from 'react';

export interface CategoryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** Lime-filled state — use for the active filter */
  selected?: boolean;
  /** Show the leading ink dot */
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function CategoryBadge(props: CategoryBadgeProps): JSX.Element;
