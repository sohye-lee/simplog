import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { SectionHeader, SummaryStrip, CategoryBreakdown, EntryRow, EmptyState } from '../kit/pieces';
import type { Currency, Entry } from '../lib/types';

interface OverviewPageProps {
  income: number;
  spent: number;
  byCategory: Record<string, number>;
  bySubcat: Record<string, Record<string, number>>;
  twoLevel: boolean;
  recent: Entry[];
  currency: Currency;
  onSeeAll: () => void;
  onDelete: (id: number) => void;
}

export function OverviewPage({ income, spent, byCategory, bySubcat, twoLevel, recent, currency, onSeeAll, onDelete }: OverviewPageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SummaryStrip income={income} spent={spent} currency={currency} />
      <Card padding="md">
        <SectionHeader title="Where it went" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Object.keys(byCategory).length} categories{twoLevel ? ' · tap to expand' : ''}</span>} />
        <CategoryBreakdown byCategory={byCategory} bySubcat={bySubcat} twoLevel={twoLevel} total={spent} currency={currency} />
      </Card>
      <Card padding="md">
        <SectionHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={onSeeAll} trailingIcon={<Icon name="chevron-right" size={15} />}>See all</Button>} />
        {recent.length ? recent.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} currency={currency} />)
          : <EmptyState line="Nothing logged yet." hint="Tap Add to record your first entry." />}
      </Card>
    </div>
  );
}
