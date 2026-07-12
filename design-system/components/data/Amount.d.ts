import * as React from 'react';

export interface AmountProps {
  /** The numeric amount. Negative renders a minus sign. */
  value?: number;
  currency?: 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show a leading "+" for positive values */
  signed?: boolean;
  /** Color treatment */
  emphasis?: 'normal' | 'muted' | 'accent';
  /** Override fraction digits (defaults: 0 for KRW/JPY, 2 otherwise) */
  decimals?: number;
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Data" subtitle="Tabular currency figure" viewport="700x140"
 */
export function Amount(props: AmountProps): JSX.Element;
