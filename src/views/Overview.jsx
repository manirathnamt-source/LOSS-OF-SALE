import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterStores, filterLS, dateInRange, daysInRange } from '../lib/filter.js';
import { fi, pct, bc } from '../lib/format.js';
import { fmtDK } from '../lib/date.js';
import { getCustCounts } from '../lib/customer.js';
import SortableTable from '../components/SortableTable.jsx';

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

    // Day-wise
    const dayMap = {};
    filtStores.forEach(s => s.days.forEach(d => {
      if (!dateInRange(d.dk, f)) return;
      if (!dayMap[d.dk]) dayMap[d.dk] = { dk: d.dk, w: 0, b: 0, ls: 0 };
      dayMap[d.dk].w += d.w;
      dayMap[d.dk].b += d.b;
    }));
    filtLS.forEach(r => {
      const dk = r._dk;
      if (!dk || !dateInRange(dk, f)) return;
      if (!dayMap[dk]) dayMap[dk] = { dk, w: 0, b: 0, ls: 0 };
      dayMap[dk].ls++;
    });
    const dayRows = Object.values(dayMap).sort((a, b) => a.dk.localeCompare(b.dk));

    // Market summary
    const mktMap = {};
    filtStores.forEach(s => {
      const w = daysInRange(s.days, f).reduce((a, d) => a + d.w, 0);
      const b = daysInRange(s.days, f).reduce((a, d) => a + d.b, 0);
      if (!mktMap[s.market]) mktMap[s.market] = { w: 0, b: 0, ls: 0, items: [] };
      mktMap[s.market].w += w;
      mktMap[s.market].b += b;
    });
    filtLS.forEach(r => {
      if (r._wkStore && mktMap[r._wkStore.market]) {
        mktMap[r._wkStore.market].ls++;
        mktMap[r._wkStore.market].items.push(r);
      }
    });
    const mktArr = Object.entries(mktMap).sort((a, b) => b[1].w - a[1].w);

    // RM summary (RM-level, includes stores filtered only by cluster/market)
    const rmFilt = wk.stores.filter(s =>
      (!f.rm || s.rm === f.rm)
      && (!f.cluster || s.cluster === f.cluster)
      && (!f.market || s.market === f.market)
    );
    const rmMap = {};
    rmFilt.forEach(s => {
      if (!rmMap[s.rm]) rmMap[s.rm] = { stores: 0, totalW: 0, totalB: 0, zeroStores: 0, ls: 0 };
      const dRange = daysInRange(s.days, f);
      const w = dRange.reduce((a, d) => a + d.w, 0);
      const b = dRange.reduce((a, d) => a + d.b, 0);
      const daysWith = dRange.filter(d => d.w > 0).length;
      rmMap[s.rm].stores++;
      rmMap[s.rm].totalW += w;
      rmMap[s.rm].totalB += b;
      if (w === 0 || daysWith === 0) rmMap[s.rm].zeroStores++;
    });
    filtLS.forEach(r => { if (r._rm && rmMap[r._rm]) rmMap[r._rm].ls++; });
    const rmArr = Object.entries(rmMap)
      .filter(([k]) => k && k !== 'Unknown')
      .sort((a, b) => b[1].totalW - a[1].totalW);
    const totRMStores = rmArr.reduce((s, [, v]) => s + v.stores, 0);
    const totRMZero = rmArr.reduce((s, [, v]) => s + v.zeroStores, 0);

    return { totalW, totalB, totalNB, totalLS, avgConv, lsCov, filtStores, dayRows, mktArr, rmArr, totRMStores, totRMZero };
  }, [wk, lsRows, lsIdx, filters]);

  const { totalW, totalB, totalNB, totalLS, avgConv, lsCov, filtStores, dayRows, mktArr, rmArr, totRMStores, totRMZero } = data;
  const custIdx = lsIdx.custIdx;

  return (
    <>
      <div className="metrics">
        <Metric color="blue"  label="Total walkins" value={fi(totalW)}  sub={`${filtStores.length} stores`} />
        <Metric color="green" label="Total bills"   value={fi(totalB)}  sub={`${avgConv}% conversion`} />
        <Metric color="red"   label="Non-buyers"    value={fi(totalNB)} sub="walkins − bills" />
        <Metric color="amber" label="Loss captured" value={fi(totalLS)} sub={`${lsCov}% of non-buyers`} />
      </div>

      <div className="card">
        <div className="card-title">RM summary — stores per RM with active vs zero-walkin breakdown</div>
        <SortableTable
          columns={['RM', 'Stores', 'Active', '🔴 Zero', 'Walkins', 'Bills', 'Non-buyers', 'Conv%', 'Loss', 'Cov%']}
          rows={rmArr.map(([rm, v]) => {
            const nb = v.totalW - v.totalB;
            const cv = pct(v.totalB, v.totalW);
            const lsPct = pct(v.ls, nb);
            const active = v.stores - v.zeroStores;
            return { cells: [
              <strong>{rm}</strong>,
              fi(v.stores),
              fi(active),
              v.zeroStores > 0
                ? <span className="badge badge-red">{v.zeroStores}</span>
                : <span className="badge badge-green">0</span>,
              fi(v.totalW),
              fi(v.totalB),
              fi(nb),
              <span className={`badge ${bc(cv)}`}>{cv}%</span>,
              fi(v.ls),
              <span className={`badge ${bc(lsPct)}`}>{lsPct}%</span>,
            ] };
          })}
          footer={[
            'Total',
            fi(totRMStores),
            fi(totRMStores - totRMZero),
            totRMZero > 0 ? <span className="badge badge-red">{totRMZero}</span> : '0',
            fi(totalW),
            fi(totalB),
            fi(totalNB),
            <span className={`badge ${bc(avgConv)}`}>{avgConv}%</span>,
            fi(totalLS),
            <span className={`badge ${bc(lsCov)}`}>{lsCov}%</span>,
          ]}
        />
      </div>

      <div className="card">
        <div className="card-title">Market summary</div>
        <SortableTable
          columns={['Market', 'Walkins', 'Bills', 'Non-buyers', 'Conv%', 'Loss', 'Cov%', '🆕 New', '🔁 Repeat']}
          rows={mktArr.map(([mkt, v]) => {
            const nb = v.w - v.b;
            const cv = pct(v.b, v.w);
            const lsPct = pct(v.ls, nb);
            const cc = getCustCounts(v.items || [], custIdx);
            return { cells: [
              mkt,
              fi(v.w),
              fi(v.b),
              fi(nb),
              <span className={`badge ${bc(cv)}`}>{cv}%</span>,
              fi(v.ls),
              <span className={`badge ${bc(lsPct)}`}>{lsPct}%</span>,
              fi(cc.new),
              fi(cc.repeat),
            ] };
          })}
          footer={[
            'Total',
            fi(totalW),
            fi(totalB),
            fi(totalNB),
            <span className={`badge ${bc(avgConv)}`}>{avgConv}%</span>,
            fi(totalLS),
            <span className={`badge ${bc(lsCov)}`}>{lsCov}%</span>,
            '', '',
          ]}
        />
      </div>

      <div className="card">
        <div className="card-title">Day-wise summary</div>
        <SortableTable
          columns={['Date', 'Walkins', 'Bills', 'Conv%', 'Non-buyers', 'Loss', 'Cov%']}
          rows={dayRows.map(d => {
            const hasW = d.w > 0 || d.b > 0;
            const nb = d.w - d.b;
            const conv = pct(d.b, d.w);
            const lsPct = hasW ? pct(d.ls, nb) : 0;
            return { cells: [
              <strong>{fmtDK(d.dk)}</strong>,
              hasW ? fi(d.w) : <span className="pending">— pending</span>,
              hasW ? fi(d.b) : '—',
              hasW ? <span className={`badge ${bc(conv)}`}>{conv}%</span> : '—',
              hasW ? fi(nb) : '—',
              fi(d.ls),
              hasW ? <span className={`badge ${bc(lsPct)}`}>{lsPct}%</span> : '—',
            ] };
          })}
          footer={[
            'Total',
            fi(totalW),
            fi(totalB),
            <span className={`badge ${bc(avgConv)}`}>{avgConv}%</span>,
            fi(totalNB),
            fi(totalLS),
            <span className={`badge ${bc(lsCov)}`}>{lsCov}%</span>,
          ]}
        />
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
