// Statement import: any bank/card CSV or Excel export → reviewable entries.
//
// 1. Read the file into rows of strings (SheetJS handles CSV + Excel).
// 2. Find how to read it: a remembered format (keyed by its header row),
//    else ask the AI once and remember the answer.
// 3. Parse rows locally (dates, amounts, signs) and flag rows to skip:
//    card payments / own-account transfers, and likely duplicates.
// 4. Suggest a merchant name + category: remembered merchants first, the AI
//    for the rest (descriptions only — amounts never leave the device here).
import { supabase } from './supabase';
import type { Entry, ImportMapping, Kind, MerchantRule } from './types';
import { INCOME_CATS } from './data';

export interface ImportRow {
  key: string;            // stable row key for React
  date: string;           // YYYY-MM-DD
  raw: string;            // bank description as written
  amount: number;         // positive
  kind: Kind;
  note: string;           // suggested clean merchant name
  category: string;
  sub?: string;
  include: boolean;
  reason?: 'transfer' | 'duplicate';
  merchantKey: string;
}

export interface ParsedFile {
  rows: string[][];
  signature: string;
  mapping: ImportMapping;
  fromCache: boolean;
}

// Call the import-ai edge function; surface the server's own error text.
async function invokeAI<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Sign in to use smart import.');
  const { data, error } = await supabase.functions.invoke('import-ai', { body });
  if (error) {
    let msg = 'Smart import is unavailable right now.';
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try { const j = await ctx.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    }
    throw new Error(msg);
  }
  return data as T;
}

// ── 1. Reading ─────────────────────────────────────────────────────

export async function readRows(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  // raw: true keeps CSV cells as text (no guessing "01/02" into dates).
  const wb = XLSX.read(buf, { type: 'array', raw: true, cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
  return rows.map((r) => r.map((c) => String(c ?? '').trim()));
}

// ── 2. Format: remembered or inferred ──────────────────────────────

export function rowSignature(row: string[]): string {
  return row.map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean).join('|');
}

function validMapping(m: ImportMapping, rows: string[][]): boolean {
  const width = Math.max(...rows.map((r) => r.length));
  const cols = [m.dateColumn, m.descriptionColumn, m.amountColumn, m.debitColumn, m.creditColumn, m.typeColumn];
  if (cols.some((c) => c >= width) || m.headerRowIndex < 0 || m.headerRowIndex >= rows.length) return false;
  if (m.dateColumn < 0 || m.descriptionColumn < 0) return false;
  if (m.amountMode === 'single' ? m.amountColumn < 0 : m.debitColumn < 0 && m.creditColumn < 0) return false;
  // At least half the data rows must read as a date + an amount.
  const data = rows.slice(m.headerRowIndex + 1).slice(0, 30);
  if (data.length === 0) return false;
  const ok = data.filter((r) => parseDate(r[m.dateColumn] ?? '', m.dateOrder) && rowAmount(r, m) !== null).length;
  return ok >= Math.ceil(data.length / 2);
}

export async function detectFormat(
  rows: string[][],
  remembered: Record<string, ImportMapping>,
  force = false,
): Promise<ParsedFile> {
  if (!force) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const sig = rowSignature(rows[i]);
      const m = remembered[sig];
      if (m) {
        const mapping = { ...m, headerRowIndex: i };
        if (validMapping(mapping, rows)) return { rows, signature: sig, mapping, fromCache: true };
      }
    }
  }
  const data = await invokeAI<{ mapping?: ImportMapping }>({ action: 'map', rows: rows.slice(0, 25) });
  if (!data?.mapping) throw new Error("Couldn't read this file's format.");
  const mapping = data.mapping;
  if (!validMapping(mapping, rows)) throw new Error("This file doesn't look like a transaction list.");
  return { rows, signature: rowSignature(rows[mapping.headerRowIndex]), mapping, fromCache: false };
}

// ── 3. Parsing ─────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(s: string, order: ImportMapping['dateOrder']): string | null {
  const t = s.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  let y: number, m: number, d: number;
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    const parts = t.split(/[\/.\-\s]+/).filter(Boolean);
    if (parts.length >= 3 && parts.slice(0, 3).every((p) => /^\d+$/.test(p))) {
      const [a, b, c] = parts.slice(0, 3).map(Number);
      if (order === 'YMD') [y, m, d] = [a, b, c];
      else if (order === 'DMY') [d, m, y] = [a, b, c];
      else [m, d, y] = [a, b, c];
      if (y < 100) y += 2000;
    } else {
      const ms = Date.parse(t);                // "Jan 5, 2026" and friends
      if (Number.isNaN(ms)) return null;
      const dt = new Date(ms);
      [y, m, d] = [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
    }
  }
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseAmount(s: string): number | null {
  let t = s.trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
  if (t.startsWith('-') || t.startsWith('−')) { neg = !neg; t = t.slice(1); }
  t = t.replace(/[$€£¥₩,\s]|USD/gi, '');
  if (t.startsWith('-')) { neg = !neg; t = t.slice(1); }
  if (!/^\d*\.?\d+$/.test(t)) return null;
  const v = parseFloat(t);
  return neg ? -v : v;
}

/** Signed amount from the expense's point of view: >0 = money out. */
function rowAmount(r: string[], m: ImportMapping): number | null {
  if (m.amountMode === 'split') {
    const out = m.debitColumn >= 0 ? parseAmount(r[m.debitColumn] ?? '') : null;
    const inn = m.creditColumn >= 0 ? parseAmount(r[m.creditColumn] ?? '') : null;
    if (out) return Math.abs(out);
    if (inn) return -Math.abs(inn);
    return out === 0 || inn === 0 ? 0 : null;
  }
  const v = parseAmount(r[m.amountColumn] ?? '');
  if (v === null) return null;
  return m.expenseSign === 'negative' ? -v : v;
}

export function merchantKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(sq|tst|sp|pp|pos|ach|dd|py|in)\s*\*\s*/, '')
    .replace(/(debit card purchase|pos purchase|purchase authorized on|recurring payment)/g, ' ')
    .replace(/[#*]\S*/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Readable note without AI: drop processor prefixes, store/ref numbers. */
export function cleanNote(raw: string): string {
  const t = raw
    .replace(/^(sq|tst|sp|pp|pos|ach|dd|py|in)\s*\*\s*/i, '')
    .replace(/[#*]\S*/g, ' ')
    .replace(/\b\d[\d-]*\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCase(t || raw).slice(0, 40);
}

export function buildRows(
  file: ParsedFile,
  existing: Entry[],
  rules: Record<string, MerchantRule>,
): ImportRow[] {
  const m = file.mapping;
  const skipTypes = new Set(m.skipTypeValues.map((v) => v.toLowerCase().trim()));
  const skipPats = m.skipDescriptionPatterns.map((p) => p.toLowerCase().trim()).filter((p) => p.length >= 4);
  const seen = new Set(existing.map((e) => `${e.date}|${e.kind}|${Math.round(e.amount * 100)}`));
  const out: ImportRow[] = [];

  file.rows.slice(m.headerRowIndex + 1).forEach((r, i) => {
    const date = parseDate(r[m.dateColumn] ?? '', m.dateOrder);
    const signed = rowAmount(r, m);
    if (!date || signed === null || signed === 0) return;
    const raw = r[m.descriptionColumn] || '';
    const kind: Kind = signed > 0 ? 'expense' : 'income';
    const amount = Math.round(Math.abs(signed) * 100) / 100;
    const type = m.typeColumn >= 0 ? (r[m.typeColumn] ?? '').toLowerCase().trim() : '';
    const lower = raw.toLowerCase();
    const isTransfer = (type && skipTypes.has(type)) || skipPats.some((p) => lower.includes(p));
    const isDup = seen.has(`${date}|${kind}|${Math.round(amount * 100)}`);
    const mk = merchantKey(raw);
    const rule = rules[mk];
    out.push({
      key: `${i}`,
      date, raw, amount, kind,
      note: rule?.note || cleanNote(raw),
      category: rule && rule.kind === kind ? rule.category : kind === 'income' ? 'Other' : '',
      sub: rule && rule.kind === kind ? rule.sub : undefined,
      include: !isTransfer && !isDup,
      reason: isTransfer ? 'transfer' : isDup ? 'duplicate' : undefined,
      merchantKey: mk,
    });
  });
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ── 4. Categorizing (AI for merchants we haven't seen) ─────────────

export async function categorizeRows(
  rows: ImportRow[],
  categories: string[],
  subcats: Record<string, string[]>,
): Promise<ImportRow[]> {
  const todo = rows.filter((r) => !r.category);
  if (todo.length === 0 || !supabase) {
    return rows.map((r) => (r.category ? r : { ...r, category: 'Other' }));
  }
  // One AI item per distinct merchant, not per row.
  const groups = new Map<string, ImportRow>();
  todo.forEach((r) => { if (!groups.has(`${r.kind}|${r.merchantKey}`)) groups.set(`${r.kind}|${r.merchantKey}`, r); });
  const uniq = [...groups.values()];
  const expenseCategories = Object.fromEntries(categories.map((c) => [c, subcats[c] || []]));
  const answers = new Map<string, { note: string; category: string; sub?: string }>();

  for (let start = 0; start < uniq.length; start += 100) {
    const batch = uniq.slice(start, start + 100);
    type Res = { results?: Array<{ index: number; merchant: string; category: string; sub: string }> };
    let data: Res;
    try {
      data = await invokeAI<Res>({
        action: 'categorize',
        items: batch.map((r, i) => ({ index: i, text: r.raw, kind: r.kind })),
        expenseCategories,
        incomeCategories: INCOME_CATS,
      });
    } catch {
      continue;   // categorizing is best-effort; rows fall back to "Other"
    }
    for (const res of data?.results ?? []) {
      const r = batch[res.index];
      if (!r) continue;
      const allowed = r.kind === 'income' ? INCOME_CATS : categories;
      const category = allowed.includes(res.category) ? res.category : 'Other';
      const sub = r.kind === 'expense' && (subcats[category] || []).includes(res.sub) ? res.sub : undefined;
      answers.set(`${r.kind}|${r.merchantKey}`, { note: res.merchant?.trim() || r.note, category, sub });
    }
  }

  return rows.map((r) => {
    if (r.category) return r;
    const a = answers.get(`${r.kind}|${r.merchantKey}`);
    return a ? { ...r, note: a.note, category: a.category, sub: a.sub } : { ...r, category: 'Other' };
  });
}
