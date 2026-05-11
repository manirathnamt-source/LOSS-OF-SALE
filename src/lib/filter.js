export function dateInRange(dk, f) {
  if (!dk) return false;
  if (f.dateFrom && dk < f.dateFrom) return false;
  if (f.dateTo && dk > f.dateTo) return false;
  return true;
}

export function daysInRange(days, f) {
  if (!f.dateFrom && !f.dateTo) return days;
  return days.filter(d => dateInRange(d.dk, f));
}

export function filterStores(stores, f) {
  return stores.filter(s =>
    ((!f.dateFrom && !f.dateTo) || s.days.some(d => dateInRange(d.dk, f)))
    && (!f.rm || s.rm === f.rm)
    && (!f.cluster || s.cluster === f.cluster)
    && (!f.market || s.market === f.market)
    && (!f.store || s.outlet === f.store)
  );
}

export function filterLS(lsRows, lsIdx, f) {
  const { storeIdx, reasonIdx, custIdx } = lsIdx;
  return lsRows.filter(r => {
    if (!r._dk) return false;
    if (!dateInRange(r._dk, f)) return false;
    const wkStore = r._wkStore;
    const storeRM = wkStore ? wkStore.rm : r._rm;
    if (f.rm && storeRM !== f.rm) return false;
    if (f.cluster && (!wkStore || wkStore.cluster !== f.cluster)) return false;
    if (f.market && (!wkStore || wkStore.market !== f.market)) return false;
    if (f.store && storeIdx >= 0 && String(r[storeIdx] || '') !== f.store) return false;
    if (f.reason && reasonIdx >= 0 && String(r[reasonIdx] || '') !== f.reason) return false;
    if (f.custType && custIdx >= 0 && String(r[custIdx] || '') !== f.custType) return false;
    return true;
  });
}

export function filterLSTab(lsRows, lsIdx, f, syncOn) {
  const { storeIdx, reasonIdx, custIdx } = lsIdx;
  return lsRows.filter(r => {
    if (syncOn && !r._syncedDk) return false;
    const dk = syncOn ? r._syncedDk : r._dk;
    if (!dateInRange(dk, f)) return false;
    const wkStore = r._wkStore;
    const storeRM = wkStore ? wkStore.rm : r._rm;
    if (f.rm && storeRM !== f.rm) return false;
    if (f.cluster && (!wkStore || wkStore.cluster !== f.cluster)) return false;
    if (f.market && (!wkStore || wkStore.market !== f.market)) return false;
    if (f.store && storeIdx >= 0 && String(r[storeIdx] || '') !== f.store) return false;
    if (f.reason && reasonIdx >= 0 && String(r[reasonIdx] || '') !== f.reason) return false;
    if (f.custType && custIdx >= 0 && String(r[custIdx] || '') !== f.custType) return false;
    return true;
  });
}

export const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  cluster: '',
  rm: '',
  market: '',
  store: '',
  reason: '',
  custType: '',
  month: 'all',
};
