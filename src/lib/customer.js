export function isNewVal(c) {
  if (!c) return false;
  return c === 'new' || c === 'n' || c === 'new customer' || c === 'first time'
      || c === 'first-time' || c === '1st' || c === 'fresh' || c.startsWith('new ');
}

export function isRepVal(c) {
  if (!c) return false;
  if (c === 'r' || c === 'rp' || c === 'old' || c === 'existing'
      || c === 'regular' || c === 'loyalty' || c === 'member') return true;
  if (c.startsWith('rep') || c.startsWith('ret')) return true;
  return false;
}

export function autoDetectCustCol(rows) {
  if (!rows || !rows.length) return -1;
  const sample = rows.slice(0, 200);
  const ncols = Math.max(...sample.map(r => r.length));
  let bestIdx = -1, bestScore = 0;
  for (let c = 0; c < ncols; c++) {
    let score = 0;
    for (const r of sample) {
      const v = String(r[c] || '').toLowerCase().trim();
      if (isNewVal(v) || isRepVal(v)) score++;
    }
    if (score > bestScore) { bestScore = score; bestIdx = c; }
  }
  return bestScore >= 5 ? bestIdx : -1;
}

export function getCustCounts(rows, custIdx) {
  if (!rows || !rows.length) return { new: 0, repeat: 0, other: 0 };
  let idx = custIdx;
  if (idx < 0) idx = autoDetectCustCol(rows);
  if (idx < 0) return { new: 0, repeat: 0, other: 0 };
  let nw = 0, rp = 0, ot = 0;
  rows.forEach(r => {
    const c = String(r[idx] || '').toLowerCase().trim();
    if (isNewVal(c)) nw++;
    else if (isRepVal(c)) rp++;
    else if (c) ot++;
  });
  if (nw === 0 && rp === 0) {
    const altIdx = autoDetectCustCol(rows);
    if (altIdx >= 0 && altIdx !== idx) return getCustCounts(rows, altIdx);
  }
  return { new: nw, repeat: rp, other: ot };
}
