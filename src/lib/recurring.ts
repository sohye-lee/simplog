// Recurring entries — rules materialize into real entries when the
// app opens. Generated entry ids are DETERMINISTIC (rule.id * 1000 +
// period index), so two devices generating the same period produce
// the same id and the server upsert dedupes — no duplicates. The
// rules themselves live in synced settings, so `lastGen` also travels
// between devices.
import type { Entry, RecurringRule } from './types';

const MAX_PERIODS = 999; // id-space limit per rule (≈19 years weekly)

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date of the nth occurrence (n = 0 is the anchor itself). */
export function occurrenceDate(rule: RecurringRule, n: number): string {
  const [y, m, d] = rule.anchor.split('-').map(Number);
  if (rule.freq === 'weekly') {
    const dt = new Date(y, m - 1, d + n * 7);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }
  // monthly — clamp the day to the target month's length (31st → 30th/28th)
  const total = m - 1 + n;
  const ty = y + Math.floor(total / 12);
  const tm = total % 12;
  const lastDay = new Date(ty, tm + 1, 0).getDate();
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, lastDay))}`;
}

export function entryIdFor(rule: RecurringRule, n: number): number {
  return rule.id * 1000 + n;
}

/**
 * Generate all due entries (occurrences up to `today` not yet
 * materialized) and bump each rule's lastGen.
 */
export function materialize(
  recurring: RecurringRule[],
  today: string,
): { newEntries: Entry[]; rules: RecurringRule[]; changed: boolean } {
  const newEntries: Entry[] = [];
  let changed = false;
  const rules = recurring.map((rule) => {
    let last = rule.lastGen;
    for (let n = last + 1; n <= MAX_PERIODS; n++) {
      const date = occurrenceDate(rule, n);
      if (date > today) break;
      const e: Entry = {
        id: entryIdFor(rule, n),
        kind: rule.kind,
        amount: rule.amount,
        category: rule.category,
        note: rule.note,
        date,
      };
      if (rule.sub) e.sub = rule.sub;
      newEntries.push(e);
      last = n;
    }
    if (last !== rule.lastGen) { changed = true; return { ...rule, lastGen: last }; }
    return rule;
  });
  return { newEntries, rules, changed };
}

/** Next occurrence after today — for display in Settings. */
export function nextOccurrence(rule: RecurringRule, today: string): string {
  for (let n = rule.lastGen + 1; n <= MAX_PERIODS; n++) {
    const date = occurrenceDate(rule, n);
    if (date > today) return date;
  }
  return occurrenceDate(rule, rule.lastGen + 1);
}
