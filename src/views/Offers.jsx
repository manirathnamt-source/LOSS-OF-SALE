import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows, summarize, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Offers() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { offerGrp, sum, total } = useMemo(() => {
    const grp = groupRows(rows, r => r.offer);
    return { offerGrp: grp, sum: summarize(rows), total: rows.length };
  }, [rows]);

  return (
    <>
      <div className="view-banner banner-blue">
        <div className="banner-title">🏷️ Offers — Performance by promotion</div>
        <div className="banner-body">Which offers drive the most discount value, units sold, and net sales.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Offer types</div><div className="val">{offerGrp.length}</div></div>
        <div className="metric red"><div className="lbl">Total discount</div><div className="val">₹{fs(sum.disc)}</div></div>
        <div className="metric green"><div className="lbl">Net sales</div><div className="val">₹{fs(sum.itemNet)}</div></div>
        <div className="metric amber"><div className="lbl">Lines redeemed</div><div className="val">{fi(total)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Discount by offer</div>
        <SortableTable
          columns={['Offer', 'Bills', 'Lines', 'Qty', 'Discount', 'Net sales', 'Avg disc/line', 'Share% (of disc)']}
          rows={offerGrp.map(([k, v]) => {
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
          footer={['Total', fi(uniqueBills(rows).size), fi(total), fi(sum.qty), `₹${fs(sum.disc)}`, `₹${fs(sum.itemNet)}`, '', '100%']}
        />
      </div>
    </>
  );
}
