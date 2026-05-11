import { MONTH_ALIASES, MONTH_LABELS } from './constants.js';

export function detectMonthFromTab(tabName) {
  if (!tabName) return null;
  const lc = tabName.toLowerCase();
  let num = null;
  for (const [alias, n] of Object.entries(MONTH_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, 'i');
    if (re.test(lc)) { num = n; break; }
  }
  if (!num) return null;
  const yearMatch = lc.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const shortKey = Object.keys(MONTH_ALIASES).find(k => MONTH_ALIASES[k] === num && k.length === 3);
  return { num, year, key: `${shortKey}${year}`, label: `${MONTH_LABELS[num]} ${year}` };
}
