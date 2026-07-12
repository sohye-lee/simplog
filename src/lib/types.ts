export type Kind = 'expense' | 'income';
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP';
export type CatMode = 'simple' | 'twolevel';
export type Page = 'overview' | 'entries' | 'export' | 'settings';

export interface Entry {
  id: number;            // Date.now() at creation
  kind: Kind;
  amount: number;        // positive number, in major units (₩ has no decimals)
  category: string;      // top-level category
  sub?: string;          // subcategory — only when catMode === 'twolevel'
  note: string;          // free text; defaults to sub || category if blank
  date: string;          // 'YYYY-MM-DD'
}

export type Freq = 'monthly' | 'weekly';

export interface RecurringRule {
  id: number;            // Date.now() when the rule was created
  kind: Kind;
  amount: number;
  category: string;
  sub?: string;
  note: string;
  freq: Freq;
  anchor: string;        // YYYY-MM-DD of the first occurrence
  lastGen: number;       // highest period index already materialized
}

export interface AppState {
  entries: Entry[];
  currency: Currency;
  categories: string[];                  // top-level, ordered by importance
  subcats: Record<string, string[]>;     // category → subcategories
  catMode: CatMode;                      // legacy — app always behaves two-level
  recurring: RecurringRule[];
  page: Page;
}
