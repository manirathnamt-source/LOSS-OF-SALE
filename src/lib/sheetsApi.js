import { detectMonthFromTab } from './months.js';

const BASE = 'https://sheets.googleapis.com/v4';

export function extractSheetId(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{30,}$/.test(s)) return s;
  return null;
}

async function api(url) {
  const r = await fetch(url);
  if (!r.ok) {
    let detail = '';
    try {
      const data = await r.json();
      detail = data.error?.message || '';
    } catch { /* ignore */ }
    if (r.status === 403) throw new Error(`Sheets API forbidden: ${detail || 'check API key restrictions and that Sheets API is enabled on the project.'}`);
    if (r.status === 404) throw new Error(`Spreadsheet not found or not shared. Make sure it is "Anyone with link → Viewer".`);
    if (r.status === 400) throw new Error(`Bad request: ${detail}`);
    throw new Error(`Sheets API ${r.status}: ${detail || 'unknown error'}`);
  }
  return r.json();
}

export async function getSpreadsheetTabs(sheetId, apiKey) {
  const url = `${BASE}/spreadsheets/${sheetId}?fields=sheets.properties(title,hidden)&key=${apiKey}`;
  const data = await api(url);
  return (data.sheets || [])
    .map(s => s.properties)
    .filter(p => !p.hidden)
    .map(p => p.title);
}

export async function batchGetTabs(sheetId, apiKey, tabNames) {
  if (!tabNames.length) return {};
  const ranges = tabNames.map(n => `ranges=${encodeURIComponent(n)}`).join('&');
  const opts = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING';
  const url = `${BASE}/spreadsheets/${sheetId}/values:batchGet?${ranges}&${opts}&key=${apiKey}`;
  const data = await api(url);
  const out = {};
  (data.valueRanges || []).forEach((vr, i) => {
    const name = tabNames[i];
    const values = vr.values || [];
    const headers = (values[0] || []).map(h => String(h ?? '').trim());
    const rows = values.slice(1);
    out[name] = { headers, rows };
  });
  return out;
}

export function pairMonthTabs(allTabNames) {
  const found = {};
  allTabNames.forEach(name => {
    const lc = name.toLowerCase();
    const isWalkin = lc.includes('walkin') || lc.includes('walk-in') || lc.startsWith('walk ');
    const isLoss = lc.includes('loss of sale') || lc.includes('loss data');
    if (!isWalkin && !isLoss) return;
    const m = detectMonthFromTab(name);
    if (!m) return;
    if (!found[m.key]) found[m.key] = { num: m.num, year: m.year, label: m.label, wkTab: null, lsTab: null };
    if (isWalkin) found[m.key].wkTab = name;
    else found[m.key].lsTab = name;
  });

  const months = {};
  const unpaired = [];
  Object.entries(found).forEach(([k, v]) => {
    if (v.wkTab && v.lsTab) months[k] = v;
    else unpaired.push([k, v]);
  });
  const activeMonths = Object.keys(months).sort((a, b) => {
    const va = months[a], vb = months[b];
    return va.year !== vb.year ? va.year - vb.year : va.num - vb.num;
  });
  return { months, activeMonths, unpaired, allTabNames };
}

export async function discoverViaApi(sheetId, apiKey) {
  const tabs = await getSpreadsheetTabs(sheetId, apiKey);
  return pairMonthTabs(tabs);
}

export async function fetchMonthsViaApi(sheetId, apiKey, months, activeMonths) {
  const tabNames = [];
  activeMonths.forEach(k => {
    tabNames.push(months[k].wkTab);
    tabNames.push(months[k].lsTab);
  });
  const fetched = await batchGetTabs(sheetId, apiKey, tabNames);
  const monthData = {};
  activeMonths.forEach(k => {
    const m = months[k];
    monthData[k] = {
      wkRaw: fetched[m.wkTab] || { headers: [], rows: [] },
      lsRaw: fetched[m.lsTab] || { headers: [], rows: [] },
    };
  });
  return monthData;
}
