// Export the active month as CSV, Excel (.xlsx), or PDF.
// The heavy libraries (SheetJS, jsPDF) and the Korean-capable PDF font
// are loaded on demand so they never weigh down the app itself.
import type { AppState, Currency, Entry } from './types';
import { monthLabel, todayISO } from './months';
import { deliver } from './deliver';
import { defaultState } from './storage';
import fontRegularUrl from '../assets/NanumGothicCoding-Regular.ttf?url';
import fontBoldUrl from '../assets/NanumGothicCoding-Bold.ttf?url';

export type ExportFormat = 'CSV' | 'Excel' | 'PDF';

const SYMBOL: Record<Currency, string> = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', GBP: '£' };

const HEADER = ['Date', 'Kind', 'Category', 'Subcategory', 'Note', 'Amount'];

function signedAmount(e: Entry): number {
  return e.kind === 'expense' ? -e.amount : e.amount;
}

function fmtMoney(value: number, currency: Currency): string {
  const frac = currency === 'KRW' || currency === 'JPY' ? 0 : 2;
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac });
  return `${value < 0 ? '-' : ''}${SYMBOL[currency]}${abs}`;
}

function buildRows(entries: Entry[]): (string | number)[][] {
  return entries.map((e) => [e.date, e.kind, e.category, e.sub || '', e.note, signedAmount(e)]);
}

// ── CSV ──────────────────────────────────────────────────────────
// Plain UTF-8 with BOM so Korean text opens correctly in Excel too.
export async function exportCSV(entries: Entry[], month: string): Promise<void> {
  const rows = [HEADER, ...buildRows(entries)];
  const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  await deliver(new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8;' }), `simplylog-${month}.csv`);
}

// ── Excel (.xlsx) ────────────────────────────────────────────────
export async function exportExcel(entries: Entry[], month: string): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...buildRows(entries)]);
  ws['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 16 }, { wch: 16 }, { wch: 32 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthLabel(month));
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await deliver(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `simplylog-${month}.xlsx`,
  );
}

// ── JSON backup / restore ────────────────────────────────────────
// The whole AppState (all months, categories, settings) in one file.
export async function exportBackup(state: AppState): Promise<void> {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  await deliver(blob, `simplylog-backup-${todayISO()}.json`);
}

export function parseBackup(text: string): AppState | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    const ok = parsed.entries.every(
      (e: Entry) => typeof e?.amount === 'number' && typeof e?.date === 'string' && typeof e?.category === 'string',
    );
    if (!ok) return null;
    return { ...defaultState(), ...parsed };
  } catch {
    return null;
  }
}

// ── PDF ──────────────────────────────────────────────────────────
// A monthly statement: summary strip, category breakdown, full ledger.
// Uses NanumGothic Coding (monospace, Korean-capable) so notes and
// categories typed in Korean render correctly.

const INK = '#0C0D0A';
const INK_MUTED = '#9A9C90';
const INK_SECONDARY = '#6B6D62';
const LIME = '#CCF017';
const BORDER = '#E3E4DC';
const SUNKEN = '#F7F7F2';

async function fetchFontBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function exportPDF(entries: Entry[], month: string, currency: Currency): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const [regular, bold] = await Promise.all([
    fetchFontBase64(fontRegularUrl),
    fetchFontBase64(fontBoldUrl),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('NanumGothicCoding-Regular.ttf', regular);
  doc.addFont('NanumGothicCoding-Regular.ttf', 'NanumGothicCoding', 'normal');
  doc.addFileToVFS('NanumGothicCoding-Bold.ttf', bold);
  doc.addFont('NanumGothicCoding-Bold.ttf', 'NanumGothicCoding', 'bold');
  doc.setFont('NanumGothicCoding', 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  // Lime brand bar
  doc.setFillColor(LIME);
  doc.rect(0, 0, pageW, 6, 'F');

  // Wordmark + month
  doc.setTextColor(INK);
  doc.setFont('NanumGothicCoding', 'bold');
  doc.setFontSize(18);
  doc.text('SimplyLog', margin, 64);
  doc.setFont('NanumGothicCoding', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(INK_SECONDARY);
  doc.text(monthLabel(month), pageW - margin, 64, { align: 'right' });

  // Summary strip
  const income = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const spent = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const stats: Array<[string, number]> = [['INCOME', income], ['SPENT', spent], ['LEFT', income - spent]];
  const cardW = (pageW - margin * 2 - 24) / 3;
  stats.forEach(([label, value], i) => {
    const x = margin + i * (cardW + 12);
    doc.setDrawColor(BORDER);
    if (label === 'LEFT') { doc.setFillColor('#F3FBC4'); doc.roundedRect(x, 84, cardW, 54, 4, 4, 'FD'); }
    else { doc.setFillColor(SUNKEN); doc.roundedRect(x, 84, cardW, 54, 4, 4, 'FD'); }
    doc.setFontSize(7.5);
    doc.setTextColor(INK_MUTED);
    doc.text(label, x + 12, 102, { charSpace: 0.8 });
    doc.setFontSize(13);
    doc.setFont('NanumGothicCoding', 'bold');
    doc.setTextColor(INK);
    doc.text(fmtMoney(value, currency), x + 12, 124);
    doc.setFont('NanumGothicCoding', 'normal');
  });

  // Category breakdown
  const byCategory: Record<string, number> = {};
  entries.filter((e) => e.kind === 'expense').forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const catRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [cat, spent ? `${Math.round((amt / spent) * 100)}%` : '0%', fmtMoney(-amt, currency)]);

  let y = 170;
  if (catRows.length) {
    doc.setFontSize(7.5);
    doc.setTextColor(INK_MUTED);
    doc.text('WHERE IT WENT', margin, y, { charSpace: 0.8 });
    autoTable(doc, {
      startY: y + 8,
      margin: { left: margin, right: margin },
      head: [['Category', 'Share', 'Amount']],
      body: catRows,
      styles: { font: 'NanumGothicCoding', fontSize: 9, textColor: INK, lineColor: BORDER, cellPadding: 6 },
      headStyles: { fillColor: SUNKEN, textColor: INK_SECONDARY, fontStyle: 'normal', lineWidth: 0 },
      bodyStyles: { lineWidth: { bottom: 0.5 } },
      columnStyles: { 1: { halign: 'right', textColor: INK_SECONDARY }, 2: { halign: 'right' } },
      theme: 'plain',
    });
    y = (doc as any).lastAutoTable.finalY + 28;
  }

  // Full ledger
  doc.setFontSize(7.5);
  doc.setTextColor(INK_MUTED);
  doc.text(`ENTRIES (${entries.length})`, margin, y, { charSpace: 0.8 });
  autoTable(doc, {
    startY: y + 8,
    margin: { left: margin, right: margin },
    head: [['Date', 'Category', 'Sub', 'Note', 'Amount']],
    body: entries.map((e) => [e.date, e.category, e.sub || '', e.note, fmtMoney(signedAmount(e), currency)]),
    styles: { font: 'NanumGothicCoding', fontSize: 9, textColor: INK, lineColor: BORDER, cellPadding: 6 },
    headStyles: { fillColor: SUNKEN, textColor: INK_SECONDARY, fontStyle: 'normal', lineWidth: 0 },
    bodyStyles: { lineWidth: { bottom: 0.5 } },
    columnStyles: { 0: { textColor: INK_SECONDARY }, 4: { halign: 'right' } },
    theme: 'plain',
  });

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(INK_MUTED);
    doc.text('Generated by SimplyLog', margin, doc.internal.pageSize.getHeight() - 28);
    doc.text(`${i} / ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 28, { align: 'right' });
  }

  await deliver(doc.output('blob'), `simplylog-${month}.pdf`);
}

export async function exportMonth(format: ExportFormat, entries: Entry[], month: string, currency: Currency): Promise<void> {
  if (format === 'CSV') await exportCSV(entries, month);
  else if (format === 'Excel') await exportExcel(entries, month);
  else await exportPDF(entries, month, currency);
}
