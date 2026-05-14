import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtDK } from '../lib/date.js';
import { fi } from '../lib/format.js';

export default function FilterBar() {
  const { merged, activeMonths, months, filters, setFilter, resetFilters, lsSyncOn, setLsSyncOn } = useDashboard();
  if (!merged) return null;

  const { wk, lsRows, idx: lsIdx } = merged;
  const { dks, stores, days } = wk;

  const { rms, clusters, markets, storeNames, reasons, custTypes } = useMemo(() => {
    const rmsSet     = new Set(wk.rms);
    const clustersSet= new Set(wk.clusters);
    const marketsSet = new Set(wk.markets);
    const storeSet   = new Set(stores.map(s => s.outlet).filter(Boolean));
    lsRows.forEach(r => {
      if (r._rm && r._rm !== 'Unknown') rmsSet.add(r._rm);
      const wkStore = r._wkStore;
      if (wkStore) {
        if (wkStore.cluster && wkStore.cluster !== 'Unknown') clustersSet.add(wkStore.cluster);
        if (wkStore.market  && wkStore.market  !== 'Unknown') marketsSet.add(wkStore.market);
      }
      if (lsIdx.storeIdx >= 0) {
        const sn = String(r[lsIdx.storeIdx] || '').trim();
        if (sn) storeSet.add(sn);
      }
    });
    const reasons   = lsIdx.reasonIdx >= 0
      ? [...new Set(lsRows.map(r => String(r[lsIdx.reasonIdx] || '')).filter(Boolean))].sort() : [];
    const custTypes = lsIdx.custIdx >= 0
      ? [...new Set(lsRows.map(r => String(r[lsIdx.custIdx]   || '')).filter(Boolean))].sort() : [];
    return {
      rms:        [...rmsSet].filter(Boolean).sort(),
      clusters:   [...clustersSet].filter(Boolean).sort(),
      markets:    [...marketsSet].filter(Boolean).sort(),
      storeNames: [...storeSet].filter(Boolean).sort(),
      reasons,
      custTypes,
    };
  }, [wk, stores, lsRows, lsIdx]);

  const lastWkDay = days.length ? days[days.length - 1] : null;
  const firstWkDay = days.length ? days[0] : null;
  const totalLSAll = lsRows.length;
  const totalLSSynced = lsRows.filter(r => r._syncedDk).length;
  const hasDateFilter = filters.dateFrom || filters.dateTo;

  return (
    <>
      <div className="filter-bar">
        <label>Month:</label>
        <select value={filters.month} onChange={e => setFilter('month', e.target.value)}>
          {activeMonths.length > 1 && <option value="all">All months ({activeMonths.length})</option>}
          {activeMonths.map(k => <option key={k} value={k}>{months[k]?.label}</option>)}
        </select>
        <Sep />

        <label>From:</label>
        <select value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)}>
          <option value="">Start</option>
          {dks.map(dk => <option key={dk} value={dk}>{fmtDK(dk)}</option>)}
        </select>
        <label>To:</label>
        <select value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)}>
          <option value="">End</option>
          {dks.filter(dk => !filters.dateFrom || dk >= filters.dateFrom)
              .map(dk => <option key={dk} value={dk}>{fmtDK(dk)}</option>)}
        </select>

        <label>Cluster:</label>
        <select value={filters.cluster} onChange={e => setFilter('cluster', e.target.value)}>
          <option value="">All clusters</option>
          {clusters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label>RM:</label>
        <select value={filters.rm} onChange={e => setFilter('rm', e.target.value)}>
          <option value="">All RMs</option>
          {rms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <label>Market:</label>
        <select value={filters.market} onChange={e => setFilter('market', e.target.value)}>
          <option value="">All markets</option>
          {markets.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <label>Store:</label>
        <select value={filters.store} onChange={e => setFilter('store', e.target.value)}>
          <option value="">All stores</option>
          {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label>Reason:</label>
        <select value={filters.reason} onChange={e => setFilter('reason', e.target.value)}>
          <option value="">All reasons</option>
          {reasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {custTypes.length > 0 && (
          <>
            <label>Customer:</label>
            <select value={filters.custType} onChange={e => setFilter('custType', e.target.value)}>
              <option value="">All types</option>
              {custTypes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
        <Sep />
        <label>View:</label>
        <div className="seg-group">
          <button
            className={`seg-btn${!lsSyncOn ? ' seg-active' : ''}`}
            onClick={() => setLsSyncOn(false)}
          >📋 All Loss Data ({fi(totalLSAll)})</button>
          <button
            className={`seg-btn${lsSyncOn ? ' seg-active' : ''}`}
            onClick={() => setLsSyncOn(true)}
          >🔗 Synced to Walkins ({fi(totalLSSynced)})</button>
        </div>
        <button className="filter-btn" onClick={resetFilters}>Reset</button>
      </div>

      <div className="filter-summary">
        <span>📅 <strong>Walkins:</strong> {firstWkDay ? fmtDK(firstWkDay.dk) : '—'} → <strong>{lastWkDay ? fmtDK(lastWkDay.dk) : '—'}</strong> ({days.length} days)</span>
        <span className="dim">|</span>
        {hasDateFilter && (
          <>
            <span>🗓️ <strong>Filtered:</strong> {filters.dateFrom ? fmtDK(filters.dateFrom) : 'Start'} → {filters.dateTo ? fmtDK(filters.dateTo) : 'End'}</span>
            <span className="dim">|</span>
          </>
        )}
        <span>
          🔗 <strong>Loss data in sheet: {fi(totalLSAll)}</strong> · ✅ Synced to walkins: <strong>{fi(totalLSSynced)}</strong>
          {totalLSAll > totalLSSynced && (
            <span className="warn"> · ⏳ {fi(totalLSAll - totalLSSynced)} pending walkins sync</span>
          )}
        </span>
      </div>
    </>
  );
}

function Sep() {
  return <div className="filter-sep" />;
}
