// Statement import — pick a bank/card export, review what the AI made of
// it, then import the checked rows. Nothing is saved until "Import".
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { Amount } from '../components/Amount';
import type { Currency, Entry, ImportMapping, MerchantRule } from '../lib/types';
import { INCOME_CATS } from '../lib/data';
import { fmtDay } from '../lib/months';
import { readRows, detectFormat, buildRows, categorizeRows, extractPdfTransactions, toImportRows, startImportRun, fetchAIUsage } from '../lib/importer';
import type { AIUsage, ImportRow, ParsedFile } from '../lib/importer';

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

export interface ImportResult {
  entries: Entry[];
  mapping?: { signature: string; mapping: ImportMapping };
  rules: Record<string, MerchantRule>;
}

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (result: ImportResult) => void;
  categories: string[];
  subcats: Record<string, string[]>;
  entries: Entry[];
  importMappings: Record<string, ImportMapping>;
  merchantRules: Record<string, MerchantRule>;
  currency: Currency;
}

type Stage = { name: 'pick' } | { name: 'working'; msg: string } | { name: 'review' } | { name: 'error'; msg: string };

const encode = (r: Pick<ImportRow, 'kind' | 'category' | 'sub'>) => `${r.kind}|${r.category}|${r.sub || ''}`;

export function ImportSheet(p: ImportSheetProps) {
  const [stage, setStage] = useState<Stage>({ name: 'pick' });
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [institution, setInstitution] = useState('Unknown');
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | null>(null);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!p.open) return;
    let live = true;
    fetchAIUsage().then((u) => { if (live) setUsage(u); }).catch(() => {});
    return () => { live = false; };
  }, [p.open]);

  if (!p.open) return null;

  const close = () => { setStage({ name: 'pick' }); setRows([]); setParsed(null); p.onClose(); };

  const run = async (file: File, force = false) => {
    if (!force || lastFile.current !== file) startImportRun();   // "re-read" reuses the run
    lastFile.current = file;
    setFileName(file.name);
    setNotice('');
    try {
      if (isPdf(file)) {
        setStage({ name: 'working', msg: 'Reading PDF…' });
        setParsed(null);
        const { institution: inst, txns } = await extractPdfTransactions(file, (done, total) =>
          setStage({ name: 'working', msg: total > 1 ? `Finding transactions… ${done}/${total}` : 'Finding transactions…' }));
        setInstitution(inst);
        const built = toImportRows(txns, p.entries, p.merchantRules);
        const unknown = new Set(built.filter((r) => !r.category).map((r) => r.merchantKey)).size;
        setStage({ name: 'working', msg: unknown ? `Categorizing ${unknown} merchant${unknown === 1 ? '' : 's'}…` : 'Almost done…' });
        setRows(await categorizeRows(built, p.categories, p.subcats, setNotice));
        setStage({ name: 'review' });
        return;
      }
      setStage({ name: 'working', msg: 'Reading file…' });
      const raw = await readRows(file);
      if (raw.length < 2) throw new Error('This file is empty.');
      setStage({ name: 'working', msg: force ? 'Re-reading the format…' : 'Figuring out the format…' });
      const pf = await detectFormat(raw, p.importMappings, force);
      setParsed(pf);
      setInstitution(pf.mapping.institution);
      const built = buildRows(pf, p.entries, p.merchantRules);
      if (built.length === 0) throw new Error('No transactions found in this file.');
      const unknown = new Set(built.filter((r) => !r.category).map((r) => r.merchantKey)).size;
      setStage({ name: 'working', msg: unknown ? `Categorizing ${unknown} merchant${unknown === 1 ? '' : 's'}…` : 'Almost done…' });
      setRows(await categorizeRows(built, p.categories, p.subcats, setNotice));
      setStage({ name: 'review' });
    } catch (e) {
      setStage({ name: 'error', msg: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  };

  const update = (key: string, patch: Partial<ImportRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const flipAll = () => setRows((rs) => rs.map((r) => {
    const kind = r.kind === 'expense' ? 'income' : 'expense';
    return { ...r, kind, category: 'Other', sub: undefined };
  }));

  const selected = rows.filter((r) => r.include);
  const transfers = rows.filter((r) => r.reason === 'transfer').length;
  const dups = rows.filter((r) => r.reason === 'duplicate').length;

  const doImport = () => {
    const base = Date.now() * 1000;
    const entries: Entry[] = selected.map((r, i) => {
      const e: Entry = { id: base + i, kind: r.kind, amount: r.amount, category: r.category, note: r.note.trim() || r.sub || r.category, date: r.date };
      if (r.sub) e.sub = r.sub;
      return e;
    });
    const rules: Record<string, MerchantRule> = {};
    selected.forEach((r) => {
      // "Other" is a non-answer — don't pin it, so the merchant gets a real
      // suggestion next time.
      if (r.merchantKey && r.category !== 'Other') {
        rules[r.merchantKey] = { note: r.note.trim() || r.category, category: r.category, sub: r.sub, kind: r.kind };
      }
    });
    p.onImport({
      entries,
      rules,
      mapping: parsed && !parsed.fromCache ? { signature: parsed.signature, mapping: parsed.mapping } : undefined,
    });
    close();
  };

  const categoryOptions = (
    <>
      <optgroup label="Spending">
        {p.categories.flatMap((c) => [
          <option key={`e|${c}|`} value={`expense|${c}|`}>{c}</option>,
          ...(p.subcats[c] || []).map((s) => <option key={`e|${c}|${s}`} value={`expense|${c}|${s}`}>{`${c} › ${s}`}</option>),
        ])}
      </optgroup>
      <optgroup label="Income">
        {INCOME_CATS.map((c) => <option key={`i|${c}`} value={`income|${c}|`}>{c}</option>)}
      </optgroup>
    </>
  );

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(12,13,10,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60, animation: 'slFade 160ms ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, height: stage.name === 'review' ? '92dvh' : 'auto', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-card)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderBottom: 'none', boxShadow: 'var(--shadow-lg)', animation: 'slRise 220ms var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{stage.name === 'review' ? 'Review import' : 'Import statement'}</h3>
            {stage.name === 'review' && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {institution !== 'Unknown' ? `${institution} · ` : ''}{fileName}
              </div>
            )}
          </div>
          <IconButton label="Close" onClick={close}><Icon name="x" /></IconButton>
        </div>

        {stage.name === 'pick' && (
          <div style={{ padding: '4px 24px calc(24px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Download your transactions as CSV or Excel from your bank or card website — or a PDF statement if that's all
              it offers — then choose the file here. Any bank's format works: SimplyLog reads it, skips card payments and
              transfers between your own accounts, and suggests a category for each purchase. You review everything before it's saved.
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={() => fileRef.current?.click()} leadingIcon={<Icon name="file-down" size={18} />}>Choose file</Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt,.pdf,text/csv,application/pdf" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ''; }} />
            {usage && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {Math.max(0, usage.limit - usage.used)} of {usage.limit} smart imports left this month · imports that need no AI (known format and merchants) don't count
              </div>
            )}
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              CSV/Excel: the first time a bank's format is seen, its first rows are sent to an AI service to read the layout; merchant names are sent to suggest categories. Formats and merchants are remembered, so repeat imports stay on your device.
              PDF: the statement's transaction lines (date, description, amount — account numbers hidden) are sent to the AI each time. PDFs must come from your bank's website; scanned paper statements can't be read.
            </div>
          </div>
        )}

        {stage.name === 'working' && (
          <div style={{ padding: '32px 24px 48px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{stage.msg}</div>
        )}

        {stage.name === 'error' && (
          <div style={{ padding: '8px 24px calc(24px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{stage.msg}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {lastFile.current && <Button variant="secondary" onClick={() => run(lastFile.current!, true)}>Try again</Button>}
              <Button variant="ghost" onClick={() => setStage({ name: 'pick' })}>Choose another file</Button>
            </div>
          </div>
        )}

        {stage.name === 'review' && (
          <>
            <div style={{ padding: '0 24px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {selected.length} of {rows.length} selected
                {transfers ? ` · ${transfers} transfer${transfers === 1 ? '' : 's'} skipped` : ''}
                {dups ? ` · ${dups} possible duplicate${dups === 1 ? '' : 's'}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 4 }}>
                <Button variant="ghost" size="sm" onClick={flipAll}>Flip in/out</Button>
                <Button variant="ghost" size="sm" onClick={() => lastFile.current && run(lastFile.current, true)}>{parsed ? 'Re-read format' : 'Re-read file'}</Button>
              </span>
            </div>
            {notice && (
              <div style={{ margin: '12px 24px 0', padding: '8px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)' }}>{notice}</div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px' }}>
              {rows.map((r) => (
                <div key={r.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--ink-100)', opacity: r.include ? 1 : 0.45 }}>
                  <input type="checkbox" checked={r.include} onChange={(e) => update(r.key, { include: e.target.checked })}
                    aria-label={`Include ${r.raw}`} style={{ marginTop: 6, width: 18, height: 18, accentColor: 'var(--ink-900)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <input value={r.note} onChange={(e) => update(r.key, { note: e.target.value })} aria-label="Note"
                        style={{ flex: 1, minWidth: 0, border: 'none', borderBottom: '1px dashed var(--border-strong)', background: 'transparent', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', color: 'var(--text-primary)', padding: '2px 0' }} />
                      <Amount value={r.kind === 'expense' ? -r.amount : r.amount} size="sm" signed={r.kind === 'income'} emphasis={r.kind === 'income' ? 'accent' : 'normal'} currency={p.currency} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: 44 }}>{fmtDay(r.date)}</span>
                      <select value={encode(r)} aria-label="Category"
                        onChange={(e) => { const [kind, category, sub] = e.target.value.split('|'); update(r.key, { kind: kind as ImportRow['kind'], category, sub: sub || undefined }); }}
                        style={{ height: 28, maxWidth: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-inset)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: '0 6px' }}>
                        {categoryOptions}
                      </select>
                      {r.reason && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '1px 8px' }}>
                          {r.reason === 'transfer' ? 'payment / transfer' : 'already logged?'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.raw}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 24px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button variant="primary" fullWidth disabled={selected.length === 0} onClick={doImport} leadingIcon={<Icon name="check" size={18} />}>
                Import {selected.length} {selected.length === 1 ? 'entry' : 'entries'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
