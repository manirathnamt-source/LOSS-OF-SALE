import { filterLS, filterStores, daysInRange } from './filter.js';
import { fi, fs, pct, bc, n } from './format.js';
import { fmtDK } from './date.js';
import { normStore, storeKeys } from './store.js';
import { groupBy } from './aggregate.js';
import SortableTable from '../components/SortableTable.jsx';

const topOf = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];

export function buildRMModal(rm, { wk, lsRows, lsIdx, filters }) {
  const { storeIdx } = lsIdx;
  const allRMStores = wk.stores.filter(s =>
    s.rm === rm
    && (!filters.cluster || s.cluster === filters.cluster)
    && (!filters.market || s.market === filters.market)
  );
  const filtLS = filterLS(lsRows, lsIdx, { ...filters, rm });

  const storeRows = allRMStores.map(s => {
    const dRange = daysInRange(s.days, filters);
    const w = dRange.reduce((a, d) => a + d.w, 0);
    const b = dRange.reduce((a, d) => a + d.b, 0);
    const nb = w - b;
    const cv = pct(b, w);
    const daysWith = dRange.filter(d => d.w > 0).length;
    const ls = filtLS.filter(r => normStore(String(r[storeIdx] || '')) === s.outletNorm).length;
    return { ...s, w, b, nb, cv, ls, lsPct: pct(ls, nb), daysWith, totalDays: dRange.length, zeroFlag: (w === 0 || daysWith === 0) };
  }).sort((a, b) => {
    if (a.zeroFlag && !b.zeroFlag) return -1;
    if (!a.zeroFlag && b.zeroFlag) return 1;
    return b.w - a.w;
  });

  const tW = storeRows.reduce((s, r) => s + r.w, 0);
  const tB = storeRows.reduce((s, r) => s + r.b, 0);
  const tNB = tW - tB;
  const tLS = storeRows.reduce((s, r) => s + r.ls, 0);
  const zeroCount = storeRows.filter(s => s.zeroFlag).length;
  const activeCount = storeRows.length - zeroCount;

  return {
    title: `RM: ${rm} — store breakdown`,
    sub: `${storeRows.length} stores · ${activeCount} active · ${zeroCount} with no walkin data`,
    body: (
      <>
        <div className="metrics">
          <div className="metric"><div className="lbl">Total stores</div><div className="val">{storeRows.length}</div><div className="sub">{activeCount} active</div></div>
          <div className="metric red"><div className="lbl">🔴 Zero walkins</div><div className="val">{zeroCount}</div><div className="sub">not reporting</div></div>
          <div className="metric blue"><div className="lbl">Walkins</div><div className="val">{fi(tW)}</div><div className="sub">{pct(tB, tW)}% conv</div></div>
          <div className="metric amber"><div className="lbl">Loss captured</div><div className="val">{fi(tLS)}</div><div className="sub">{pct(tLS, tNB)}% coverage</div></div>
        </div>
        {zeroCount > 0 && (
          <div className="modal-callout">
            🔴 <strong>{zeroCount} store{zeroCount > 1 ? 's have' : ' has'} zero walkin entries</strong> — highlighted at top of the table.
          </div>
        )}
        <SortableTable
          columns={['Store', 'Market', 'Cluster', 'Type', 'Days', 'Walkins', 'Bills', 'Non-buyers', 'Conv%', 'Loss', 'Cov%', 'Status']}
          rowClass={(r) => r._cls}
          rows={storeRows.map(s => ({
            _cls: s.zeroFlag ? 'audit-red' : undefined,
            cells: [
              s.outlet,
              s.market || '—',
              s.cluster || '—',
              s.type || '—',
              s.daysWith === 0 ? <span className="badge badge-red">0 days</span> : `${s.daysWith}/${s.totalDays}`,
              s.w === 0 ? <span className="badge badge-red">0</span> : fi(s.w),
              fi(s.b),
              fi(s.nb),
              s.w > 0 ? <span className={`badge ${bc(s.cv)}`}>{s.cv}%</span> : '—',
              fi(s.ls),
              s.nb > 0 ? <span className={`badge ${bc(s.lsPct)}`}>{s.lsPct}%</span> : '—',
              s.zeroFlag ? <span className="badge badge-red">🔴 No data</span> : <span className="badge badge-green">✓ Active</span>,
            ],
          }))}
          footer={['Total', '', '', '', '', fi(tW), fi(tB), fi(tNB), <span className={`badge ${bc(pct(tB, tW))}`}>{pct(tB, tW)}%</span>, fi(tLS), <span className={`badge ${bc(pct(tLS, tNB))}`}>{pct(tLS, tNB)}%</span>, '']}
        />
      </>
    ),
  };
}

export function buildMarketModal(market, { wk, lsRows, lsIdx, filters }) {
  const { storeIdx } = lsIdx;
  const filtStores = filterStores(wk.stores, { ...filters, market });
  const filtLS = filterLS(lsRows, lsIdx, { ...filters, market });

  const storeRows = filtStores.map(s => {
    const w = daysInRange(s.days, filters).reduce((a, d) => a + d.w, 0);
    const b = daysInRange(s.days, filters).reduce((a, d) => a + d.b, 0);
    const nb = w - b;
    const cv = pct(b, w);
    const ls = filtLS.filter(r => normStore(String(r[storeIdx] || '')) === s.outletNorm).length;
    return { ...s, w, b, nb, cv, ls, lsPct: pct(ls, nb) };
  }).sort((a, b) => b.w - a.w);

  const tW = storeRows.reduce((s, r) => s + r.w, 0);
  const tB = storeRows.reduce((s, r) => s + r.b, 0);
  const tNB = storeRows.reduce((s, r) => s + r.nb, 0);
  const tLS = storeRows.reduce((s, r) => s + r.ls, 0);

  return {
    title: `${market} — stores`,
    sub: `${storeRows.length} stores`,
    body: (
      <>
        <div className="metrics">
          <div className="metric blue"><div className="lbl">Walkins</div><div className="val">{fi(tW)}</div></div>
          <div className="metric green"><div className="lbl">Bills</div><div className="val">{fi(tB)}</div><div className="sub">{pct(tB, tW)}% conv</div></div>
          <div className="metric red"><div className="lbl">Non-buyers</div><div className="val">{fi(tNB)}</div></div>
          <div className="metric amber"><div className="lbl">Loss captured</div><div className="val">{fi(tLS)}</div><div className="sub">{pct(tLS, tNB)}% coverage</div></div>
        </div>
        <SortableTable
          columns={['Store', 'RM', 'Type', 'Walkins', 'Bills', 'Non-buyers', 'Conv%', 'Loss', 'Cov%']}
          rows={storeRows.map(s => ({
            cells: [
              s.outlet, s.rm, s.type,
              fi(s.w), fi(s.b), fi(s.nb),
              <span className={`badge ${bc(s.cv)}`}>{s.cv}%</span>,
              fi(s.ls),
              <span className={`badge ${bc(s.lsPct)}`}>{s.lsPct}%</span>,
            ],
          }))}
          footer={['Total', '', '', fi(tW), fi(tB), fi(tNB), <span className={`badge ${bc(pct(tB, tW))}`}>{pct(tB, tW)}%</span>, fi(tLS), <span className={`badge ${bc(pct(tLS, tNB))}`}>{pct(tLS, tNB)}%</span>]}
        />
      </>
    ),
  };
}

export function buildStoreModal(storeName, { wk, lsRows, lsIdx, filters }) {
  const { storeIdx, reasonIdx, catIdx, empIdx, custIdx } = lsIdx;
  const filtLS = filterLS(lsRows, lsIdx, filters);
  const rows = filtLS.filter(r => {
    const v = String(r[storeIdx] || '');
    return v === storeName || normStore(v) === normStore(storeName);
  });
  const total = rows.length;
  const storeByKey = wk.storeByKey || {};
  let wkStore = null;
  for (const kk of storeKeys(storeName)) {
    if (storeByKey[kk]) { wkStore = storeByKey[kk]; break; }
  }
  const days = wkStore ? daysInRange(wkStore.days, filters) : [];
  const stW = days.reduce((s, d) => s + d.w, 0);
  const stB = days.reduce((s, d) => s + d.b, 0);
  const stNB = stW - stB;

  const grpS = (getKey) => groupBy(rows, getKey);
  const byReason = grpS(r => reasonIdx >= 0 ? r[reasonIdx] : 'Unknown');
  const byCat    = grpS(r => catIdx    >= 0 ? r[catIdx]    : 'Unknown');
  const byEmp    = grpS(r => empIdx    >= 0 ? r[empIdx]    : 'Unknown').filter(([k]) => k && k !== 'Unknown');
  const byTime   = grpS(r => r._time).filter(([k]) => k && k !== 'Unknown');
  const byCust   = grpS(r => custIdx   >= 0 ? r[custIdx]   : 'Unknown').filter(([k]) => k && k !== 'Unknown');

  const validM = rows.filter(r => r._mob === 'valid').length;
  const invL   = rows.filter(r => r._mob === 'invalid_length').length;
  const invJ   = rows.filter(r => r._mob === 'invalid_junk' || r._mob === 'invalid_repeated').length;
  const missM  = rows.filter(r => r._mob === 'missing').length;

  const Mini = ({ label, arr }) => (
    arr.length
      ? <SortableTable
          dense
          columns={[label, 'Count', '%']}
          rows={arr.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))}
          footer={['Total', fi(total), '100%']}
        />
      : <p className="muted-note">No data</p>
  );

  return {
    title: storeName,
    sub: wkStore ? `${wkStore.market} · ${wkStore.rm} · ${wkStore.type}` : '',
    body: (
      <>
        <div className="metrics">
          <div className="metric blue"><div className="lbl">Walkins</div><div className="val">{fi(stW)}</div></div>
          <div className="metric green"><div className="lbl">Bills</div><div className="val">{fi(stB)}</div><div className="sub">{pct(stB, stW)}% conv</div></div>
          <div className="metric red"><div className="lbl">Non-buyers</div><div className="val">{fi(stNB)}</div></div>
          <div className="metric amber"><div className="lbl">Loss captured</div><div className="val">{fi(total)}</div><div className="sub">{pct(total, stNB)}% coverage</div></div>
        </div>
        <div className="modal-callout">
          <div className="section-title" style={{ color: 'var(--red)', marginBottom: 6 }}>📱 Phone number quality</div>
          <div className="modal-phone-grid">
            <div><strong style={{ color: 'var(--green)' }}>{fi(validM)}</strong> valid ({pct(validM, total || 1)}%)</div>
            <div><strong style={{ color: 'var(--red)' }}>{fi(invL)}</strong> wrong length</div>
            <div><strong style={{ color: 'var(--red)' }}>{fi(invJ)}</strong> junk</div>
            <div><strong style={{ color: 'var(--amber)' }}>{fi(missM)}</strong> missing</div>
          </div>
        </div>
        {byCust.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 12 }}>👤 Customer type breakdown</div>
            <div className="cust-cards" style={{ marginBottom: 12 }}>
              {byCust.map(([k, v]) => {
                const tone = k.toLowerCase().includes('new') ? 'green' : k.toLowerCase().startsWith('rep') ? 'blue' : 'amber';
                return (
                  <div key={k} className={`cust-card cust-${tone}`}>
                    <div className="cust-label">{k}</div>
                    <div className="cust-val">{fi(v.c)}</div>
                    <div className="cust-sub">{pct(v.c, total)}%</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="two-col">
          <div>
            <div className="section-title">Loss by reason</div>
            <Mini label="Reason" arr={byReason} />
          </div>
          <div>
            <div className="section-title">Loss by category</div>
            <Mini label="Category" arr={byCat} />
          </div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-title">⏰ Loss by timing</div>
            <Mini label="Time slot" arr={byTime} />
          </div>
          <div>
            <div className="section-title">👤 Loss by employee</div>
            {byEmp.length > 0 ? <Mini label="Employee" arr={byEmp} /> : <p className="muted-note">No employee data.</p>}
          </div>
        </div>
      </>
    ),
  };
}

export function buildReasonModal(reason, { wk, lsRows, lsIdx, filters }) {
  const { reasonIdx, storeIdx, qtyIdx, valIdx, custIdx, empIdx } = lsIdx;
  const all = filterLS(lsRows, lsIdx, filters);
  const rows = all.filter(r => reasonIdx >= 0 && String(r[reasonIdx] || '') === reason);
  const total = rows.length;
  const totalQty = qtyIdx >= 0 ? rows.reduce((s, r) => s + n(r[qtyIdx]), 0) : 0;
  const totalVal = valIdx >= 0 ? rows.reduce((s, r) => s + n(r[valIdx]), 0) : 0;

  const sGrp = groupBy(rows, r => storeIdx >= 0 ? r[storeIdx] : 'Unknown', { qtyIdx, valIdx });
  const rmGrp = groupBy(rows, r => r._rm || 'Unknown', { qtyIdx, valIdx });
  const empGrp = groupBy(rows, r => empIdx >= 0 ? r[empIdx] : 'Unknown', { qtyIdx, valIdx }).filter(([k]) => k && k !== 'Unknown');
  const custGrp = groupBy(rows, r => custIdx >= 0 ? r[custIdx] : 'Unknown').filter(([k]) => k && k !== 'Unknown');

  return {
    title: `Reason: ${reason}`,
    sub: `${fi(total)} loss entries across ${sGrp.length} stores`,
    body: (
      <>
        <div className="metrics">
          <div className="metric red"><div className="lbl">Total entries</div><div className="val">{fi(total)}</div></div>
          {qtyIdx >= 0 && <div className="metric red"><div className="lbl">Total qty</div><div className="val">{fi(totalQty)}</div></div>}
          {valIdx >= 0 && <div className="metric amber"><div className="lbl">Total value</div><div className="val">₹{fs(totalVal)}</div></div>}
          <div className="metric"><div className="lbl">Stores</div><div className="val">{sGrp.length}</div></div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-title">Top stores</div>
            <SortableTable
              dense
              columns={['Store', 'Count', '%']}
              rows={sGrp.slice(0, 25).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))}
            />
          </div>
          <div>
            <div className="section-title">By RM</div>
            <SortableTable
              dense
              columns={['RM', 'Count', '%']}
              rows={rmGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))}
            />
          </div>
        </div>
        {custGrp.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 12 }}>👤 By customer type</div>
            <SortableTable dense columns={['Type', 'Count', '%']}
              rows={custGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
          </>
        )}
        {empGrp.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 12 }}>👤 By employee</div>
            <SortableTable dense columns={['Employee', 'Count', '%']}
              rows={empGrp.slice(0, 20).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
          </>
        )}
      </>
    ),
  };
}

export function buildCategoryModal(category, { wk, lsRows, lsIdx, filters }) {
  const { catIdx, reasonIdx, storeIdx, sizeIdx, styleIdx } = lsIdx;
  const all = filterLS(lsRows, lsIdx, filters);
  const rows = all.filter(r => catIdx >= 0 && String(r[catIdx] || '') === category);
  const total = rows.length;
  const reasonGrp = groupBy(rows, r => reasonIdx >= 0 ? r[reasonIdx] : 'Unknown');
  const sizeGrp   = groupBy(rows, r => sizeIdx   >= 0 ? r[sizeIdx]   : 'Unknown').filter(([k]) => k && k !== 'Unknown' && k !== '-');
  const styleGrp  = groupBy(rows, r => styleIdx  >= 0 ? r[styleIdx]  : 'Unknown').filter(([k]) => k && k !== 'Unknown' && k !== '-');
  const mktGrp    = groupBy(rows, r => r._wkStore ? r._wkStore.market : 'Unknown');
  const storeGrp  = groupBy(rows, r => storeIdx  >= 0 ? r[storeIdx]  : 'Unknown');

  return {
    title: `Category: ${category}`,
    sub: `${fi(total)} loss entries across ${mktGrp.length} markets`,
    body: (
      <>
        <div className="metrics">
          <div className="metric amber"><div className="lbl">Total loss</div><div className="val">{fi(total)}</div></div>
          <div className="metric"><div className="lbl">Markets</div><div className="val">{mktGrp.length}</div></div>
          <div className="metric"><div className="lbl">Stores</div><div className="val">{storeGrp.length}</div></div>
          <div className="metric"><div className="lbl">Reasons</div><div className="val">{reasonGrp.length}</div></div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-title">By reason</div>
            <SortableTable dense columns={['Reason', 'Count', '%']}
              rows={reasonGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
          </div>
          <div>
            <div className="section-title">By market</div>
            <SortableTable dense columns={['Market', 'Count', '%']}
              rows={mktGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
          </div>
        </div>
        {(sizeGrp.length > 0 || styleGrp.length > 0) && (
          <div className="two-col">
            {sizeGrp.length > 0 && (
              <div>
                <div className="section-title">By size</div>
                <SortableTable dense columns={['Size', 'Count', '%']}
                  rows={sizeGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
              </div>
            )}
            {styleGrp.length > 0 && (
              <div>
                <div className="section-title">By style</div>
                <SortableTable dense columns={['Style', 'Count', '%']}
                  rows={styleGrp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
              </div>
            )}
          </div>
        )}
        <div className="section-title" style={{ marginTop: 12 }}>By store (top 25)</div>
        <SortableTable dense columns={['Store', 'Count', '%']}
          rows={storeGrp.slice(0, 25).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, total)}%`] }))} />
      </>
    ),
  };
}
