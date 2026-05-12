import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterStores, filterLS, daysInRange } from '../lib/filter.js';
import { fi, pct } from '../lib/format.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Audit() {
  const { merged, filters } = useDashboard();
  const { wk, lsRows, idx: lsIdx } = merged;

  const data = useMemo(() => {
    const filtStores = filterStores(wk.stores, filters);
    const filtLS = filterLS(lsRows, lsIdx, filters);

    const auditRows = filtStores.map(s => {
      const dRange = daysInRange(s.days, filters);
      const w = dRange.reduce((a, d) => a + d.w, 0);
      const b = dRange.reduce((a, d) => a + d.b, 0);
      const daysWith = dRange.filter(d => d.w > 0).length;
      const nb = w - b;
      const ls = filtLS.filter(r => r._wkStore && r._wkStore.outletNorm === s.outletNorm).length;
      const conv = pct(b, w);
      const cov = nb > 0 ? pct(ls, nb) : 0;
      const phoneInvalid = filtLS
        .filter(r => r._wkStore && r._wkStore.outletNorm === s.outletNorm)
        .filter(r => r._mob === 'invalid_length' || r._mob === 'invalid_junk' || r._mob === 'invalid_repeated').length;

      let issues = [];
      if (w === 0 || daysWith === 0) issues.push('zero walkins');
      else if (conv < 10) issues.push('low conv');
      if (nb > 50 && ls === 0) issues.push('no loss capture');
      else if (nb > 0 && cov < 5) issues.push('low coverage');
      if (phoneInvalid > 5) issues.push('phone quality');

      const level = (w === 0 || (nb > 50 && ls === 0)) ? 'red'
                  : (issues.length > 0) ? 'amber' : 'ok';
      return { store: s.outlet, rm: s.rm, market: s.market, w, b, daysWith, nb, ls, conv, cov, phoneInvalid, issues, level };
    });

    const sorted = auditRows.sort((a, b) => {
      const ord = { red: 0, amber: 1, ok: 2 };
      return ord[a.level] - ord[b.level] || b.nb - a.nb;
    });

    const totals = {
      red: sorted.filter(r => r.level === 'red').length,
      amber: sorted.filter(r => r.level === 'amber').length,
      ok: sorted.filter(r => r.level === 'ok').length,
    };
    return { sorted, totals };
  }, [wk, lsRows, lsIdx, filters]);

  return (
    <>
      <div className="view-banner banner-grey">
        <div className="banner-title">🔎 Audit — Stores needing attention</div>
        <div className="banner-body">Stores ranked by data-quality + performance issues. Click a column header to re-sort.</div>
      </div>

      <div className="metrics">
        <div className="metric red"><div className="lbl">Critical</div><div className="val">{fi(data.totals.red)}</div><div className="sub">stores needing urgent action</div></div>
        <div className="metric amber"><div className="lbl">Watch</div><div className="val">{fi(data.totals.amber)}</div><div className="sub">one or more issues</div></div>
        <div className="metric green"><div className="lbl">OK</div><div className="val">{fi(data.totals.ok)}</div><div className="sub">clean</div></div>
        <div className="metric"><div className="lbl">Total stores</div><div className="val">{fi(data.sorted.length)}</div></div>
      </div>

      <div className="audit-legend">
        <span><span className="leg leg-red" /> Critical: zero walkins or non-buyers with no loss capture</span>
        <span><span className="leg leg-amber" /> Watch: low conversion, low coverage, or phone-quality issues</span>
      </div>

      <div className="card">
        <div className="card-title">Store audit · {data.sorted.length} stores</div>
        <SortableTable
          columns={['Store', 'RM', 'Market', 'Walkins', 'Bills', 'Conv%', 'Non-buyers', 'Loss', 'Cov%', 'Bad phone', 'Issues']}
          rowClass={(r) => r.cells[0].props?.['data-level'] === 'red' ? 'audit-red' : r.cells[0].props?.['data-level'] === 'amber' ? 'audit-amber' : undefined}
          rows={data.sorted.map(r => ({
            cells: [
              <span data-level={r.level}>{r.store}</span>,
              r.rm,
              r.market,
              fi(r.w),
              fi(r.b),
              r.w > 0 ? `${r.conv}%` : '—',
              fi(r.nb),
              fi(r.ls),
              r.nb > 0 ? `${r.cov}%` : '—',
              r.phoneInvalid > 0 ? <span className="badge badge-red">{r.phoneInvalid}</span> : '0',
              r.issues.length > 0 ? r.issues.join(', ') : <span style={{ color: 'var(--green)' }}>—</span>,
            ],
          }))}
        />
      </div>
    </>
  );
}
