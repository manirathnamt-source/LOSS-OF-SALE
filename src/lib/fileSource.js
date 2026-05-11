import { detectMonthFromTab } from './months.js';

export function discoverMonthsFromWorkbook(parsed) {
  const found = {};
  parsed.sheetNames.forEach(name => {
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
  return { months, activeMonths, unpaired };
}

export function getTabData(parsed, tabName) {
  return parsed.sheets[tabName] || { headers: [], rows: [] };
}
