import { storeKeys } from './store.js';

export function mergeMonths(monthData, keys) {
  const storeMap = {};
  const allLSRows = [];
  let lsHeaders = [];
  const dayMap = {};

  keys.forEach(key => {
    const d = monthData[key];
    if (!d) return;
    (d.wk.stores || []).forEach(s => {
      if (!storeMap[s.outletNorm]) {
        storeMap[s.outletNorm] = { ...s, days: [...s.days] };
      } else {
        storeMap[s.outletNorm].days = [...storeMap[s.outletNorm].days, ...s.days];
        storeMap[s.outletNorm].totalW += s.totalW;
        storeMap[s.outletNorm].totalB += s.totalB;
      }
    });
    (d.wk.days || []).forEach(day => {
      if (!dayMap[day.dk]) dayMap[day.dk] = { dk: day.dk, dayNum: day.dayNum, w: 0, b: 0 };
      dayMap[day.dk].w += day.w;
      dayMap[day.dk].b += day.b;
    });
    allLSRows.push(...(d.lsRowsRaw || []));
    if ((d.lsHeaders || []).length > (lsHeaders || []).length) lsHeaders = d.lsHeaders;
  });

  const stores = Object.values(storeMap);
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

  return {
    wk: { stores, days, rms, clusters, markets, dks, storeRM, storeByKey },
    lsHeaders,
    lsRowsRaw: allLSRows,
  };
}
