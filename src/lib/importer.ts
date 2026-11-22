// Statement import: any bank/card CSV or Excel export → reviewable entries.
//
// 1. Read the file into rows of strings (SheetJS handles CSV + Excel).
// 2. Find how to read it: a remembered format (keyed by its header row),
//    else ask the AI once and remember the answer.
// 3. Parse rows locally (dates, amounts, signs) and flag rows to skip:
//    card payments / own-account transfers, and likely duplicates.
// 4. Suggest a merchant name + category: remembered merchants first, the AI
//    for the rest (descriptions only — amounts never leave the device here).
//
// PDF statements have no columns to map, so their transaction lines (only
// lines with a date and an amount, account numbers masked) go to the AI,
// which lists the transactions directly; steps 3–4 then run as above.
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

export class AIError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

// All AI calls for one file share an import id; the server counts each new
// id toward the user's monthly smart-import limit.
let importRun = '';
export function startImportRun(): void {
  importRun = crypto.randomUUID();
}

// Call the import-ai edge function; surface the server's own error text.
async function invokeAI<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new AIError('Sign in to use smart import.');
  if (!importRun) startImportRun();
  const { data, error } = await supabase.functions.invoke('import-ai', { body: { ...body, importId: importRun } });
  if (error) {
    let msg = 'Smart import is unavailable right now.';
    let code: string | undefined;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try { const j = await ctx.json(); if (j?.error) msg = j.error; code = j?.code; } catch { /* keep default */ }
    }
    throw new AIError(msg, code);
  }
  return data as T;
}

export interface AIUsage { used: number; limit: number; resetsOn: string }

/** Smart imports used this month, or null when unknown (signed out / offline). */
export async function fetchAIUsage(): Promise<AIUsage | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke('import-ai', { body: { action: 'usage' } });
  return error || typeof data?.limit !== 'number' ? null : (data as AIUsage);
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

/** One parsed transaction → a review row (duplicate check + merchant memory). */
export interface RawTxn { date: string; raw: string; amount: number; kind: Kind; transfer: boolean }

export function toImportRows(
  txns: RawTxn[],
  existing: Entry[],
  rules: Record<string, MerchantRule>,
): ImportRow[] {
  const seen = new Set(existing.map((e) => `${e.date}|${e.kind}|${Math.round(e.amount * 100)}`));
  return txns
    .map((t, i): ImportRow => {
      const amount = Math.round(Math.abs(t.amount) * 100) / 100;
      const isDup = seen.has(`${t.date}|${t.kind}|${Math.round(amount * 100)}`);
      const mk = merchantKey(t.raw);
      const rule = rules[mk];
      return {
        key: `${i}`,
        date: t.date, raw: t.raw, amount, kind: t.kind,
        note: rule?.note || cleanNote(t.raw),
        category: rule && rule.kind === t.kind ? rule.category : t.kind === 'income' ? 'Other' : '',
        sub: rule && rule.kind === t.kind ? rule.sub : undefined,
        include: !t.transfer && !isDup,
        reason: t.transfer ? 'transfer' : isDup ? 'duplicate' : undefined,
        merchantKey: mk,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function buildRows(
  file: ParsedFile,
  existing: Entry[],
  rules: Record<string, MerchantRule>,
): ImportRow[] {
  const m = file.mapping;
  const skipTypes = new Set(m.skipTypeValues.map((v) => v.toLowerCase().trim()));
  const skipPats = m.skipDescriptionPatterns.map((p) => p.toLowerCase().trim()).filter((p) => p.length >= 4);
  const txns: RawTxn[] = [];

  file.rows.slice(m.headerRowIndex + 1).forEach((r) => {
    const date = parseDate(r[m.dateColumn] ?? '', m.dateOrder);
    const signed = rowAmount(r, m);
    if (!date || signed === null || signed === 0) return;
    const raw = r[m.descriptionColumn] || '';
    const type = m.typeColumn >= 0 ? (r[m.typeColumn] ?? '').toLowerCase().trim() : '';
    const lower = raw.toLowerCase();
    const transfer = Boolean((type && skipTypes.has(type)) || skipPats.some((p) => lower.includes(p)));
    txns.push({ date, raw, amount: signed, kind: signed > 0 ? 'expense' : 'income', transfer });
  });
  return toImportRows(txns, existing, rules);
}

// ── PDF statements (bank-generated, with real text — not scans) ────

const DATE_TOKEN = /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2})\b/i;
const MONEY_TOKEN = /\(?-?\$?\s?\d{1,3}(,\d{3})*\.\d{2}\)?-?/;
const PERIOD_WORDS = /(period|statement|closing|opening|billing|cycle|through)/i;
// Summary rows (balances, limits, totals) are not transactions — never sent.
const SUMMARY_WORDS = /(balance|minimum payment|payment due|credit limit|available credit|past due|annual percentage|\btotals?\s+(fees|interest|charged|payments|purchases|credits|deposits|withdrawals|for|this))/i;

/** Text lines of a PDF, in reading order. Throws for image-only (scanned) PDFs. */
export async function readPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') throw new Error('This PDF is password-protected. Download it again without a password.');
    throw new Error("Couldn't open this PDF.");
  }
  const lines: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group text pieces into lines by their baseline, then left→right.
    const byY: Array<{ y: number; parts: Array<{ x: number; w: number; h: number; s: string }> }> = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const [x, y] = [it.transform[4], it.transform[5]];
      let row = byY.find((r) => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, parts: [] }; byY.push(row); }
      row.parts.push({ x, w: it.width, h: it.height || 10, s: it.str });
    }
    byY.sort((a, b) => b.y - a.y).forEach((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let line = '';
      let end = -Infinity;
      for (const part of r.parts) {
        const gap = part.x - end;
        // A word space vs. a column gap (two spaces keeps columns apart).
        line += !line ? part.s : gap > part.h * 1.2 ? '  ' + part.s : gap > 1 ? ' ' + part.s : part.s;
        end = part.x + part.w;
      }
      lines.push(line.replace(/\s{3,}/g, '  ').trim());
    });
  }
  if (lines.join('').replace(/\s/g, '').length < 40) {
    throw new Error("This PDF has no readable text (it may be a scan). Download the statement from your bank's website instead.");
  }
  return lines;
}

/** Hide account / card numbers: any long run of digits. */
export function maskNumbers(s: string): string {
  return s.replace(/\b(?:\d[ -]?){8,}\d\b/g, '••••').replace(/(x{2,}|\*{2,})\d{2,}/gi, '••••');
}

/**
 * Keep only what the AI needs: lines that look like a transaction (a date
 * and an amount), plus a few statement-period lines so it knows the year.
 * Balances, addresses and summary blocks without a date stay on the device.
 */
export function pdfTransactionLines(lines: string[]): { context: string[]; lines: string[] } {
  const context: string[] = [];
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (SUMMARY_WORDS.test(l) || !DATE_TOKEN.test(l)) continue;
    const next = lines[i + 1] ?? '';
    if (MONEY_TOKEN.test(l)) {
      out.push(maskNumbers(l));
    } else if (PERIOD_WORDS.test(l)) {
      if (context.length < 4) context.push(maskNumbers(l).slice(0, 160));
    } else if (MONEY_TOKEN.test(next) && !DATE_TOKEN.test(next) && !SUMMARY_WORDS.test(next)) {
      out.push(maskNumbers(`${l}  ${next}`));   // amount wrapped onto the next line
      i++;
    }
  }
  return { context, lines: out.map((l) => l.slice(0, 200)) };
}

export async function extractPdfTransactions(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ institution: string; txns: RawTxn[] }> {
  const { context, lines } = pdfTransactionLines(await readPdfLines(file));
  if (lines.length === 0) throw new Error('No transactions found in this PDF.');
  type Res = { institution?: string; transactions?: Array<{ line: number; date: string; description: string; amount: number; kind: Kind; transfer: boolean }> };
  // Small chunks, 3 at a time: each AI call stays short and well under the
  // edge function's time limit even for a long statement.
  const CHUNK = 80;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) chunks.push(lines.slice(i, i + CHUNK));
  const results: Res[] = new Array(chunks.length);
  let done = 0;
  onProgress?.(0, chunks.length);
  for (let i = 0; i < chunks.length; i += 3) {
    await Promise.all(chunks.slice(i, i + 3).map(async (chunk, j) => {
      results[i + j] = await invokeAI<Res>({ action: 'extract', context, lines: chunk });
      onProgress?.(++done, chunks.length);
    }));
  }
  const txns: RawTxn[] = [];
  let institution = 'Unknown';
  for (const data of results) {
    if (data?.institution && data.institution !== 'Unknown') institution = data.institution;
    for (const t of data?.transactions ?? []) {
      const date = parseDate(String(t.date ?? ''), 'YMD');
      const amount = Math.abs(Number(t.amount));
      if (!date || !Number.isFinite(amount) || amount === 0) continue;
      txns.push({ date, raw: String(t.description ?? '').slice(0, 140), amount, kind: t.kind === 'income' ? 'income' : 'expense', transfer: Boolean(t.transfer) });
    }
  }
  if (txns.length === 0) throw new Error('No transactions found in this PDF.');
  return { institution, txns };
}

// ── 4. Categorizing (AI for merchants we haven't seen) ─────────────

export async function categorizeRows(
  rows: ImportRow[],
  categories: string[],
  subcats: Record<string, string[]>,
  onNotice?: (msg: string) => void,
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
    } catch (e) {
      // Categorizing is best-effort; rows fall back to "Other".
      if (e instanceof AIError && e.code) {
        onNotice?.(`${e.message} Categories weren't suggested — pick them below.`);
        break;
      }
      continue;
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
