import { n } from './format.js';

export function groupBy(rows, getKey, { qtyIdx, valIdx } = {}) {
  const m = {};
  rows.forEach(r => {
    const k = String(getKey(r) || 'Unknown');
    if (!m[k]) m[k] = { c: 0, q: 0, v: 0, items: [] };
    m[k].c++;
    if (qtyIdx >= 0) m[k].q += n(r[qtyIdx]);
    if (valIdx >= 0) m[k].v += n(r[valIdx]);
    m[k].items.push(r);
  });
  return Object.entries(m).sort((a, b) => b[1].c - a[1].c);
}

export function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function isoWeekKey(dk) {
  if (!dk) return null;
  const d = new Date(dk + 'T00:00:00');
  if (isNaN(d)) return null;
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  const wk = 1 + Math.ceil((firstThursday - target) / (7 * 24 * 3600 * 1000));
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

export function isoWeekRange(weekKey) {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekKey;
  const year = parseInt(m[1]), wk = parseInt(m[2]);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - jan4Day);
  const monday = new Date(week1Mon);
  monday.setDate(week1Mon.getDate() + (wk - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}
