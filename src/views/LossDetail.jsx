import { useMemo, useCallback } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLS } from '../lib/filter.js';
import { fi, fs, pct, n } from '../lib/format.js';
import { fmtDK, toDayKey } from '../lib/date.js';
import { groupBy } from '../lib/aggregate.js';
import { buildRMModal, buildMarketModal, buildStoreModal } from '../lib/modalBuilders.jsx';
import SortableTable from '../components/SortableTable.jsx';

export default function LossDetail() {
  const dash = useDashboard();
  const { merged, filters, setModal } = dash;
  const { wk, lsRows, idx: lsIdx } = merged;
  const openRM     = useCallback((k) => setModal(buildRMModal(k,     { wk, lsRows, lsIdx, filters })), [wk, lsRows, lsIdx, filters, setModal]);
  const openMarket = useCallback((k) => setModal(buildMarketModal(k, { wk, lsRows, lsIdx, filters })), [wk, lsRows, lsIdx, filters, setModal]);
  const openStore  = useCallback((k) => setModal(buildStoreModal(k,  { wk, lsRows, lsIdx, filters })), [wk, lsRows, lsIdx, filters, setModal]);

  const data = useMemo(() => {
    const f = filters;
    const rows = filterLS(lsRows, lsIdx, f);
    const { storeIdx, qtyIdx, valIdx, dateIdx } = lsIdx;
    const total = rows.length;
    const totalQty = qtyIdx >= 0 ? rows.reduce((s, r) => s + n(r[qtyIdx]), 0) : 0;
    const totalVal = valIdx >= 0 ? rows.reduce((s, r) => s + n(r[valIdx]), 0) : 0;

    const allDKs = lsRows.map(r => toDayKey(r[dateIdx])).filter(Boolean);
    const latestInSheet = allDKs.length ? allDKs.reduce((a, b) => a > b ? a : b) : null;
    const earliestInSheet = allDKs.length ? allDKs.reduce((a, b) => a < b ? a : b) : null;
    const lastWkDay = wk.days.length ? wk.days[wk.days.length - 1] : null;
    const firstWkDay = wk.days.length ? wk.days[0] : null;
    const excluded = lsRows.filter(r => r._dk && !r._syncedDk).length;

    const rmGrp  = groupBy(rows, r => r._rm || 'Unknown', { qtyIdx, valIdx });
    const mktGrp = groupBy(rows, r => r._wkStore ? r._wkStore.market : 'Unknown', { qtyIdx, valIdx });
    const sGrp   = groupBy(rows, r => storeIdx >= 0 ? String(r[storeIdx] || 'Unknown') : 'Unknown', { qtyIdx, valIdx });

    return { rows, total, totalQty, totalVal, earliestInSheet, latestInSheet, firstWkDay, lastWkDay, excluded, rmGrp, mktGrp, sGrp };
  }, [wk, lsRows, lsIdx, filters]);

  const { qtyIdx, valIdx } = lsIdx;
  const { total, totalQty, totalVal, earliestInSheet, latestInSheet, firstWkDay, lastWkDay, excluded, rmGrp, mktGrp, sGrp } = data;

  const stAlert = (sh) => sh >= 10 ? <span className="badge badge-red">High</span> : sh >= 5 ? <span className="badge badge-amber">Watch</span> : <span className="badge badge-green">OK</span>;
  const hdr = (firstCol) => [firstCol, 'Count', ...(qtyIdx >= 0 ? ['Qty'] : []), ...(valIdx >= 0 ? ['Value'] : []), 'Share%', 'Alert'];
  const ftr = () => ['Total', fi(total), ...(qtyIdx >= 0 ? [fi(totalQty)] : []), ...(valIdx >= 0 ? [`₹${fs(totalVal)}`] : []), '100%', ''];
  const row = (k, v, onClick) => {
    const sh = pct(v.c, total);
    return { cells: [
      onClick ? <span className="clickable" onClick={() => onClick(k)}>{k}</span> : k,
      fi(v.c),
      ...(qtyIdx >= 0 ? [fi(v.q)] : []),
      ...(valIdx >= 0 ? [`₹${fs(v.v)}`] : []),
      `${sh}%`, stAlert(sh),
    ] };
  };

  return (
    <>
      <div className="view-banner banner-blue">
        <div className="banner-title">🔍 Loss Detail — Coverage & Sync Status</div>
        <div className="banner-body">Track <strong>data completeness</strong> across RM, market, store. See what's synced to walkins vs pending.</div>
      </div>

      <div className="sync-status">
        <div className="sync-block">
          <span className="sync-icon">📋</span>
          <div>
            <div className="sync-label">Loss of Sale data in sheet</div>
            <div className="sync-sub">
              {earliestInSheet ? fmtDK(earliestInSheet) : '—'} → <strong style={{ color: 'var(--blue)' }}>{latestInSheet ? fmtDK(latestInSheet) : '—'}</strong>
              {' · '}{fi(lsRows.length)} total entries
            </div>
          </div>
        </div>
        <div className="sync-sep" />
        <div className="sync-block">
          <span className="sync-icon">📅</span>
          <div>
            <div className="sync-label">Walkins updated till</div>
            <div className="sync-sub">
              {firstWkDay ? fmtDK(firstWkDay.dk) : '—'} → <strong style={{ color: 'var(--green)' }}>{lastWkDay ? fmtDK(lastWkDay.dk) : '—'}</strong>
              {' · '}{wk.days.length} days
            </div>
          </div>
        </div>
        <div className="sync-sep" />
        <div className="sync-block">
          <span className="sync-icon">✅</span>
          <div>
            <div className="sync-label" style={{ color: 'var(--green)' }}>Showing in dashboard</div>
            <div className="sync-sub">
              <strong style={{ color: 'var(--green)' }}>{fi(total)} entries</strong>
              {excluded > 0 && <span style={{ color: 'var(--amber)' }}>{' · ⏳ '}{fi(excluded)} pending walkins sync</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric"><div className="lbl">Total loss entries</div><div className="val">{fi(total)}</div><div className="sub">all entries shown</div></div>
        {qtyIdx >= 0 && <div className="metric red"><div className="lbl">Total qty lost</div><div className="val">{fi(totalQty)}</div><div className="sub">units</div></div>}
        {valIdx >= 0 && <div className="metric amber"><div className="lbl">Total loss value</div><div className="val">₹{fs(totalVal)}</div></div>}
        <div className="metric"><div className="lbl">Stores reporting</div><div className="val">{sGrp.length}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Loss by regional manager — click RM for store details</div>
        <SortableTable columns={hdr('RM')} rows={rmGrp.map(([k, v]) => row(k, v, openRM))} footer={ftr()} />
      </div>
      <div className="card">
        <div className="card-title">Loss by market — click market for store details</div>
        <SortableTable columns={hdr('Market')} rows={mktGrp.map(([k, v]) => row(k, v, openMarket))} footer={ftr()} />
      </div>
      <div className="card">
        <div className="card-title">Loss by store — click for detailed report</div>
        <SortableTable columns={hdr('Store')} rows={sGrp.map(([k, v]) => row(k, v, openStore))} footer={ftr()} />
      </div>
    </>
  );
}
