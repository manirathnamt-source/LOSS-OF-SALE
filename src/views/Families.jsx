import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows, summarize, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Families() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { famGrp, sum } = useMemo(() => {
    return { famGrp: groupRows(rows, r => r.family), sum: summarize(rows) };
  }, [rows]);

  return (
    <>
      <div className="view-banner banner-red">
        <div className="banner-title">📦 Offer categories — Disc% vs Free vs Group</div>
        <div className="banner-body">How offer types stack up: bill-level % discounts, free gifts, group offers.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Categories</div><div className="val">{famGrp.length}</div></div>
        <div className="metric red"><div className="lbl">Total discount</div><div className="val">₹{fs(sum.disc)}</div></div>
        <div className="metric green"><div className="lbl">Total qty</div><div className="val">{fi(sum.qty)}</div></div>
        <div className="metric amber"><div className="lbl">Net sales</div><div className="val">₹{fs(sum.itemNet)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">By offer category</div>
        <SortableTable
          columns={['Category', 'Bills', 'Lines', 'Qty', 'Discount', 'Net sales', 'Disc/Line', 'Share% (of disc)']}
          rows={famGrp.map(([k, v]) => {
            const bills = uniqueBills(v.items).size;
            return { cells: [
              k,
              fi(bills),
              fi(v.c),
              fi(v.qty),
              `₹${fs(v.disc)}`,
              `₹${fs(v.itemNet)}`,
              `₹${fs(v.c > 0 ? v.disc / v.c : 0)}`,
              `${pct(v.disc, sum.disc)}%`,
            ] };
          })}
          footer={['Total', fi(uniqueBills(rows).size), fi(rows.length), fi(sum.qty), `₹${fs(sum.disc)}`, `₹${fs(sum.itemNet)}`, '', '100%']}
        />
      </div>
    </>
  );
}
