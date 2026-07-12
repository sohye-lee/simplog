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

export const SEED: Entry[] = [
  { id: 1, kind: 'income',  amount: 3200000, category: 'Salary',        note: 'July salary',        date: '2026-07-25' },
  { id: 2, kind: 'expense', amount: 900000,  category: 'Housing',       sub: 'Rent',       note: 'Monthly rent',       date: '2026-07-01' },
  { id: 3, kind: 'expense', amount: 48300,   category: 'Food',          sub: 'Groceries',  note: 'Groceries · Emart',  date: '2026-07-03' },
  { id: 4, kind: 'expense', amount: 12500,   category: 'Transport',     sub: 'Transit',    note: 'Metro top-up',       date: '2026-07-04' },
  { id: 5, kind: 'expense', amount: 41000,   category: 'Food',          sub: 'Coffee',     note: 'Coffee · 10 cups',   date: '2026-07-06' },
  { id: 6, kind: 'income',  amount: 420000,  category: 'Side',          note: 'Freelance invoice',  date: '2026-07-07' },
  { id: 7, kind: 'expense', amount: 29000,   category: 'Entertainment', sub: 'Movies',     note: 'Cinema + snacks',    date: '2026-07-08' },
  { id: 8, kind: 'expense', amount: 66000,   category: 'Health',        sub: 'Pharmacy',   note: 'Pharmacy',           date: '2026-07-09' },
  { id: 9, kind: 'expense', amount: 158000,  category: 'Food',          sub: 'Dining out', note: 'Dinner · birthday',  date: '2026-07-09' },
  { id: 10, kind: 'expense', amount: 55000,  category: 'Bills',         sub: 'Phone',      note: 'Phone + internet',   date: '2026-07-10' },
  { id: 11, kind: 'expense', amount: 89000,  category: 'Shopping',      sub: 'Clothing',   note: 'Summer tee',         date: '2026-07-12' },
];
