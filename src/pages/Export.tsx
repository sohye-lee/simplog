import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../kit/pieces';
import type { Entry } from '../lib/types';
import type { ExportFormat } from '../lib/export';

interface ExportPageProps {
  entries: Entry[];
  monthLabel: string;
  onExport: (format: ExportFormat) => Promise<void>;
}

const FORMAT_HINT: Record<ExportFormat, string> = {
  CSV: 'A plain .csv file (UTF-8 with BOM) — opens in any spreadsheet app, Korean text intact.',
  Excel: 'A real .xlsx workbook, ready for Excel, Numbers, or Google Sheets.',
  PDF: 'A monthly statement — summary, category breakdown, and the full ledger.',
};

export function ExportPage({ entries, monthLabel, onExport }: ExportPageProps) {
  const [fmt, setFmt] = useState<ExportFormat>('CSV');
  const [busy, setBusy] = useState(false);
  const count = entries.length;

  const run = async () => {
    setBusy(true);
    try { await onExport(fmt); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding="lg">
        <SectionHeader title="Export this month" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{monthLabel}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{count} {count === 1 ? 'entry' : 'entries'} · ready to download</div>
            </div>
            <span style={{ color: 'var(--text-muted)' }}><Icon name="file-down" size={30} strokeWidth={1.5} /></span>
          </div>
          <div>
            <div className="overline" style={{ marginBottom: 8 }}>Format</div>
            <SegmentedControl options={['CSV', 'Excel', 'PDF']} value={fmt} onChange={(v) => setFmt(v as ExportFormat)} fullWidth />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
              {FORMAT_HINT[fmt]}
            </div>
          </div>
          <Button variant="primary" size="lg" fullWidth disabled={busy || count === 0} onClick={run} leadingIcon={<Icon name="download" size={18} />}>
            {busy ? 'Preparing…' : `Download ${monthLabel}`}
          </Button>
        </div>
      </Card>
      <Card padding="md">
        <SectionHeader title="What's included" />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Date', 'Kind (income / expense)', 'Category & subcategory', 'Note', 'Amount (signed)'].map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--lime-700)' }}><Icon name="check" size={15} /></span>{c}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
