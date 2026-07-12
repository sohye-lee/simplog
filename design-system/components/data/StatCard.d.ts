import * as React from 'react';

export interface StatCardProps {
  /** Uppercase overline label */
  label: string;
  value?: number;
  currency?: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP';
  /** Small secondary line under the figure, e.g. "vs. ₩2.1M last month" */
  delta?: string;
  /** Lime-tinted card — use for the single "hero" stat */
  accent?: boolean;
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Data" subtitle="Headline figure with label" viewport="700x160"
 */
export function StatCard(props: StatCardProps): JSX.Element;
