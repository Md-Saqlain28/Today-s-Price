/**
 * Lightweight localStorage-backed price history store.
 *
 * Each asset id maps to an array of { t, p } points (timestamp ms, price).
 * Capped at MAX_POINTS to keep storage small. Used to render sparklines.
 */

const STORAGE_KEY = "tp_price_history_v1";
const MAX_POINTS = 60;
// Skip identical-price writes if the last point is newer than this.
const MIN_INTERVAL_MS = 20 * 1000;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function recordPrice(id, price) {
  if (!id || price == null || isNaN(price)) return;

  const store = readStore();
  const series = store[id] || [];
  const now = Date.now();
  const last = series[series.length - 1];

  if (last && last.p === price && now - last.t < MIN_INTERVAL_MS) {
    return;
  }

  series.push({ t: now, p: price });
  if (series.length > MAX_POINTS) {
    series.splice(0, series.length - MAX_POINTS);
  }

  store[id] = series;
  writeStore(store);
}

export function getHistory(id) {
  if (!id) return [];
  const store = readStore();
  return store[id] || [];
}

export function recordMany(items) {
  if (!Array.isArray(items)) return;
  const store = readStore();
  const now = Date.now();
  let changed = false;

  for (const item of items) {
    if (!item?.id || item.price == null || isNaN(item.price)) continue;
    const series = store[item.id] || [];
    const last = series[series.length - 1];
    if (last && last.p === item.price && now - last.t < MIN_INTERVAL_MS) continue;
    series.push({ t: now, p: item.price });
    if (series.length > MAX_POINTS) {
      series.splice(0, series.length - MAX_POINTS);
    }
    store[item.id] = series;
    changed = true;
  }

  if (changed) writeStore(store);
}
