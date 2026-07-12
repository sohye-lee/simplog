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

export interface AppState {
  entries: Entry[];
  currency: Currency;
  categories: string[];                  // top-level, ordered
  subcats: Record<string, string[]>;     // category → subcategories
  catMode: CatMode;
  page: Page;
}
