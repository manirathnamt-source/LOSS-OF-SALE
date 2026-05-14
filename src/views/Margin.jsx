import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows, summarize } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Margin() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { sum, offerGrp, outletGrp, marginPct, costRatio } = useMemo(() => {
    const sum = summarize(rows);
    const gross = sum.itemNet + sum.disc; // what we would have sold at full price
    const profit = sum.itemNet - sum.landing; // after-discount profit vs landing
    return {
      sum,
      gross,
      profit,
      offerGrp:  groupRows(rows, r => r.offer),
      outletGrp: groupRows(rows, r => r.outlet),
      marginPct: sum.itemNet > 0 ? pct(profit, sum.itemNet) : 0,
      costRatio: sum.itemNet > 0 ? pct(sum.landing, sum.itemNet) : 0,
    };
  }, [rows]);

  const profit = sum.itemNet - sum.landing;

  return (
    <>
      <div className="view-banner banner-red">
        <div className="banner-title">💰 Margin — Profitability after discount</div>
        <div className="banner-body">Net sales − Landing cost = profit. Disc% shows what percentage of full-price you gave away.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Net sales</div><div className="val">₹{fs(sum.itemNet)}</div></div>
        <div className="metric red"><div className="lbl">Landing cost</div><div className="val">₹{fs(sum.landing)}</div><div className="sub">{costRatio}% of net</div></div>
        <div className={`metric ${profit >= 0 ? 'green' : 'red'}`}>
          <div className="lbl">Profit (after disc)</div>
          <div className="val">₹{fs(profit)}</div>
          <div className="sub">{marginPct}% margin</div>
        </div>
        <div className="metric amber"><div className="lbl">Discount given</div><div className="val">₹{fs(sum.disc)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Margin by offer</div>
        <SortableTable
          columns={['Offer', 'Lines', 'Net sales', 'Landing', 'Discount', 'Profit', 'Margin%', 'Disc% of gross']}
          rows={offerGrp.map(([k, v]) => {
            const landing = v.items.reduce((s, x) => s + x.landing, 0);
            const profit = v.itemNet - landing;
            const gross = v.itemNet + v.disc;
            const margin = v.itemNet > 0 ? pct(profit, v.itemNet) : 0;
            const discOfGross = gross > 0 ? pct(v.disc, gross) : 0;
            return { cells: [
              k,
              fi(v.c),
              `₹${fs(v.itemNet)}`,
              `₹${fs(landing)}`,
              `₹${fs(v.disc)}`,
              `₹${fs(profit)}`,
              `${margin}%`,
              `${discOfGross}%`,
            ] };
          })}
        />
      </div>

      <div className="card">
        <div className="card-title">Margin by outlet</div>
        <SortableTable
          dense
          columns={['Outlet', 'Net sales', 'Landing', 'Profit', 'Margin%']}
          rows={outletGrp.map(([k, v]) => {
            const landing = v.items.reduce((s, x) => s + x.landing, 0);
            const profit = v.itemNet - landing;
            const margin = v.itemNet > 0 ? pct(profit, v.itemNet) : 0;
            return { cells: [k, `₹${fs(v.itemNet)}`, `₹${fs(landing)}`, `₹${fs(profit)}`, `${margin}%`] };
          })}
        />
      </div>
    </>
  );
}
