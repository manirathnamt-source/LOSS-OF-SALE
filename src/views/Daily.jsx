import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { fmtDK } from '../lib/date.js';
import { groupRows, summarize, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

export default function Daily() {
  const { data } = useDashboard();
  const rows = data.filteredRows;

  const { dayArr, sum, peakDay, lowDay } = useMemo(() => {
    const dayMap = {};
    rows.forEach(r => {
      if (!r.dk) return;
      if (!dayMap[r.dk]) dayMap[r.dk] = { dk: r.dk, c: 0, disc: 0, itemNet: 0, qty: 0, bills: new Set(), outlets: new Set(), offers: new Set() };
      const d = dayMap[r.dk];
      d.c++; d.disc += r.disc; d.itemNet += r.itemNet; d.qty += r.qty;
      if (r.billNo) d.bills.add(r.billNo);
      if (r.outlet) d.outlets.add(r.outlet);
      if (r.offer) d.offers.add(r.offer);
    });
    const arr = Object.values(dayMap).sort((a, b) => a.dk.localeCompare(b.dk));
    const sorted = [...arr].sort((a, b) => b.disc - a.disc);
    return { dayArr: arr, sum: summarize(rows), peakDay: sorted[0], lowDay: sorted[sorted.length - 1] };
  }, [rows]);

  return (
    <>
      <div className="view-banner banner-purple">
        <div className="banner-title">📅 Daily — Discount activity by day</div>
        <div className="banner-body">Day-wise rollup with peak/quiet day callouts.</div>
      </div>

      <div className="metrics">
        <div className="metric blue"><div className="lbl">Days</div><div className="val">{dayArr.length}</div></div>
        <div className="metric red"><div className="lbl">Peak day discount</div><div className="val">₹{fs(peakDay?.disc || 0)}</div><div className="sub">{peakDay ? fmtDK(peakDay.dk) : '—'}</div></div>
        <div className="metric green"><div className="lbl">Quietest day</div><div className="val">₹{fs(lowDay?.disc || 0)}</div><div className="sub">{lowDay ? fmtDK(lowDay.dk) : '—'}</div></div>
        <div className="metric amber"><div className="lbl">Avg discount/day</div><div className="val">₹{fs(dayArr.length ? sum.disc / dayArr.length : 0)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Day-wise rollup</div>
        <SortableTable
          columns={['Date', 'Bills', 'Lines', 'Outlets', 'Offers used', 'Qty', 'Discount', 'Net sales']}
          rows={dayArr.map(d => ({
            cells: [
              <strong>{fmtDK(d.dk)}</strong>,
              fi(d.bills.size),
              fi(d.c),
              fi(d.outlets.size),
              fi(d.offers.size),
              fi(d.qty),
              `₹${fs(d.disc)}`,
              `₹${fs(d.itemNet)}`,
            ],
          }))}
          footer={['Total', fi(uniqueBills(rows).size), fi(rows.length), '', '', fi(sum.qty), `₹${fs(sum.disc)}`, `₹${fs(sum.itemNet)}`]}
        />
      </div>
    </>
  );
}
