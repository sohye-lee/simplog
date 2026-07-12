// Charts — hand-rolled SVG, monotone ink + one lime accent.
// Range: Month / YTD / trailing 1Y. Share = category donut;
// Trend = daily bars (month) or monthly bars (year ranges).
import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { Amount } from '../components/Amount';
import { SectionHeader, EmptyState } from './pieces';
import { monthOf, shiftMonth } from '../lib/months';
import type { Currency, Entry, Kind } from '../lib/types';

type Range = 'month' | 'ytd' | '1y';

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

// ── Donut: category share over the range ────────────────────────
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

// ── Bars: generic bucketed totals (days of a month / months) ────
interface Bucket { label: string; showLabel: boolean; value: number }

function Bars({ buckets, peakLabel, currency }: { buckets: Bucket[]; peakLabel: (b: Bucket) => string; currency: Currency }) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  const peakIdx = buckets.reduce((best, b, i) => (b.value > buckets[best].value ? i : best), 0);

  const W = 560, H = 140, PAD = 4;
  const bw = (W - PAD * 2) / buckets.length;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Totals over time" style={{ display: 'block' }}>
        {buckets.map((b, i) => {
          const h = b.value ? Math.max((b.value / max) * H, 3) : 0;
          const isPeak = i === peakIdx && b.value > 0;
          return (
            <rect key={i} x={PAD + i * bw + 1.5} y={H - Math.max(h, 2)} width={Math.max(bw - 3, 2)} height={Math.max(h, 2)}
              rx={1.5} fill={b.value === 0 ? 'var(--ink-100)' : isPeak ? 'var(--lime-500)' : 'var(--ink-900)'} />
          );
        })}
        {buckets.map((b, i) => b.showLabel && (
          <text key={'l' + i} x={PAD + (i + 0.5) * bw} y={H + 16} textAnchor="middle"
            style={{ font: '400 9px var(--font-mono)', fill: 'var(--ink-400)' }}>{b.label}</text>
        ))}
      </svg>
      {buckets[peakIdx].value > 0 && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
          Peak: {peakLabel(buckets[peakIdx])} · <Amount value={buckets[peakIdx].value} size="xs" currency={currency} />
        </div>
      )}
    </div>
  );
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── The card: range + kind tabs + chart type ────────────────────
interface ChartsCardProps {
  allEntries: Entry[];       // full history — ranges are computed here
  month: string;             // active month 'YYYY-MM'
  currency: Currency;
}

export function ChartsCard({ allEntries, month, currency }: ChartsCardProps) {
  const [tab, setTab] = useState<Kind>('expense');
  const [type, setType] = useState<'share' | 'trend'>('share');
  const [range, setRange] = useState<Range>('month');

  // Months covered by the current range, oldest first.
  const rangeMonths = useMemo(() => {
    if (range === 'month') return [month];
    const first = range === 'ytd' ? `${month.slice(0, 4)}-01` : shiftMonth(month, -11);
    const out: string[] = [];
    for (let m = first; m <= month; m = shiftMonth(m, 1)) out.push(m);
    return out;
  }, [range, month]);

  const subset = useMemo(
    () => allEntries.filter((e) => e.kind === tab && rangeMonths.includes(monthOf(e.date))),
    [allEntries, tab, rangeMonths],
  );
  const total = subset.reduce((s, e) => s + e.amount, 0);
  const byCategory = subset.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const buckets = useMemo<Bucket[]>(() => {
    if (range === 'month') {
      const [y, m] = month.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      const t = Array(days).fill(0) as number[];
      subset.forEach((e) => { const d = Number(e.date.slice(8, 10)); if (d >= 1 && d <= days) t[d - 1] += e.amount; });
      return t.map((value, i) => ({ label: String(i + 1), showLabel: [1, 10, 20, days].includes(i + 1), value }));
    }
    return rangeMonths.map((m, i) => {
      const value = subset.filter((e) => monthOf(e.date) === m).reduce((s, e) => s + e.amount, 0);
      const idx = Number(m.slice(5)) - 1;
      const showLabel = rangeMonths.length <= 7 || i % 2 === 0 || i === rangeMonths.length - 1;
      return { label: MONTH_SHORT[idx], showLabel, value };
    });
  }, [range, month, subset, rangeMonths]);

  return (
    <Card padding="md">
      <SectionHeader title="Charts" right={
        <SegmentedControl size="sm" options={[{ value: 'month', label: 'Month' }, { value: 'ytd', label: 'YTD' }, { value: '1y', label: '1Y' }]} value={range} onChange={(v) => setRange(v as Range)} />
      } />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SegmentedControl fullWidth options={[{ value: 'expense', label: 'Spent' }, { value: 'income', label: 'Income' }]} value={tab} onChange={(v) => setTab(v as Kind)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {range === 'month' ? 'This month' : range === 'ytd' ? `Jan – now, ${month.slice(0, 4)}` : 'Last 12 months'}
          </span>
          <SegmentedControl size="sm" options={[{ value: 'share', label: 'Share' }, { value: 'trend', label: 'Trend' }]} value={type} onChange={(v) => setType(v as 'share' | 'trend')} />
        </div>
        {total === 0 ? (
          <EmptyState line={tab === 'expense' ? 'No spending in this range.' : 'No income in this range.'} />
        ) : type === 'share' ? (
          <Donut byCategory={byCategory} total={total} currency={currency} />
        ) : (
          <Bars buckets={buckets} currency={currency}
            peakLabel={(b) => (range === 'month' ? `day ${b.label}` : b.label)} />
        )}
      </div>
    </Card>
  );
}
