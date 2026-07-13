import { useState } from 'react';
import { Card } from '../components/Card';
import { CategoryBadge } from '../components/CategoryBadge';
import { Icon } from '../components/Icon';
import { SectionHeader, EntryRow, EmptyState } from '../kit/pieces';
import type { Currency, Entry } from '../lib/types';

interface EntriesPageProps {
  entries: Entry[];
  categories: string[];
  currency: Currency;
  onDelete: (id: number) => void;
  onEdit: (entry: Entry) => void;
}

export function EntriesPage({ entries, categories, currency, onDelete, onEdit }: EntriesPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const chips = ['All', ...categories];
  const filtered = entries
    .filter((e) => filter === 'All' || e.category === filter)
    .filter((e) => !query || (e.note + ' ' + e.category).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}><Icon name="search" size={16} /></span>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes or categories…"
          style={{ width: '100%', height: 44, padding: '0 12px 0 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <span key={c} onClick={() => setFilter(c)} style={{ cursor: 'pointer' }}>
            <CategoryBadge selected={filter === c} dot={c !== 'All'}>{c}</CategoryBadge>
          </span>
        ))}
      </div>
      <Card padding="md">
        <SectionHeader title={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`} />
        {filtered.length ? filtered.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} onEdit={onEdit} currency={currency} />)
          : <EmptyState line="No matching entries." hint="Try a different search or filter." />}
      </Card>
    </div>
  );
}
