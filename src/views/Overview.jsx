import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterStores, filterLS, dateInRange, daysInRange } from '../lib/filter.js';
import { fi, pct, bc } from '../lib/format.js';
import { fmtDK } from '../lib/date.js';

export default function Overview() {
  const { merged, filters } = useDashboard();
  const { wk, lsRows, idx: lsIdx } = merged;

  const data = useMemo(() => {
    const f = filters;
    const filtStores = filterStores(wk.stores, f);
    const filtLS = filterLS(lsRows, lsIdx, f);
    const totalW  = filtStores.reduce((s, r) => s + daysInRange(r.days, f).reduce((a, d) => a + d.w, 0), 0);
    const totalB  = filtStores.reduce((s, r) => s + daysInRange(r.days, f).reduce((a, d) => a + d.b, 0), 0);
    const totalNB = totalW - totalB;
    const totalLS = filtLS.length;
    const avgConv = pct(totalB, totalW);
    const lsCov   = pct(totalLS, totalNB);

    const dayMap = {};
    filtStores.forEach(s => s.days.forEach(d => {
      if (!dateInRange(d.dk, f)) return;
      if (!dayMap[d.dk]) dayMap[d.dk] = { dk: d.dk, dayNum: d.dayNum, w: 0, b: 0, ls: 0 };
      dayMap[d.dk].w += d.w;
      dayMap[d.dk].b += d.b;
    }));
    filtLS.forEach(r => {
      const dk = r._dk;
      if (!dk || !dateInRange(dk, f)) return;
      if (!dayMap[dk]) dayMap[dk] = { dk, dayNum: 0, w: 0, b: 0, ls: 0 };
      dayMap[dk].ls++;
    });
    const dayRows = Object.values(dayMap).sort((a, b) => a.dk.localeCompare(b.dk));

    return { totalW, totalB, totalNB, totalLS, avgConv, lsCov, filtStores, dayRows };
  }, [wk, lsRows, lsIdx, filters]);

  const { totalW, totalB, totalNB, totalLS, avgConv, lsCov, filtStores, dayRows } = data;

  return (
    <>
      <div className="metrics">
        <Metric color="blue"  label="Total walkins" value={fi(totalW)}  sub={`${filtStores.length} stores`} />
        <Metric color="green" label="Total bills"   value={fi(totalB)}  sub={`${avgConv}% conversion`} />
        <Metric color="red"   label="Non-buyers"    value={fi(totalNB)} sub="walkins − bills" />
        <Metric color="amber" label="Loss captured" value={fi(totalLS)} sub={`${lsCov}% of non-buyers`} />
      </div>

      <div className="card">
        <div className="card-title">Day-wise summary</div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Walkins</th><th>Bills</th><th>Conv%</th>
                <th>Non-buyers</th><th>Loss captured</th><th>Coverage%</th>
              </tr>
            </thead>
            <tbody>
              {dayRows.map(d => {
                const hasW = d.w > 0 || d.b > 0;
                const nb = d.w - d.b;
                const conv = pct(d.b, d.w);
                const lsPct = hasW ? pct(d.ls, nb) : 0;
                return (
                  <tr key={d.dk}>
                    <td><strong>{fmtDK(d.dk)}</strong></td>
                    <td>{hasW ? fi(d.w) : <span className="pending">— pending</span>}</td>
                    <td>{hasW ? fi(d.b) : '—'}</td>
                    <td>{hasW ? <span className={`badge ${bc(conv)}`}>{conv}%</span> : '—'}</td>
                    <td>{hasW ? fi(nb) : '—'}</td>
                    <td>{fi(d.ls)}</td>
                    <td>{hasW ? <span className={`badge ${bc(lsPct)}`}>{lsPct}%</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{fi(totalW)}</td>
                <td>{fi(totalB)}</td>
                <td><span className={`badge ${bc(avgConv)}`}>{avgConv}%</span></td>
                <td>{fi(totalNB)}</td>
                <td>{fi(totalLS)}</td>
                <td><span className={`badge ${bc(lsCov)}`}>{lsCov}%</span></td>
              </tr>
            </tfoot>
          </table>
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
      <div className="sub">{sub}</div>
    </div>
  );
}
