import { n } from './format.js';
import { toDayKey } from './date.js';

const DEFAULT_COLS = {
  billNo: 'bill no',
  date: 'bill date',
  offer: 'offer name',
  family: 'family name',
  freeItem: 'free item name',
  itemAlias: 'item alias',
  qty: 'qty',
  itemRate: 'item rate',
  purPrice: 'pur price',
  landing: 'landing cost',
  mrp: 'mrp',
  disc: 'disc amt',
  bill: 'bill amt',
  itemNet: 'item net amt',
  outlet: 'outlet name',
};

function findCol(headers, label) {
  const lower = headers.map(h => String(h || '').toLowerCase().trim());
  const exact = lower.indexOf(label);
  if (exact >= 0) return exact;
  return lower.findIndex(h => h.includes(label));
}

export function parseDiscount(headers, rows, mapping) {
  const idx = {};
  for (const [k, label] of Object.entries(DEFAULT_COLS)) idx[k] = findCol(headers, label);

  const parsed = rows
    .map(r => {
      if (!r) return null;
      const billNo = String(r[idx.billNo] || '').trim();
      const outlet = String(r[idx.outlet] || '').trim();
      if (!billNo && !outlet) return null;
      const dk = toDayKey(r[idx.date]);
      const map = mapping && mapping.byOutlet ? mapping.byOutlet[outletKey(outlet)] : null;
      return {
        billNo,
        dk,
        offer:    String(r[idx.offer]    || '').trim(),
        family:   String(r[idx.family]   || '').trim(),
        freeItem: String(r[idx.freeItem] || '').trim(),
        itemAlias:String(r[idx.itemAlias]|| '').trim(),
        qty:      n(r[idx.qty]),
        itemRate: n(r[idx.itemRate]),
        purPrice: n(r[idx.purPrice]),
        landing:  n(r[idx.landing]),
        mrp:      n(r[idx.mrp]),
        disc:     n(r[idx.disc]),
        billAmt:  n(r[idx.bill]),
        itemNet:  n(r[idx.itemNet]),
        outlet,
        rm:     map?.rm     || 'Unmapped',
        cm:     map?.cm     || 'Unmapped',
        market: map?.market || 'Unmapped',
      };
    })
    .filter(Boolean);

  // Distinct sets
  const outlets = [...new Set(parsed.map(r => r.outlet).filter(Boolean))].sort();
  const offers  = [...new Set(parsed.map(r => r.offer).filter(Boolean))].sort();
  const families= [...new Set(parsed.map(r => r.family).filter(Boolean))].sort();
  const rms     = [...new Set(parsed.map(r => r.rm).filter(Boolean))].sort();
  const markets = [...new Set(parsed.map(r => r.market).filter(Boolean))].sort();
  const dks     = [...new Set(parsed.map(r => r.dk).filter(Boolean))].sort();

  return { idx, rows: parsed, outlets, offers, families, rms, markets, dks };
}

export function outletKey(s) {
  return String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase();
}

export function parseMapping(headers, rows) {
  // Mapping has two side-by-side sections (col 0-2 and col 7-10).
  // We use col 0-2 (Store / RM / CM) as the primary mapping.
  // Cols 7-10 (Sl no / Outlet / Store / Market) supplement with market info.
  const byOutlet = {};

  // Section A: Store Name (0) → RM Name (1), CM Name (2)
  rows.forEach(r => {
    if (!r) return;
    const store = String(r[0] || '').trim();
    if (!store) return;
    const k = outletKey(store);
    if (!byOutlet[k]) byOutlet[k] = { rm: '', cm: '', market: '' };
    byOutlet[k].rm = String(r[1] || '').trim() || byOutlet[k].rm;
    byOutlet[k].cm = String(r[2] || '').trim() || byOutlet[k].cm;
  });

  // Section B: Outlet (8) → Market (10) — use col 7 as Sl detection, but only if present
  rows.forEach(r => {
    if (!r) return;
    const out = String(r[8] || '').trim();
    if (!out) return;
    const k = outletKey(out);
    if (!byOutlet[k]) byOutlet[k] = { rm: '', cm: '', market: '' };
    const market = String(r[10] || '').trim();
    if (market) byOutlet[k].market = market;
  });

  return { byOutlet };
}

export function dateInRange(dk, f) {
  if (!dk) return false;
  if (f.dateFrom && dk < f.dateFrom) return false;
  if (f.dateTo && dk > f.dateTo) return false;
  return true;
}

export function applyFilters(rows, f) {
  return rows.filter(r => {
    if (!dateInRange(r.dk, f)) return false;
    if (f.outlet && r.outlet !== f.outlet) return false;
    if (f.offer  && r.offer  !== f.offer)  return false;
    if (f.family && r.family !== f.family) return false;
    if (f.rm     && r.rm     !== f.rm)     return false;
    if (f.market && r.market !== f.market) return false;
    return true;
  });
}

export const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  outlet: '',
  offer: '',
  family: '',
  rm: '',
  market: '',
};
