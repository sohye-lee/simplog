// Charts — hand-rolled SVG, monotone ink + one lime accent.
// Donut = where it went (category share); Bars = when (daily totals).
import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { Amount } from '../components/Amount';
import { SectionHeader, EmptyState } from './pieces';
import type { Currency, Entry, Kind } from '../lib/types';

// Largest slice gets the lime; the rest descend through the ink ramp.
const SLICE_COLORS = ['var(--lime-500)', 'var(--ink-900)', 'var(--ink-600)', 'var(--ink-400)', 'var(--ink-300)', 'var(--ink-200)'];

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ── Donut: category share ────────────────────────────────────────
function Donut({ byCategory, total, currency }: { byCategory: Record<string, number>; total: number; currency: Currency }) {
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  // Group everything past the 5th slice into "Other" so the ring stays readable.
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
  const slices = rest > 0 ? [...top, ['Other +', rest] as [string, number]] : top;

  let angle = 0;
  const size = 180, cx = size / 2, cy = size / 2, r = 66, stroke = 26;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Category share">
        {slices.map(([cat, val], i) => {
          const sweep = (val / total) * 360;
          // tiny gap between slices; full-circle single slice needs two arcs
          const start = angle + 1, end = angle + Math.max(sweep - 1, 0.5);
          angle += sweep;
          if (sweep >= 359.5) {
            return <circle key={cat} cx={cx} cy={cy} r={r} fill="none" stroke={SLICE_COLORS[i]} strokeWidth={stroke} />;
          }
          return <path key={cat} d={arcPath(cx, cy, r, start, end)} fill="none" stroke={SLICE_COLORS[i % SLICE_COLORS.length]} strokeWidth={stroke} />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ font: '500 11px var(--font-mono)', fill: 'var(--ink-400)', letterSpacing: '0.08em' }}>TOTAL</text>
        <text x={cx} y={cy + 16} textAnchor="middle" style={{ font: '600 15px var(--font-mono)', fill: 'var(--ink-900)' }}>
          {Math.round(total).toLocaleString('en-US')}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, flex: 1 }}>
        {slices.map(([cat, val], i) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: SLICE_COLORS[i % SLICE_COLORS.length], flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Math.round((val / total) * 100)}%</span>
            <Amount value={val} size="xs" currency={currency} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bars: daily totals across the month ──────────────────────────
function DailyBars({ entries, month, currency }: { entries: Entry[]; month: string; currency: Currency }) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const totals = useMemo(() => {
    const t = Array(days).fill(0) as number[];
    entries.forEach((e) => { const d = Number(e.date.slice(8, 10)); if (d >= 1 && d <= days) t[d - 1] += e.amount; });
    return t;
  }, [entries, days]);
  const max = Math.max(...totals, 1);
  const maxDay = totals.indexOf(Math.max(...totals)) + 1;

  const W = 560, H = 140, PAD = 4;
  const bw = (W - PAD * 2) / days;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Daily totals" style={{ display: 'block' }}>
        {totals.map((v, i) => {
          const h = v ? Math.max((v / max) * H, 3) : 0;
          const isMax = i + 1 === maxDay && v > 0;
          return (
            <g key={i}>
              <rect x={PAD + i * bw + 1} y={H - Math.max(h, 2)} width={Math.max(bw - 2, 2)} height={Math.max(h, 2)}
                rx={1.5} fill={v === 0 ? 'var(--ink-100)' : isMax ? 'var(--lime-500)' : 'var(--ink-900)'} />
            </g>
          );
        })}
        {[1, 10, 20, days].map((d) => (
          <text key={d} x={PAD + (d - 0.5) * bw} y={H + 16} textAnchor="middle"
            style={{ font: '400 9px var(--font-mono)', fill: 'var(--ink-400)' }}>{d}</text>
        ))}
      </svg>
      {totals[maxDay - 1] > 0 && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
          Peak: day {maxDay} · <Amount value={totals[maxDay - 1]} size="xs" currency={currency} />
        </div>
      )}
    </div>
  );
}

// ── The card with tabs + chart-type toggle ───────────────────────
interface ChartsCardProps {
  entries: Entry[];          // active month, both kinds
  month: string;
  currency: Currency;
}

export function ChartsCard({ entries, month, currency }: ChartsCardProps) {
  const [tab, setTab] = useState<Kind>('expense');
  const [type, setType] = useState<'donut' | 'daily'>('donut');

  const subset = entries.filter((e) => e.kind === tab);
  const total = subset.reduce((s, e) => s + e.amount, 0);
  const byCategory = subset.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <Card padding="md">
      <SectionHeader title="Charts" right={
        <SegmentedControl size="sm" options={[{ value: 'donut', label: 'Share' }, { value: 'daily', label: 'Daily' }]} value={type} onChange={(v) => setType(v as 'donut' | 'daily')} />
      } />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SegmentedControl fullWidth options={[{ value: 'expense', label: 'Spent' }, { value: 'income', label: 'Income' }]} value={tab} onChange={(v) => setTab(v as Kind)} />
        {total === 0 ? (
          <EmptyState line={tab === 'expense' ? 'No spending this month.' : 'No income this month.'} />
        ) : type === 'donut' ? (
          <Donut byCategory={byCategory} total={total} currency={currency} />
        ) : (
          <DailyBars entries={subset} month={month} currency={currency} />
        )}
      </div>
    </Card>
  );
}
