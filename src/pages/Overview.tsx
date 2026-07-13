import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { SectionHeader, SummaryStrip, CategoryBreakdown, EntryRow, EmptyState } from '../kit/pieces';
import { ChartsCard } from '../kit/Charts';
import type { Currency, Entry } from '../lib/types';

interface OverviewPageProps {
  income: number;
  spent: number;
  byCategory: Record<string, number>;
  bySubcat: Record<string, Record<string, number>>;
  categories: string[];         // importance order (Settings)
  allEntries: Entry[];          // full history — charts compute their own ranges
  month: string;
  recent: Entry[];
  currency: Currency;
  onSeeAll: () => void;
  onDelete: (id: number) => void;
  onEdit: (entry: Entry) => void;
}

export function OverviewPage({ income, spent, byCategory, bySubcat, categories, allEntries, month, recent, currency, onSeeAll, onDelete, onEdit }: OverviewPageProps) {
  const [showCharts, setShowCharts] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SummaryStrip income={income} spent={spent} currency={currency} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-8px 0' }}>
        <Button variant="ghost" size="sm" onClick={() => setShowCharts((v) => !v)}
          leadingIcon={<Icon name="chart" size={15} />}
          trailingIcon={<span style={{ display: 'inline-flex', transform: showCharts ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}><Icon name="chevron-right" size={14} /></span>}>
          Charts
        </Button>
      </div>
      {showCharts && <ChartsCard allEntries={allEntries} month={month} currency={currency} />}

      <Card padding="md">
        <SectionHeader title="Where it went" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Object.keys(byCategory).length} categories · your order</span>} />
        <CategoryBreakdown byCategory={byCategory} bySubcat={bySubcat} twoLevel total={spent} currency={currency} order={categories} />
      </Card>
      <Card padding="md">
        <SectionHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={onSeeAll} trailingIcon={<Icon name="chevron-right" size={15} />}>See all</Button>} />
        {recent.length ? recent.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} onEdit={onEdit} currency={currency} />)
          : <EmptyState line="Nothing logged yet." hint="Tap Add to record your first entry." />}
      </Card>
    </div>
  );
}
