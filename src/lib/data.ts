import type { Entry } from './types';

// A well-organized standard personal-finance set. Users add/remove
// their own in Settings.
export const DEFAULT_CATEGORIES = ['Food', 'Housing', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'];
export const INCOME_CATS = ['Salary', 'Side', 'Other'];

// Optional second level — used only when Category style = Two-level.
export const SUBCATEGORIES: Record<string, string[]> = {
  Food: ['Groceries', 'Dining out', 'Coffee', 'Delivery'],
  Housing: ['Rent', 'Maintenance', 'Furniture'],
  Transport: ['Transit', 'Taxi', 'Fuel'],
  Bills: ['Phone', 'Internet', 'Utilities', 'Subscriptions'],
  Shopping: ['Clothing', 'Electronics', 'Home'],
  Health: ['Pharmacy', 'Clinic', 'Fitness'],
  Entertainment: ['Movies', 'Games', 'Events', 'Hobbies'],
  Other: ['Misc', 'Gifts', 'Fees'],
};

// Sample dataset — USD scale (default currency).
export const SEED: Entry[] = [
  { id: 1, kind: 'income',  amount: 5200,    category: 'Salary',        note: 'July salary',        date: '2026-07-25' },
  { id: 2, kind: 'expense', amount: 1850,    category: 'Housing',       sub: 'Rent',       note: 'Monthly rent',       date: '2026-07-01' },
  { id: 3, kind: 'expense', amount: 86.4,    category: 'Food',          sub: 'Groceries',  note: 'Groceries · H Mart', date: '2026-07-03' },
  { id: 4, kind: 'expense', amount: 24,      category: 'Transport',     sub: 'Transit',    note: 'Metro card top-up',  date: '2026-07-04' },
  { id: 5, kind: 'expense', amount: 38.5,    category: 'Food',          sub: 'Coffee',     note: 'Coffee · 10 cups',   date: '2026-07-06' },
  { id: 6, kind: 'income',  amount: 650,     category: 'Side',          note: 'Freelance invoice',  date: '2026-07-07' },
  { id: 7, kind: 'expense', amount: 32,      category: 'Entertainment', sub: 'Movies',     note: 'Cinema + snacks',    date: '2026-07-08' },
  { id: 8, kind: 'expense', amount: 54.2,    category: 'Health',        sub: 'Pharmacy',   note: 'Pharmacy',           date: '2026-07-09' },
  { id: 9, kind: 'expense', amount: 128,     category: 'Food',          sub: 'Dining out', note: 'Dinner · birthday',  date: '2026-07-09' },
  { id: 10, kind: 'expense', amount: 95,     category: 'Bills',         sub: 'Phone',      note: 'Phone + internet',   date: '2026-07-10' },
  { id: 11, kind: 'expense', amount: 49.9,   category: 'Shopping',      sub: 'Clothing',   note: 'Summer tee',         date: '2026-07-12' },
];
