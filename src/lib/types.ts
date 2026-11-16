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

// How to read one bank/card export format (inferred by AI once, then
// remembered by the header row so the same format never needs AI again).
export interface ImportMapping {
  institution: string;
  headerRowIndex: number;
  dateColumn: number;
  dateOrder: 'MDY' | 'DMY' | 'YMD';
  descriptionColumn: number;
  amountMode: 'single' | 'split';
  amountColumn: number;
  debitColumn: number;
  creditColumn: number;
  expenseSign: 'negative' | 'positive';
  typeColumn: number;
  skipTypeValues: string[];
  skipDescriptionPatterns: string[];
}

// What a merchant was filed under last time (learned from imports).
export interface MerchantRule {
  note: string;
  category: string;
  sub?: string;
  kind: Kind;
}

export interface AppState {
  entries: Entry[];
  currency: Currency;
  categories: string[];                  // top-level, ordered by importance
  subcats: Record<string, string[]>;     // category → subcategories
  catMode: CatMode;                      // legacy — app always behaves two-level
  recurring: RecurringRule[];
  importMappings: Record<string, ImportMapping>;   // header signature → mapping
  merchantRules: Record<string, MerchantRule>;     // merchant key → filing
  page: Page;
}
