import { fi, fs, pct } from './format.js';

export function groupRows(rows, getKey) {
  const m = {};
  rows.forEach(r => {
    const k = String(getKey(r) || '—');
    if (!m[k]) m[k] = { c: 0, qty: 0, disc: 0, billAmt: 0, itemNet: 0, items: [] };
    m[k].c++;
    m[k].qty += r.qty;
    m[k].disc += r.disc;
    m[k].billAmt += r.billAmt;
    m[k].itemNet += r.itemNet;
    m[k].items.push(r);
  });
  return Object.entries(m).sort((a, b) => b[1].disc - a[1].disc);
}

export function summarize(rows) {
  return {
    count: rows.length,
    qty: rows.reduce((s, r) => s + r.qty, 0),
    disc: rows.reduce((s, r) => s + r.disc, 0),
    billAmt: rows.reduce((s, r) => s + r.billAmt, 0),
    itemNet: rows.reduce((s, r) => s + r.itemNet, 0),
    landing: rows.reduce((s, r) => s + r.landing, 0),
    purPrice: rows.reduce((s, r) => s + r.purPrice, 0),
    mrp: rows.reduce((s, r) => s + r.mrp, 0),
  };
}

export function uniqueBills(rows) {
  return new Set(rows.map(r => r.billNo).filter(Boolean));
}
