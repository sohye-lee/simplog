import type { AppState } from './types';
import { DEFAULT_CATEGORIES, SUBCATEGORIES, SEED } from './data';

// One localStorage key holding the whole AppState as JSON.
// Bump the version suffix whenever the shape changes so stale
// state doesn't break a new build.
const LS_KEY = 'simplelog.state.v1';

export function defaultState(): AppState {
  return {
    entries: SEED,
    currency: 'USD',
    categories: DEFAULT_CATEGORIES,
    subcats: SUBCATEGORIES,
    catMode: 'twolevel',
    recurring: [],
    page: 'overview',
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) return { ...defaultState(), ...parsed };
    }
  } catch {
    // corrupt state — fall through to the seed
  }
  return defaultState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — the app still works in memory
  }
}
