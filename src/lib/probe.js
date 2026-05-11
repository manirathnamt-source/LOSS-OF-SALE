import { fetchSheetTab } from './sheets.js';
import { detectMonthFromTab } from './months.js';

const MONTH_FULL = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function titleCase(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function candidateNames(prefix, monthIdx, year) {
  const full = MONTH_FULL[monthIdx];
  const short = MONTH_SHORT[monthIdx];
  const tf = titleCase(full);
  const ts = titleCase(short);
  return [
    `${prefix} ${full}`,
    `${prefix} ${short}`,
    `${prefix} ${tf}`,
    `${prefix} ${ts}`,
    `${prefix} ${full} ${year}`,
    `${prefix} ${short} ${year}`,
    `${prefix} ${tf} ${year}`,
    `${prefix} ${ts} ${year}`,
  ];
}

async function tryFetch(sheetId, name) {
  try {
    const { headers, rows } = await fetchSheetTab(sheetId, name);
    if (!headers.length && !rows.length) return null;
    return { name, headers, rows };
  } catch {
    return null;
  }
}

const PREFIX_WALKIN = ['Walkins', 'WALKINS', 'walkins', 'Walk-ins', 'Walk-Ins'];
const PREFIX_LOSS   = ['Loss of sale data', 'Loss Of Sale Data', 'LOSS OF SALE DATA', 'Loss of Sale Data', 'Loss data'];

function uniqueNames(prefixes, monthIdx, year) {
  const out = new Set();
  prefixes.forEach(p => candidateNames(p, monthIdx, year).forEach(n => out.add(n)));
  return [...out];
}

export async function probeMonthsAndTabs(sheetId, opts = {}) {
  const now = new Date();
  const years = opts.years || [now.getFullYear(), now.getFullYear() - 1];
  const monthIdxs = opts.monthIdxs || Array.from({ length: 12 }, (_, i) => i);

  const wkCandidates = [];
  const lsCandidates = [];
  years.forEach(y => monthIdxs.forEach(mi => {
    uniqueNames(PREFIX_WALKIN, mi, y).forEach(n => wkCandidates.push({ name: n, monthIdx: mi, year: y }));
    uniqueNames(PREFIX_LOSS, mi, y).forEach(n => lsCandidates.push({ name: n, monthIdx: mi, year: y }));
  }));

  const wkResults = await runWithConcurrency(wkCandidates, 8, c => tryFetch(sheetId, c.name).then(r => r && ({ ...c, ...r })));
  const lsResults = await runWithConcurrency(lsCandidates, 8, c => tryFetch(sheetId, c.name).then(r => r && ({ ...c, ...r })));

  const foundWk = new Map();
  wkResults.filter(Boolean).forEach(r => {
    const key = `${MONTH_SHORT[r.monthIdx].toLowerCase()}${r.year}`;
    if (!foundWk.has(key)) foundWk.set(key, r);
  });
  const foundLs = new Map();
  lsResults.filter(Boolean).forEach(r => {
    const key = `${MONTH_SHORT[r.monthIdx].toLowerCase()}${r.year}`;
    if (!foundLs.has(key)) foundLs.set(key, r);
  });

  const months = {};
  const activeMonths = [];
  const unpaired = [];

  const allKeys = new Set([...foundWk.keys(), ...foundLs.keys()]);
  [...allKeys]
    .sort((a, b) => {
      const ya = parseInt(a.slice(-4)), yb = parseInt(b.slice(-4));
      const ma = MONTH_SHORT.indexOf(a.slice(0, 3).toUpperCase()), mb = MONTH_SHORT.indexOf(b.slice(0, 3).toUpperCase());
      return ya !== yb ? ya - yb : ma - mb;
    })
    .forEach(k => {
      const wk = foundWk.get(k);
      const ls = foundLs.get(k);
      const meta = detectMonthFromTab((wk?.name || ls?.name) || k);
      if (wk && ls) {
        months[k] = {
          num: (wk.monthIdx + 1),
          year: wk.year,
          label: meta?.label || k,
          wkTab: wk.name,
          lsTab: ls.name,
          _wkData: { headers: wk.headers, rows: wk.rows },
          _lsData: { headers: ls.headers, rows: ls.rows },
        };
        activeMonths.push(k);
      } else {
        unpaired.push([k, { wkTab: wk?.name || null, lsTab: ls?.name || null }]);
      }
    });

  return { months, activeMonths, unpaired };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      try { results[i] = await worker(items[i]); }
      catch { results[i] = null; }
    }
  });
  await Promise.all(runners);
  return results;
}
