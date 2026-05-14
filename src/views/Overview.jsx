import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct, bc } from '../lib/format.js';
import { fmtDK } from '../lib/date.js';
import { groupRows, summarize, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Overview() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const m = useMemo(() => {
    const sum = summarize(rows);
    const bills = uniqueBills(rows);
    const offerCount = new Set(rows.map(r => r.offer).filter(Boolean)).size;
    const outletCount = new Set(rows.map(r => r.outlet).filter(Boolean)).size;
    const avgDisc = sum.itemNet > 0 ? pct(sum.disc, sum.itemNet + sum.disc) : 0;

    // Day-wise
    const dayMap = {};
    rows.forEach(r => {
      if (!r.dk) return;
      if (!dayMap[r.dk]) dayMap[r.dk] = { dk: r.dk, c: 0, disc: 0, bill: 0, itemNet: 0, bills: new Set() };
      dayMap[r.dk].c++;
      dayMap[r.dk].disc += r.disc;
      dayMap[r.dk].bill += r.billAmt;
      dayMap[r.dk].itemNet += r.itemNet;
      if (r.billNo) dayMap[r.dk].bills.add(r.billNo);
    });
    const dayArr = Object.values(dayMap).sort((a, b) => a.dk.localeCompare(b.dk));

    const offerGrp = groupRows(rows, r => r.offer).slice(0, 5);
    const outletGrp = groupRows(rows, r => r.outlet).slice(0, 5);

    return { sum, bills, offerCount, outletCount, avgDisc, dayArr, offerGrp, outletGrp };
  }, [rows]);

  const { sum, bills, offerCount, outletCount, avgDisc, dayArr, offerGrp, outletGrp } = m;

  return (
    <>
      <div className="metrics">
        <Metric color="blue"  label="Total bills"    value={fi(bills.size)} sub={`${fi(rows.length)} discount lines`} />
        <Metric color="red"   label="Total discount" value={`₹${fs(sum.disc)}`} sub={`${avgDisc}% of gross`} />
        <Metric color="green" label="Net sales"      value={`₹${fs(sum.itemNet)}`} sub={`${fi(sum.qty)} units`} />
        <Metric color="amber" label="Outlets"        value={fi(outletCount)} sub={`${offerCount} offer types`} />
      </div>

      <div className="card">
        <div className="card-title">Day-wise summary</div>
        <SortableTable
          columns={['Date', 'Bills', 'Discount lines', 'Discount', 'Net sales', 'Avg disc/bill']}
          rows={dayArr.map(d => ({
            cells: [
              <strong>{fmtDK(d.dk)}</strong>,
              fi(d.bills.size),
              fi(d.c),
              `₹${fs(d.disc)}`,
              `₹${fs(d.itemNet)}`,
              `₹${fs(d.bills.size > 0 ? d.disc / d.bills.size : 0)}`,
            ],
          }))}
          footer={['Total', fi(bills.size), fi(rows.length), `₹${fs(sum.disc)}`, `₹${fs(sum.itemNet)}`, `₹${fs(bills.size > 0 ? sum.disc / bills.size : 0)}`]}
        />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Top 5 offers by discount</div>
          <SortableTable
            dense
            columns={['Offer', 'Lines', 'Discount', 'Share%']}
            rows={offerGrp.map(([k, v]) => ({
              cells: [k, fi(v.c), `₹${fs(v.disc)}`, `${pct(v.disc, sum.disc)}%`],
            }))}
          />
        </div>
        <div className="card">
          <div className="card-title">Top 5 outlets by discount</div>
          <SortableTable
            dense
            columns={['Outlet', 'Lines', 'Discount', 'Share%']}
            rows={outletGrp.map(([k, v]) => ({
              cells: [k, fi(v.c), `₹${fs(v.disc)}`, `${pct(v.disc, sum.disc)}%`],
            }))}
          />
        </div>
      </div>
    </>
  );
}

function Metric({ color, label, value, sub }) {
  return (
    <div className={`metric ${color}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
