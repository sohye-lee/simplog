import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Add a soft shadow (for transient/floating panels only) */
  elevated?: boolean;
  /** Render as a different element, e.g. "section" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

/**
 * @startingPoint section="Layout" subtitle="Bordered surface panel" viewport="700x200"
 */
export function Card(props: CardProps): JSX.Element;
