import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows, summarize, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Outlets() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { outletGrp, rmGrp, marketGrp, sum, total } = useMemo(() => {
    return {
      outletGrp: groupRows(rows, r => r.outlet),
      rmGrp:     groupRows(rows, r => r.rm),
      marketGrp: groupRows(rows, r => r.market),
      sum: summarize(rows),
      total: rows.length,
    };
  }, [rows]);

  return (
    <>
      <div className="view-banner banner-amber">
        <div className="banner-title">🏬 Outlets — Discount usage by store</div>
        <div className="banner-body">Per-outlet, per-RM, per-market breakdown. Click headers to sort.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Outlets</div><div className="val">{outletGrp.length}</div></div>
        <div className="metric green"><div className="lbl">RMs</div><div className="val">{rmGrp.filter(([k]) => k && k !== 'Unmapped').length}</div></div>
        <div className="metric amber"><div className="lbl">Markets</div><div className="val">{marketGrp.filter(([k]) => k && k !== 'Unmapped').length}</div></div>
        <div className="metric red"><div className="lbl">Total discount</div><div className="val">₹{fs(sum.disc)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">By outlet</div>
        <SortableTable
          columns={['Outlet', 'RM', 'Market', 'Bills', 'Lines', 'Discount', 'Net sales', 'Avg disc/bill', 'Share%']}
          rows={outletGrp.map(([k, v]) => {
            const bills = uniqueBills(v.items).size;
            const rm = v.items[0]?.rm || '—';
            const market = v.items[0]?.market || '—';
            return { cells: [
              k, rm, market,
              fi(bills), fi(v.c),
              `₹${fs(v.disc)}`,
              `₹${fs(v.itemNet)}`,
              `₹${fs(bills > 0 ? v.disc / bills : 0)}`,
              `${pct(v.disc, sum.disc)}%`,
            ] };
          })}
          footer={['Total', '', '', fi(uniqueBills(rows).size), fi(total), `₹${fs(sum.disc)}`, `₹${fs(sum.itemNet)}`, '', '100%']}
        />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">By RM</div>
          <SortableTable
            dense
            columns={['RM', 'Outlets', 'Discount', 'Net sales', 'Share%']}
            rows={rmGrp.map(([k, v]) => {
              const outlets = new Set(v.items.map(x => x.outlet)).size;
              return { cells: [k, fi(outlets), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`, `${pct(v.disc, sum.disc)}%`] };
            })}
          />
        </div>
        <div className="card">
          <div className="card-title">By market</div>
          <SortableTable
            dense
            columns={['Market', 'Outlets', 'Discount', 'Net sales', 'Share%']}
            rows={marketGrp.map(([k, v]) => {
              const outlets = new Set(v.items.map(x => x.outlet)).size;
              return { cells: [k, fi(outlets), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`, `${pct(v.disc, sum.disc)}%`] };
            })}
          />
        </div>
      </div>
    </>
  );
}
