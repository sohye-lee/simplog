import { describe, it, expect, vi } from 'vitest';

// Never reach the real backend from tests (the repo's .env points at prod).
vi.mock('./supabase', () => ({ supabase: null }));

import { readRows, detectFormat, buildRows, categorizeRows, parseAmount, parseDate, merchantKey, rowSignature, cleanNote } from './importer';
import type { Entry, ImportMapping, MerchantRule } from './types';

const csv = (name: string, text: string) => new File([text], name, { type: 'text/csv' });

const base: Omit<ImportMapping, 'institution'> = {
  headerRowIndex: 0, dateColumn: 0, dateOrder: 'MDY', descriptionColumn: 1,
  amountMode: 'single', amountColumn: 2, debitColumn: -1, creditColumn: -1,
  expenseSign: 'negative', typeColumn: -1, skipTypeValues: [], skipDescriptionPatterns: [],
};

describe('parseAmount', () => {
  it('reads US money formats', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
    expect(parseAmount('-12.00')).toBe(-12);
    expect(parseAmount('($300.00)')).toBe(-300);
    expect(parseAmount('45.10-')).toBe(-45.1);
    expect(parseAmount('-$5.25')).toBe(-5.25);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('N/A')).toBeNull();
  });
});

describe('parseDate', () => {
  it('handles the common layouts', () => {
    expect(parseDate('10/28/2026', 'MDY')).toBe('2026-10-28');
    expect(parseDate('10/28/26', 'MDY')).toBe('2026-10-28');
    expect(parseDate('2026-10-28', 'YMD')).toBe('2026-10-28');
    expect(parseDate('28/10/2026', 'DMY')).toBe('2026-10-28');
    expect(parseDate('Oct 28, 2026', 'MDY')).toBe('2026-10-28');
    expect(parseDate('13/45/2026', 'MDY')).toBeNull();
  });
});

describe('cleanNote', () => {
  it('makes bank text readable without AI', () => {
    expect(cleanNote('SQ *BLUE BOTTLE COFFEE 0423')).toBe('Blue Bottle Coffee');
    expect(cleanNote("TRADER JOE'S #552")).toBe("Trader Joe's");
    expect(cleanNote('UBER   *TRIP')).toBe('Uber');
  });
});

describe('merchantKey', () => {
  it('drops store numbers and processor prefixes', () => {
    expect(merchantKey('SQ *BLUE BOTTLE COFFEE 0423 OAKLAND CA')).toBe('blue bottle coffee');
    expect(merchantKey('STARBUCKS STORE #12345')).toBe(merchantKey('STARBUCKS STORE #99'));
  });
});

describe('Capital One credit card (split debit/credit columns)', async () => {
  const rows = await readRows(csv('capone.csv',
`Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
2026-10-28,2026-10-29,1234,STARBUCKS STORE 12345,Dining,6.45,
2026-10-27,2026-10-28,1234,CAPITAL ONE AUTOPAY PYMT,Payment/Credit,,500.00
2026-10-25,2026-10-26,1234,"AMAZON.COM*2K4L19, SEATTLE",Merchandise,42.10,
`));
  const mapping: ImportMapping = {
    ...base, institution: 'Capital One', dateOrder: 'YMD', descriptionColumn: 3,
    amountMode: 'split', amountColumn: -1, debitColumn: 5, creditColumn: 6,
    skipDescriptionPatterns: ['autopay pymt'],
  };
  const out = buildRows({ rows, signature: rowSignature(rows[0]), mapping, fromCache: false }, [], {});

  it('keeps quoted commas inside one cell', () => {
    expect(rows[3][3]).toBe('AMAZON.COM*2K4L19, SEATTLE');
  });
  it('reads purchases as expenses and skips the card payment', () => {
    expect(out).toHaveLength(3);
    const sb = out.find((r) => r.raw.startsWith('STARBUCKS'))!;
    expect(sb).toMatchObject({ date: '2026-10-28', amount: 6.45, kind: 'expense', include: true });
    const pay = out.find((r) => r.raw.includes('AUTOPAY'))!;
    expect(pay).toMatchObject({ kind: 'income', include: false, reason: 'transfer' });
  });
});

describe('Chase credit card (signed single column + Type)', async () => {
  const rows = await readRows(csv('chase.csv',
`Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/28/2026,10/29/2026,SQ *BLUE BOTTLE COFFEE,Food & Drink,Sale,-5.25,
10/26/2026,10/26/2026,Payment Thank You-Mobile,,Payment,1200.00,
10/20/2026,10/21/2026,UBER   *TRIP,Travel,Sale,-18.40,
`));
  const mapping: ImportMapping = {
    ...base, institution: 'Chase', descriptionColumn: 2, amountColumn: 5,
    typeColumn: 4, skipTypeValues: ['Payment'],
  };
  const existing: Entry[] = [{ id: 1, kind: 'expense', amount: 18.4, category: 'Transport', note: 'Uber', date: '2026-10-20' }];
  const rules: Record<string, MerchantRule> = { [merchantKey('SQ *BLUE BOTTLE COFFEE')]: { note: 'Blue Bottle', category: 'Food', sub: 'Coffee', kind: 'expense' } };
  const out = buildRows({ rows, signature: '', mapping, fromCache: true }, existing, rules);

  it('uses remembered merchants and the type column', () => {
    expect(out.find((r) => r.raw.includes('BLUE BOTTLE'))).toMatchObject({ note: 'Blue Bottle', category: 'Food', sub: 'Coffee', include: true });
    expect(out.find((r) => r.raw.startsWith('Payment'))).toMatchObject({ include: false, reason: 'transfer' });
  });
  it('flags rows already logged by hand', () => {
    expect(out.find((r) => r.raw.startsWith('UBER'))).toMatchObject({ include: false, reason: 'duplicate' });
  });
});

describe('Robinhood-style export with a title block and ($) negatives', async () => {
  const text =
`Robinhood Gold Card
Statement period,Oct 1 - Oct 31 2026

Date,Description,Amount
"Oct 28, 2026","TRADER JOE'S #123","$54.20"
"Oct 27, 2026","Payment received","($300.00)"
`;
  const rows = await readRows(csv('rh.csv', text));
  const header = rows.findIndex((r) => r[0] === 'Date');
  const remembered = { [rowSignature(rows[header])]: { ...base, institution: 'Robinhood', expenseSign: 'positive' as const, headerRowIndex: 0, skipDescriptionPatterns: ['payment received'] } };

  it('finds a remembered format below the title lines, without calling AI', async () => {
    const pf = await detectFormat(rows, remembered);
    expect(pf.fromCache).toBe(true);
    expect(pf.mapping.headerRowIndex).toBe(header);
    const out = buildRows(pf, [], {});
    expect(out.find((r) => r.raw.startsWith('TRADER'))).toMatchObject({ date: '2026-10-28', amount: 54.2, kind: 'expense', include: true });
    expect(out.find((r) => r.raw.startsWith('Payment'))).toMatchObject({ include: false });
  });
});

describe('categorizeRows without AI available', () => {
  it('falls back to Other instead of failing', async () => {
    const rows = buildRows({
      rows: [['Date', 'Desc', 'Amt'], ['10/01/2026', 'MYSTERY SHOP', '-9.99']],
      signature: '', mapping: { ...base, institution: 'X' }, fromCache: true,
    }, [], {});
    const out = await categorizeRows(rows, ['Food', 'Other'], {});
    expect(out[0].category).toBe('Other');
  });
});
