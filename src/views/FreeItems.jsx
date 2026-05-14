import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function FreeItems() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { byItem, byOffer, freeRows } = useMemo(() => {
    const freeRows = rows.filter(r => r.freeItem && r.freeItem !== '' && r.freeItem !== '-');
    const byItem  = groupRows(freeRows, r => r.freeItem);
    const byOffer = groupRows(freeRows, r => r.offer);
    return { byItem, byOffer, freeRows };
  }, [rows]);

  const totalLanding = freeRows.reduce((s, r) => s + r.landing, 0);
  const totalUnits   = freeRows.reduce((s, r) => s + r.qty, 0);

  return (
    <>
      <div className="view-banner banner-green">
        <div className="banner-title">🎁 Free items — given as part of offers</div>
        <div className="banner-body">Most-given items, the offers that trigger them, and the landing-cost we absorbed.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Free items given</div><div className="val">{fi(freeRows.length)}</div></div>
        <div className="metric green"><div className="lbl">Total units</div><div className="val">{fi(totalUnits)}</div></div>
        <div className="metric amber"><div className="lbl">Distinct items</div><div className="val">{byItem.length}</div></div>
        <div className="metric red"><div className="lbl">Cost absorbed (landing)</div><div className="val">₹{fs(totalLanding)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Top free items given</div>
        <SortableTable
          columns={['Free item', 'Lines', 'Units', 'Landing cost', 'Top offer', 'Share% (lines)']}
          rows={byItem.map(([k, v]) => {
            const offers = {};
            v.items.forEach(it => { offers[it.offer] = (offers[it.offer] || 0) + 1; });
            const top = Object.entries(offers).sort((a, b) => b[1] - a[1])[0];
            return { cells: [
              k,
              fi(v.c),
              fi(v.qty),
              `₹${fs(v.items.reduce((s, x) => s + x.landing, 0))}`,
              top ? top[0] : '—',
              `${pct(v.c, freeRows.length)}%`,
            ] };
          })}
        />
      </div>

      <div className="card">
        <div className="card-title">By offer that triggered free items</div>
        <SortableTable
          dense
          columns={['Offer', 'Free lines', 'Distinct items', 'Landing cost', 'Share%']}
          rows={byOffer.map(([k, v]) => {
            const items = new Set(v.items.map(x => x.freeItem)).size;
            return { cells: [
              k,
              fi(v.c),
              fi(items),
              `₹${fs(v.items.reduce((s, x) => s + x.landing, 0))}`,
              `${pct(v.c, freeRows.length)}%`,
            ] };
          })}
        />
      </div>
    </>
  );
}
