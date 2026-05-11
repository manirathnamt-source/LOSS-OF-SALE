import { n } from './format.js';
import { parseDate, toDayKey, toTimeBucket } from './date.js';
import { mobStatus, normStore, storeKeys } from './store.js';

export function parseWalkins(headers, rows) {
  const lh = headers.map(h => (h || '').toLowerCase().trim());
  const findHdr = (...alts) => {
    for (const alt of alts) {
      const i = lh.findIndex(h => h === alt.toLowerCase());
      if (i >= 0) return i;
    }
    for (const alt of alts) {
      const i = lh.findIndex(h => h.includes(alt.toLowerCase()));
      if (i >= 0) return i;
    }
    return -1;
  };
  const cols = {
    outlet:  findHdr('outlet name', 'outlet', 'store name', 'branch'),
    storeNm: findHdr('store name', 'store'),
    market:  findHdr('market'),
    rm:      findHdr('regional manager', 'rm', 'regional mgr'),
    cluster: findHdr('cluster', 'cluster manager', 'cm'),
    region:  findHdr('region'),
    type:    findHdr('mall/street', 'type', 'format', 'store type'),
  };

  let twIdx = -1, tbIdx = -1;
  for (let i = lh.length - 1; i >= 0; i--) {
    if ((lh[i].includes('overall') || lh[i].includes('total')) && lh[i].includes('walk')) { twIdx = i; break; }
  }
  for (let i = lh.length - 1; i >= 0; i--) {
    if ((lh[i].includes('overall') || lh[i].includes('total')) && lh[i].includes('bill')) { tbIdx = i; break; }
  }

  const groups = [];
  for (let i = 0; i < lh.length - 2; i++) {
    const h = lh[i] || '';
    const isDateHdr = h === 'date' || /^date[\s_]*\d*$/.test(h);
    if (isDateHdr) {
      const next1 = lh[i + 1] || '';
      const next2 = lh[i + 2] || '';
      if (next1.includes('walk') && next2.includes('bill')) {
        groups.push({ di: i, wi: i + 1, bi: i + 2 });
        i += 3;
      }
    }
  }

  if (cols.outlet < 0) {
    return { stores: [], days: [], rms: [], clusters: [], markets: [], dks: [], storeRM: {}, storeByKey: {}, _err: 'No Outlet Name column found' };
  }

  const stores = rows.map(row => {
    if (!row) return null;
    const outlet = String(row[cols.outlet] || '').trim();
    if (!outlet || outlet.toLowerCase() === 'outlet name') return null;
    const days = groups.map(g => {
      const rawDate = row[g.di];
      const dk = toDayKey(rawDate);
      if (!dk) return null;
      const p = parseDate(rawDate);
      if (!p) return null;
      return { dk, dayNum: p.day, month: p.month, year: p.year, w: n(row[g.wi]), b: n(row[g.bi]) };
    }).filter(Boolean);
    const sumW = days.reduce((a, d) => a + d.w, 0);
    const sumB = days.reduce((a, d) => a + d.b, 0);
    return {
      outlet,
      outletNorm: normStore(outlet),
      market:  cols.market  >= 0 ? String(row[cols.market]  || 'Unknown').trim() || 'Unknown' : 'Unknown',
      rm:      cols.rm      >= 0 ? String(row[cols.rm]      || 'Unknown').trim() || 'Unknown' : 'Unknown',
      cluster: cols.cluster >= 0 ? String(row[cols.cluster] || 'Unknown').trim() || 'Unknown' : 'Unknown',
      region:  cols.region  >= 0 ? String(row[cols.region]  || 'Unknown').trim() || 'Unknown' : 'Unknown',
      type:    cols.type    >= 0 ? String(row[cols.type]    || 'Unknown').trim() || 'Unknown' : 'Unknown',
      totalW: (twIdx >= 0 ? n(row[twIdx]) : 0) || sumW,
      totalB: (tbIdx >= 0 ? n(row[tbIdx]) : 0) || sumB,
      days
    };
  }).filter(Boolean);

  const dayMap = {};
  stores.forEach(s => s.days.forEach(d => {
    if (!dayMap[d.dk]) dayMap[d.dk] = { dk: d.dk, dayNum: d.dayNum, w: 0, b: 0 };
    dayMap[d.dk].w += d.w;
    dayMap[d.dk].b += d.b;
  }));
  const days = Object.values(dayMap).sort((a, b) => a.dk.localeCompare(b.dk));
  const rms = [...new Set(stores.map(s => s.rm).filter(Boolean))].sort();
  const clusters = [...new Set(stores.map(s => s.cluster).filter(Boolean))].sort();
  const markets = [...new Set(stores.map(s => s.market).filter(Boolean))].sort();
  const dks = days.map(d => d.dk);

  const storeRM = {};
  const storeByKey = {};
  stores.forEach(s => {
    storeRM[s.outletNorm] = s.rm;
    storeKeys(s.outlet).forEach(k => { if (!storeByKey[k]) storeByKey[k] = s; });
  });

  return { stores, days, rms, clusters, markets, dks, storeRM, storeByKey };
}

export function parseLoss(headers, rows, wk) {
  const lh = headers.map(h => (h || '').toLowerCase().trim());
  const findCol = (...alts) => {
    for (const alt of alts) {
      const i = lh.indexOf(alt.toLowerCase());
      if (i >= 0) return i;
    }
    for (const alt of alts) {
      const i = lh.findIndex(h => h.includes(alt.toLowerCase()));
      if (i >= 0) return i;
    }
    return -1;
  };

  const reasonIdxA = findCol('reason of loss of sale');
  let subReasonIdxA = -1;
  for (let i = 0; i < lh.length; i++) {
    if (i === reasonIdxA) continue;
    if (lh[i] === 'reason') subReasonIdxA = i;
  }

  const idx = {
    custIdx:      findCol('customer type', 'cust type', 'visitor type'),
    nameIdx:      findCol('customer name', 'customer', 'name'),
    phoneIdx:     findCol('phone number', 'phone', 'mobile', 'contact'),
    dateIdx:      findCol('date'),
    storeIdx:     findCol('outlet name', 'outlet', 'store name', 'store', 'branch'),
    regionIdx:    findCol('region'),
    timingIdx:    findCol('timing', 'time'),
    empIdx:       findCol('employee', 'staff', 'salesperson', 'executive', 'se'),
    reasonIdx:    reasonIdxA >= 0 ? reasonIdxA : findCol('reason', 'cause', 'remark'),
    subReasonIdx: subReasonIdxA,
    catIdx:       findCol('category', 'cat', 'dept', 'group', 'segment'),
    notesIdx:     findCol('customer notes', 'notes', 'remarks'),
    subCatIdx:    findCol('product sub category', 'sub category', 'subcategory'),
    sizeIdx:      findCol('size'),
    styleIdx:     findCol('style'),
    colorIdx:     findCol('color', 'colour'),
    polishIdx:    findCol('polish'),
    designIdx:    findCol('design number', 'design no', 'design'),
    qtyIdx:       findCol('qty', 'quantity', 'nos', 'pcs'),
    valIdx:       findCol('value', 'amount', 'loss value', 'price'),
  };

  const { dateIdx, storeIdx, phoneIdx, timingIdx } = idx;
  const wkDayKeys = new Set(wk.days.map(d => d.dk));
  const storeByKey = wk.storeByKey || {};
  const storeRM = wk.storeRM || {};

  const lsRows = rows.map(r => {
    const dk = toDayKey(r[dateIdx]);
    const syncedDk = dk && wkDayKeys.has(dk) ? dk : null;
    const rawStore = String(r[storeIdx] || '');
    let wkStore = null;
    for (const k of storeKeys(rawStore)) {
      if (storeByKey[k]) { wkStore = storeByKey[k]; break; }
    }
    const storeNorm = normStore(rawStore);
    const rm = wkStore ? wkStore.rm : (storeRM[storeNorm] || 'Unknown');
    const productParts = [idx.subCatIdx, idx.sizeIdx, idx.styleIdx, idx.colorIdx, idx.polishIdx, idx.designIdx, idx.notesIdx]
      .filter(i => i >= 0)
      .map(i => String(r[i] || '').trim())
      .filter(Boolean);
    return {
      ...r,
      _dk: dk,
      _syncedDk: syncedDk,
      _rm: rm,
      _mob: mobStatus(phoneIdx >= 0 ? r[phoneIdx] : ''),
      _time: toTimeBucket(timingIdx >= 0 ? r[timingIdx] : ''),
      _product: productParts.join(' | ') || 'Unknown',
      _wkStore: wkStore,
    };
  });

  const lsDayMap = {};
  lsRows.forEach(r => {
    if (r._syncedDk) {
      if (!lsDayMap[r._syncedDk]) lsDayMap[r._syncedDk] = 0;
      lsDayMap[r._syncedDk]++;
    }
  });

  return { idx, lsRows, lsDayMap };
}
