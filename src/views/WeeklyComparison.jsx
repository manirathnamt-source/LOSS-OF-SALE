import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLS } from '../lib/filter.js';
import { fi } from '../lib/format.js';
import { isoWeekKey, isoWeekRange } from '../lib/aggregate.js';
import SortableTable from '../components/SortableTable.jsx';

function wowBadge(delta, pct) {
  if (delta === 0) return <span className="badge" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--muted)' }}>→ 0</span>;
  if (delta > 0)   return <span className="badge badge-red">▲ +{delta} ({pct > 0 ? '+' : ''}{pct}%)</span>;
  return <span className="badge badge-green">▼ {delta} ({pct}%)</span>;
}

function buildRows(byWeek, weeks, dim) {
  const allKeys = new Set();
  weeks.forEach(w => Object.keys(byWeek[w][dim]).forEach(k => allKeys.add(k)));
  return [...allKeys].map(k => {
    const counts = weeks.map(w => byWeek[w][dim][k] || 0);
    const prev = counts[counts.length - 2] || 0;
    const curr = counts[counts.length - 1] || 0;
    const total = counts.reduce((a, b) => a + b, 0);
    const wowDelta = curr - prev;
    const wowPct = prev > 0 ? Math.round((curr - prev) / prev * 100) : (curr > 0 ? 100 : 0);
    return { key: k, counts, total, wowDelta, wowPct };
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
}

export default function WeeklyComparison() {
  const { merged, filters } = useDashboard();
  const { lsRows, idx: lsIdx } = merged;

  const data = useMemo(() => {
    const rows = filterLS(lsRows, lsIdx, filters);
    const { storeIdx } = lsIdx;
    const byWeek = {};
    rows.forEach(r => {
      const wk = isoWeekKey(r._dk);
      if (!wk) return;
      if (!byWeek[wk]) byWeek[wk] = { total: 0, byRM: {}, byCluster: {}, byMarket: {}, byStore: {} };
      byWeek[wk].total++;
      const rm = r._rm || 'Unknown';
      byWeek[wk].byRM[rm] = (byWeek[wk].byRM[rm] || 0) + 1;
      const wkStore = r._wkStore;
      const cluster = wkStore ? wkStore.cluster : '(unsynced)';
      const market  = wkStore ? wkStore.market  : '(unsynced)';
      byWeek[wk].byCluster[cluster] = (byWeek[wk].byCluster[cluster] || 0) + 1;
      byWeek[wk].byMarket[market]   = (byWeek[wk].byMarket[market]   || 0) + 1;
      const store = storeIdx >= 0 ? String(r[storeIdx] || 'Unknown') : 'Unknown';
      byWeek[wk].byStore[store] = (byWeek[wk].byStore[store] || 0) + 1;
    });
    const weeks = Object.keys(byWeek).sort();
    return { rows, byWeek, weeks };
  }, [lsRows, lsIdx, filters]);

  const { rows, byWeek, weeks } = data;

  if (!rows.length) {
    return (
      <div className="view-banner banner-purple">
        <div className="banner-title">📅 Weekly Comparison</div>
        <div className="banner-body">No loss data in current filter selection.</div>
      </div>
    );
  }

  if (weeks.length < 2) {
    return (
      <div className="view-banner banner-purple">
        <div className="banner-title">📅 Weekly Comparison</div>
        <div className="banner-body">Need at least 2 weeks of data. Currently: {weeks.length} week{weeks.length === 1 ? ` (${isoWeekRange(weeks[0])})` : 's'}.</div>
      </div>
    );
  }

  const totalAll = weeks.reduce((s, w) => s + byWeek[w].total, 0);
  const lastWk = byWeek[weeks[weeks.length - 1]].total;
  const prevWk = byWeek[weeks[weeks.length - 2]].total;
  const overallDelta = lastWk - prevWk;
  const overallPct = prevWk > 0 ? Math.round((lastWk - prevWk) / prevWk * 100) : (lastWk > 0 ? 100 : 0);

  const buildTable = (label, dim) => {
    const dimRows = buildRows(byWeek, weeks, dim);
    if (!dimRows.length) return null;
    const headers = [label, ...weeks.map(w => isoWeekRange(w)), 'Total', 'WoW Δ'];
    const tblRows = dimRows.map(r => ({
      cells: [
        <strong>{r.key}</strong>,
        ...r.counts.map(c => fi(c)),
        <strong>{fi(r.total)}</strong>,
        wowBadge(r.wowDelta, r.wowPct),
      ],
    }));
    const totals = weeks.map(w => byWeek[w].total);
    const totFooter = ['Total', ...totals.map(c => fi(c)), fi(totals.reduce((a, b) => a + b, 0)),
      wowBadge(totals[totals.length - 1] - totals[totals.length - 2], prevWk > 0 ? Math.round((lastWk - prevWk) / prevWk * 100) : 0)];
    return (
      <div className="card" key={label}>
        <div className="card-title">By {label.toLowerCase()} ({dimRows.length})</div>
        <SortableTable columns={headers} rows={tblRows} footer={totFooter} />
      </div>
    );
  };

  return (
    <>
      <div className="view-banner banner-purple">
        <div className="banner-title">📅 Weekly Comparison</div>
        <div className="banner-body">
          Loss-of-sale entries per ISO week (Mon–Sun). <strong>▲ red</strong> = increase (more loss),{' '}
          <strong>▼ green</strong> = decrease.
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="lbl">Weeks loaded</div>
          <div className="val">{weeks.length}</div>
          <div className="sub">{isoWeekRange(weeks[0])} → {isoWeekRange(weeks[weeks.length - 1])}</div>
        </div>
        <div className="metric red">
          <div className="lbl">Total entries</div>
          <div className="val">{fi(totalAll)}</div>
        </div>
        <div className="metric">
          <div className="lbl">Latest week</div>
          <div className="val">{fi(lastWk)}</div>
          <div className="sub">{isoWeekRange(weeks[weeks.length - 1])}</div>
        </div>
        <div className={`metric ${overallDelta > 0 ? 'red' : overallDelta < 0 ? 'green' : ''}`}>
          <div className="lbl">Δ vs previous</div>
          <div className="val">{overallDelta > 0 ? '+' : ''}{fi(overallDelta)}</div>
          <div className="sub">{overallPct > 0 ? '+' : ''}{overallPct}% {overallDelta > 0 ? 'increase' : overallDelta < 0 ? 'decrease' : 'no change'}</div>
        </div>
      </div>

      {buildTable('Market', 'byMarket')}
      {buildTable('Cluster', 'byCluster')}
      {buildTable('RM', 'byRM')}
      {buildTable('Store', 'byStore')}
    </>
  );
}
