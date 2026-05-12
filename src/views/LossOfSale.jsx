import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLSTab } from '../lib/filter.js';
import { fi, fs, pct, bc, n } from '../lib/format.js';
import { fmtDK } from '../lib/date.js';
import { groupBy } from '../lib/aggregate.js';
import { getCustCounts } from '../lib/customer.js';
import SortableTable from '../components/SortableTable.jsx';

export default function LossOfSale() {
  const { merged, filters, lsSyncOn } = useDashboard();
  const { lsRows, idx: lsIdx } = merged;

  const data = useMemo(() => {
    const rows = filterLSTab(lsRows, lsIdx, filters, lsSyncOn);
    const { reasonIdx, catIdx, qtyIdx, valIdx, storeIdx, custIdx } = lsIdx;
    const total = rows.length;
    const totalQty = qtyIdx >= 0 ? rows.reduce((s, r) => s + n(r[qtyIdx]), 0) : 0;
    const totalVal = valIdx >= 0 ? rows.reduce((s, r) => s + n(r[valIdx]), 0) : 0;

    const reasonGrp = groupBy(rows, r => reasonIdx >= 0 ? r[reasonIdx] : 'Unknown', { qtyIdx, valIdx });
    const catGrp    = groupBy(rows, r => catIdx    >= 0 ? r[catIdx]    : 'Unknown', { qtyIdx, valIdx });
    const storeGrp  = groupBy(rows, r => storeIdx  >= 0 ? r[storeIdx]  : 'Unknown', { qtyIdx, valIdx });
    const rmGrp     = groupBy(rows, r => r._rm || 'Unknown', { qtyIdx, valIdx });

    const validMob = rows.filter(r => r._mob === 'valid').length;
    const invLen   = rows.filter(r => r._mob === 'invalid_length').length;
    const invJunk  = rows.filter(r => r._mob === 'invalid_junk' || r._mob === 'invalid_repeated').length;
    const missMob  = rows.filter(r => r._mob === 'missing').length;

    const custCounts = {};
    rows.forEach(r => {
      const c = custIdx >= 0 ? String(r[custIdx] || '') : '';
      if (c) custCounts[c] = (custCounts[c] || 0) + 1;
    });
    const custArr = Object.entries(custCounts).sort((a, b) => b[1] - a[1]);

    const hourMap = {};
    rows.forEach(r => {
      if (r._time) hourMap[r._time] = (hourMap[r._time] || 0) + 1;
    });
    const hourArr = Object.entries(hourMap).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    const topHour = hourArr.length ? hourArr.reduce((a, b) => a[1] > b[1] ? a : b) : null;

    const dayCounts = {};
    rows.forEach(r => {
      const dk = lsSyncOn ? r._syncedDk : r._dk;
      if (dk) dayCounts[dk] = (dayCounts[dk] || 0) + 1;
    });
    const dayArr = Object.entries(dayCounts).sort();

    return {
      rows, total, totalQty, totalVal,
      reasonGrp, catGrp, storeGrp, rmGrp,
      validMob, invLen, invJunk, missMob,
      custArr, hourArr, topHour, dayArr,
    };
  }, [lsRows, lsIdx, filters, lsSyncOn]);

  const { qtyIdx, valIdx } = merged.idx;
  const { total, totalQty, totalVal, reasonGrp, catGrp, storeGrp, rmGrp,
          validMob, invLen, invJunk, missMob, custArr, hourArr, topHour, dayArr, rows } = data;

  const topR = reasonGrp[0], topC = catGrp[0], topS = storeGrp[0], topRM = rmGrp[0], lowS = storeGrp[storeGrp.length - 1];
  const top3Pct = pct(reasonGrp.slice(0, 3).reduce((s, x) => s + x[1].c, 0), total);

  const prAlert = (sh) => sh >= 30 ? <span className="badge badge-red">High</span> : sh >= 15 ? <span className="badge badge-amber">Medium</span> : <span className="badge badge-green">Low</span>;
  const stAlert = (sh) => sh >= 10 ? <span className="badge badge-red">High</span> : sh >= 5 ? <span className="badge badge-amber">Watch</span> : <span className="badge badge-green">OK</span>;

  const baseHdr = (firstCol) => [firstCol, 'Count', ...(qtyIdx >= 0 ? ['Qty'] : []), ...(valIdx >= 0 ? ['Value'] : []), 'Share%', 'Alert'];
  const baseFooter = () => ['Total', fi(total), ...(qtyIdx >= 0 ? [fi(totalQty)] : []), ...(valIdx >= 0 ? [`₹${fs(totalVal)}`] : []), '100%', ''];
  const baseRow = (k, v, alertFn) => {
    const sh = pct(v.c, total);
    return { cells: [k, fi(v.c), ...(qtyIdx >= 0 ? [fi(v.q)] : []), ...(valIdx >= 0 ? [`₹${fs(v.v)}`] : []), `${sh}%`, alertFn(sh)] };
  };

  return (
    <>
      <ViewBanner color="red" title="📊 Loss of Sale — Patterns & Insights">
        Analyze <strong>why</strong> losses are happening — by reason, time, customer type.
      </ViewBanner>

      <div className="metrics">
        <Metric label="Total records" value={fi(total)} sub={lsSyncOn ? 'synced to walkins' : 'all sheet data'} />
        {qtyIdx >= 0 && <Metric color="red" label="Total qty lost" value={fi(totalQty)} sub="units" />}
        {valIdx >= 0 && <Metric color="amber" label="Total loss value" value={`₹${fs(totalVal)}`} />}
        <Metric label="Stores reporting" value={storeGrp.length} />
      </div>

      <div className="section-title">Insights & actionables</div>
      <div className="insights">
        <Insight tone="red" label="🔴 Top loss reason"   val={`${topR ? pct(topR[1].c, total) : 0}%`} title={topR ? topR[0] : '—'} body="Train staff immediately." />
        <Insight tone="red" label="🔴 Highest loss store" val={fi(topS ? topS[1].c : 0)} title={topS ? topS[0] : '—'} body="RM must visit urgently." />
        <Insight tone="red" label="🔴 Top loss category"  val={`${topC ? pct(topC[1].c, total) : 0}%`} title={topC ? topC[0] : '—'} body="Check stock & pricing gaps." />
        <Insight tone="amber" label="🟡 Reason concentration" val={`${top3Pct}%`} title="Top 3 reasons" body={top3Pct >= 70 ? 'Fix top 3 for max impact.' : 'Spread — systematic review needed.'} />
        <Insight tone="amber" label="🟡 RM with most loss" val={fi(topRM ? topRM[1].c : 0)} title={topRM ? topRM[0] : '—'} body="Review cluster & coach RM." />
        <Insight tone="green" label="🟢 Lowest loss store" val={fi(lowS ? lowS[1].c : 0)} title={lowS ? lowS[0] : '—'} body="Replicate best practices." />
      </div>

      <div className="card">
        <div className="card-title">📱 Phone number quality</div>
        <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <Metric color="green" label="Valid (10 digit)" value={fi(validMob)} sub={`${pct(validMob, total)}%`} />
          <Metric color="red"   label="Wrong length"     value={fi(invLen)}   sub="not 10 digits" />
          <Metric color="red"   label="Junk numbers"     value={fi(invJunk)}  sub="9999999999, repeated…" />
          <Metric color="amber" label="Missing"          value={fi(missMob)}  sub="blank" />
        </div>
      </div>

      {custArr.length > 0 && (
        <div className="card">
          <div className="card-title">👤 Customer type breakdown</div>
          <div className="cust-cards">
            {custArr.map(([k, v]) => {
              const tone = k.toLowerCase().includes('new') ? 'green' : k.toLowerCase().startsWith('rep') ? 'blue' : 'amber';
              return (
                <div key={k} className={`cust-card cust-${tone}`}>
                  <div className="cust-label">{k}</div>
                  <div className="cust-val">{fi(v)}</div>
                  <div className="cust-sub">{pct(v, total)}% of total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">⏰ Loss by timing{topHour ? ` — Peak: ${topHour[0]} (${fi(topHour[1])})` : ''}</div>
        {hourArr.length ? (
          <SortableTable
            columns={['Time slot', 'Count', 'Share%', 'Level']}
            rows={hourArr.map(([h, c]) => {
              const totalT = rows.filter(r => r._time).length;
              const level = topHour && h === topHour[0]
                ? <span className="badge badge-red">Peak</span>
                : c >= (topHour ? topHour[1] * 0.7 : 0)
                  ? <span className="badge badge-amber">High</span>
                  : <span className="badge badge-green">Normal</span>;
              return { cells: [h, fi(c), `${pct(c, totalT)}%`, level] };
            })}
          />
        ) : <p className="muted-note">No timing data.</p>}
      </div>

      <div className="card">
        <div className="card-title">Day-wise loss entries</div>
        <SortableTable
          columns={['Date', 'Count', 'Share%']}
          rows={dayArr.map(([dk, c]) => ({ cells: [<strong>{fmtDK(dk)}</strong>, fi(c), `${pct(c, total)}%`] }))}
          footer={['Total', fi(total), '100%']}
        />
      </div>

      <div className="card">
        <div className="card-title">Loss by reason</div>
        <SortableTable
          columns={baseHdr('Reason')}
          rows={reasonGrp.map(([k, v]) => baseRow(k, v, prAlert))}
          footer={baseFooter()}
        />
      </div>

      <div className="card">
        <div className="card-title">Loss by category</div>
        <SortableTable
          columns={baseHdr('Category')}
          rows={catGrp.map(([k, v]) => baseRow(k, v, prAlert))}
          footer={baseFooter()}
        />
      </div>

      <div className="card">
        <div className="card-title">Loss by store</div>
        <SortableTable
          columns={[...baseHdr('Store'), '🆕 New', '🔁 Repeat']}
          rows={storeGrp.map(([k, v]) => {
            const sh = pct(v.c, total);
            const cc = getCustCounts(v.items || [], lsIdx.custIdx);
            return { cells: [
              k, fi(v.c),
              ...(qtyIdx >= 0 ? [fi(v.q)] : []),
              ...(valIdx >= 0 ? [`₹${fs(v.v)}`] : []),
              `${sh}%`, stAlert(sh),
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fi(cc.new)}</span>,
              <span style={{ color: 'var(--blue)',  fontWeight: 600 }}>{fi(cc.repeat)}</span>,
            ] };
          })}
          footer={[...baseFooter(), '', '']}
        />
      </div>

      <div className="card">
        <div className="card-title">Loss by regional manager</div>
        <SortableTable
          columns={['RM', 'Count', ...(qtyIdx >= 0 ? ['Qty'] : []), ...(valIdx >= 0 ? ['Value'] : []), 'Share%', 'Alert', '🆕 New', '🔁 Repeat']}
          rows={rmGrp.map(([k, v]) => {
            const sh = pct(v.c, total);
            const cc = getCustCounts(v.items || [], lsIdx.custIdx);
            return { cells: [
              <strong>{k}</strong>, fi(v.c),
              ...(qtyIdx >= 0 ? [fi(v.q)] : []),
              ...(valIdx >= 0 ? [`₹${fs(v.v)}`] : []),
              `${sh}%`,
              sh >= 30 ? <span className="badge badge-red">High</span> : sh >= 15 ? <span className="badge badge-amber">Watch</span> : <span className="badge badge-green">OK</span>,
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fi(cc.new)}</span>,
              <span style={{ color: 'var(--blue)',  fontWeight: 600 }}>{fi(cc.repeat)}</span>,
            ] };
          })}
        />
      </div>
    </>
  );
}

function ViewBanner({ color, title, children }) {
  return (
    <div className={`view-banner banner-${color}`}>
      <div className="banner-title">{title}</div>
      <div className="banner-body">{children}</div>
    </div>
  );
}

function Metric({ color, label, value, sub }) {
  return (
    <div className={`metric${color ? ' ' + color : ''}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function Insight({ tone, label, val, title, body }) {
  return (
    <div className={`insight ${tone}`}>
      <div className="i-label">{label}</div>
      <div className="i-val">{val}</div>
      <div className="i-title">{title}</div>
      <div className="i-body">{body}</div>
    </div>
  );
}
