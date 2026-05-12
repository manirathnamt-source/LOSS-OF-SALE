import { useMemo } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLS } from '../lib/filter.js';
import { fi, pct } from '../lib/format.js';
import SortableTable from '../components/SortableTable.jsx';

function grp(rows, getKey, lsIdx) {
  const { storeIdx, reasonIdx, sizeIdx, styleIdx, catIdx } = lsIdx;
  const m = {};
  rows.forEach(r => {
    const k = String(getKey(r) || 'Unknown');
    if (!m[k]) m[k] = { c: 0, stores: new Set(), reasons: {}, sizes: {}, styles: {}, cats: {} };
    m[k].c++;
    if (storeIdx >= 0)  m[k].stores.add(String(r[storeIdx] || ''));
    if (reasonIdx >= 0) { const v = String(r[reasonIdx] || ''); if (v) m[k].reasons[v] = (m[k].reasons[v] || 0) + 1; }
    if (sizeIdx   >= 0) { const v = String(r[sizeIdx]   || ''); if (v) m[k].sizes[v]   = (m[k].sizes[v]   || 0) + 1; }
    if (styleIdx  >= 0) { const v = String(r[styleIdx]  || ''); if (v) m[k].styles[v]  = (m[k].styles[v]  || 0) + 1; }
    if (catIdx    >= 0) { const v = String(r[catIdx]    || ''); if (v) m[k].cats[v]    = (m[k].cats[v]    || 0) + 1; }
  });
  return Object.entries(m).sort((a, b) => b[1].c - a[1].c);
}
const topOf = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];

export default function CategoryAnalysis() {
  const { merged, filters } = useDashboard();
  const { lsRows, idx: lsIdx } = merged;

  const data = useMemo(() => {
    const rows = filterLS(lsRows, lsIdx, filters);
    const total = rows.length;
    if (!total) return { empty: true };
    const { catIdx, reasonIdx, subReasonIdx, storeIdx } = lsIdx;
    const catGrp     = grp(rows, r => catIdx    >= 0 ? r[catIdx]    : 'Unknown', lsIdx);
    const reasonGrp  = grp(rows, r => reasonIdx >= 0 ? r[reasonIdx] : 'Unknown', lsIdx);
    const sizeGrp    = grp(rows, r => lsIdx.sizeIdx  >= 0 ? r[lsIdx.sizeIdx]  : 'Unknown', lsIdx).filter(([k]) => k && k !== 'Unknown' && k !== '-');
    const styleGrp   = grp(rows, r => lsIdx.styleIdx >= 0 ? r[lsIdx.styleIdx] : 'Unknown', lsIdx).filter(([k]) => k && k !== 'Unknown' && k !== '-');
    const subCatGrp  = grp(rows, r => lsIdx.subCatIdx>= 0 ? r[lsIdx.subCatIdx]: 'Unknown', lsIdx).filter(([k]) => k && k !== 'Unknown' && k !== '-');

    const subReason = subReasonIdx >= 0 && subReasonIdx !== reasonIdx
      ? grp(rows, r => r[subReasonIdx], lsIdx).filter(([k]) => k)
      : null;

    const mktCatMap = {};
    rows.forEach(r => {
      const mkt = r._wkStore ? r._wkStore.market : 'Unknown';
      if (!mktCatMap[mkt]) mktCatMap[mkt] = { total: 0, cats: {}, reasons: {}, sizes: {} };
      mktCatMap[mkt].total++;
      const c = catIdx    >= 0 ? String(r[catIdx]    || 'Unknown') : 'Unknown';
      const rs= reasonIdx >= 0 ? String(r[reasonIdx] || 'Unknown') : 'Unknown';
      const sz= lsIdx.sizeIdx >= 0 ? String(r[lsIdx.sizeIdx] || '') : '';
      mktCatMap[mkt].cats[c]   = (mktCatMap[mkt].cats[c]   || 0) + 1;
      mktCatMap[mkt].reasons[rs] = (mktCatMap[mkt].reasons[rs] || 0) + 1;
      if (sz) mktCatMap[mkt].sizes[sz] = (mktCatMap[mkt].sizes[sz] || 0) + 1;
    });
    const mktArr = Object.entries(mktCatMap).sort((a, b) => b[1].total - a[1].total);

    return { total, catGrp, reasonGrp, sizeGrp, styleGrp, subCatGrp, subReason, mktArr };
  }, [lsRows, lsIdx, filters]);

  if (data.empty) {
    return <div className="err-card">No loss of sale data for the selected filters.</div>;
  }

  const { total, catGrp, reasonGrp, sizeGrp, styleGrp, subCatGrp, subReason, mktArr } = data;
  const prAlert = (sh) => sh >= 30 ? <span className="badge badge-red">High</span> : sh >= 15 ? <span className="badge badge-amber">Medium</span> : <span className="badge badge-green">Low</span>;

  return (
    <>
      <div className="view-banner banner-amber">
        <div className="banner-title">🏷️ Category Analysis</div>
        <div className="banner-body">Drill from reason → category → market → product detail.</div>
      </div>

      <div className="metrics">
        <div className="metric"><div className="lbl">Total loss</div><div className="val">{fi(total)}</div></div>
        <div className="metric red"><div className="lbl">Categories</div><div className="val">{catGrp.length}</div></div>
        <div className="metric amber"><div className="lbl">Reasons</div><div className="val">{reasonGrp.length}</div></div>
        <div className="metric"><div className="lbl">Markets</div><div className="val">{mktArr.length}</div></div>
      </div>

      <div className="card">
        <div className="card-title">By reason of loss — top category, top size, share, alert</div>
        <SortableTable
          columns={['Reason', 'Count', 'Stores', 'Top category', 'Top size', 'Share%', 'Alert']}
          rows={reasonGrp.map(([k, v]) => {
            const sh = pct(v.c, total);
            const tc = topOf(v.cats); const ts = topOf(v.sizes);
            return { cells: [k, fi(v.c), fi(v.stores.size), tc ? tc[0] : '—', ts ? `${ts[0]} (${ts[1]})` : '—', `${sh}%`, prAlert(sh)] };
          })}
          footer={['Total', fi(total), '', '', '', '100%', '']}
        />
      </div>

      {subReason && subReason.length > 0 && (
        <div className="card">
          <div className="card-title">By specific reason (col J)</div>
          <SortableTable
            columns={['Specific reason', 'Count', 'Stores', 'Top broad reason', 'Top category', 'Share%', 'Alert']}
            rows={subReason.map(([k, v]) => {
              const sh = pct(v.c, total);
              const tBR = topOf(v.reasons); const tc = topOf(v.cats);
              return { cells: [k, fi(v.c), fi(v.stores.size), tBR ? `${tBR[0]} (${tBR[1]})` : '—', tc ? `${tc[0]} (${tc[1]})` : '—', `${sh}%`, prAlert(sh)] };
            })}
            footer={['Total', fi(total), '', '', '', '100%', '']}
          />
        </div>
      )}

      <div className="card">
        <div className="card-title">By category</div>
        <SortableTable
          columns={['Category', 'Count', 'Stores', 'Top reason', 'Top size', 'Top style', 'Share%', 'Alert']}
          rows={catGrp.map(([k, v]) => {
            const sh = pct(v.c, total);
            const tR = topOf(v.reasons); const tSz = topOf(v.sizes); const tSt = topOf(v.styles);
            return { cells: [
              k, fi(v.c), fi(v.stores.size),
              tR ? tR[0] : '—',
              tSz ? `${tSz[0]} (${tSz[1]})` : '—',
              tSt ? `${tSt[0]} (${tSt[1]})` : '—',
              `${sh}%`, prAlert(sh),
            ] };
          })}
          footer={['Total', fi(total), '', '', '', '', '100%', '']}
        />
      </div>

      <div className="card">
        <div className="card-title">Market-wise category impact</div>
        <SortableTable
          columns={['Market', 'Total loss', 'Top category', 'Cat%', 'Top reason', 'Reason%', 'Top size']}
          rows={mktArr.map(([mkt, v]) => {
            const tCat = topOf(v.cats); const tReason = topOf(v.reasons); const tSize = topOf(v.sizes);
            const catPct = tCat ? pct(tCat[1], v.total) : 0;
            const reasonPct = tReason ? pct(tReason[1], v.total) : 0;
            return { cells: [
              mkt, fi(v.total),
              tCat ? tCat[0] : '—',
              tCat ? <span className={`badge ${catPct >= 30 ? 'badge-red' : catPct >= 15 ? 'badge-amber' : 'badge-green'}`}>{catPct}%</span> : '—',
              tReason ? tReason[0] : '—',
              tReason ? <span className={`badge ${reasonPct >= 30 ? 'badge-red' : reasonPct >= 15 ? 'badge-amber' : 'badge-green'}`}>{reasonPct}%</span> : '—',
              tSize ? `${tSize[0]} (${tSize[1]})` : '—',
            ] };
          })}
          footer={['Total', fi(total), '', '', '', '', '']}
        />
      </div>

      {sizeGrp.length > 0 && (
        <div className="card">
          <div className="card-title">Size-wise loss</div>
          <SortableTable
            columns={['Size', 'Count', 'Top category', 'Top reason', 'Share%', 'Alert']}
            rows={sizeGrp.map(([k, v]) => {
              const sh = pct(v.c, total);
              const tc = topOf(v.cats); const tr = topOf(v.reasons);
              return { cells: [k, fi(v.c), tc ? tc[0] : '—', tr ? tr[0] : '—', `${sh}%`, prAlert(sh)] };
            })}
            footer={['Total', fi(total), '', '', '100%', '']}
          />
        </div>
      )}

      {styleGrp.length > 0 && (
        <div className="card">
          <div className="card-title">Style-wise loss</div>
          <SortableTable
            columns={['Style', 'Count', 'Top category', 'Top reason', 'Share%', 'Alert']}
            rows={styleGrp.map(([k, v]) => {
              const sh = pct(v.c, total);
              const tc = topOf(v.cats); const tr = topOf(v.reasons);
              return { cells: [k, fi(v.c), tc ? tc[0] : '—', tr ? tr[0] : '—', `${sh}%`, prAlert(sh)] };
            })}
            footer={['Total', fi(total), '', '', '100%', '']}
          />
        </div>
      )}

      {subCatGrp.length > 0 && (
        <div className="card">
          <div className="card-title">Product sub-category loss</div>
          <SortableTable
            columns={['Sub Category', 'Count', 'Top reason', 'Top size', 'Share%', 'Alert']}
            rows={subCatGrp.map(([k, v]) => {
              const sh = pct(v.c, total);
              const tr = topOf(v.reasons); const tSz = topOf(v.sizes);
              return { cells: [k, fi(v.c), tr ? tr[0] : '—', tSz ? `${tSz[0]} (${tSz[1]})` : '—', `${sh}%`, prAlert(sh)] };
            })}
            footer={['Total', fi(total), '', '', '100%', '']}
          />
        </div>
      )}
    </>
  );
}
