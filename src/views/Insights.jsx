import { useMemo, useState } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLS, daysInRange } from '../lib/filter.js';
import { fi, pct, bc, n } from '../lib/format.js';
import { groupBy } from '../lib/aggregate.js';
import { getCustCounts, isNewVal, isRepVal } from '../lib/customer.js';
import { normStore } from '../lib/store.js';
import SortableTable from '../components/SortableTable.jsx';

const MODES = [
  { key: 'market', label: 'Market', emoji: '📍' },
  { key: 'rm',     label: 'RM',     emoji: '👤' },
  { key: 'store',  label: 'Store',  emoji: '🏪' },
];

export default function Insights() {
  const { merged, filters } = useDashboard();
  const { wk, lsRows, idx: lsIdx } = merged;
  const [mode, setMode] = useState('market');
  const [entity, setEntity] = useState('');

  const options = useMemo(() => {
    const rows = filterLS(lsRows, lsIdx, filters);
    const { storeIdx } = lsIdx;
    if (mode === 'market') return [...new Set(rows.map(r => r._wkStore ? r._wkStore.market : null).filter(v => v && v !== 'Unknown'))].sort();
    if (mode === 'rm')     return [...new Set(rows.map(r => r._rm).filter(v => v && v !== 'Unknown'))].sort();
    return storeIdx >= 0 ? [...new Set(rows.map(r => String(r[storeIdx] || '').trim()).filter(Boolean))].sort() : [];
  }, [mode, lsRows, lsIdx, filters]);

  const effective = entity && options.includes(entity) ? entity : options[0] || '';

  const report = useMemo(() => {
    if (!effective) return null;
    return buildReport(mode, effective, { wk, lsRows, lsIdx, filters });
  }, [mode, effective, wk, lsRows, lsIdx, filters]);

  return (
    <>
      <div className="view-banner banner-amber">
        <div className="banner-title">💎 Insights — Pre-computed Action Report</div>
        <div className="banner-body">Pick a Market / RM / Store → see a complete diagnostic with red flags + recommendations.</div>
      </div>

      <div className="ins-modes">
        {MODES.map(m => (
          <button
            key={m.key}
            className={`ins-mode${mode === m.key ? ' active' : ''}`}
            onClick={() => { setMode(m.key); setEntity(''); }}
          >{m.emoji} {m.label}</button>
        ))}
      </div>

      <div className="ins-picker">
        <label>Select {MODES.find(m => m.key === mode).label}:</label>
        <select value={effective} onChange={(e) => setEntity(e.target.value)}>
          {options.length ? options.map(o => <option key={o} value={o}>{o}</option>) : <option value="" disabled>No data</option>}
        </select>
        <span className="ins-count">{options.length} {mode}{options.length !== 1 ? 's' : ''} available</span>
      </div>

      {report || <div className="empty-state" style={{ minHeight: 200 }}><div className="empty-hint">Select an entity to see the report.</div></div>}
    </>
  );
}

function buildReport(mode, entity, { wk, lsRows, lsIdx, filters }) {
  const { storeIdx, reasonIdx, catIdx, empIdx, custIdx } = lsIdx;
  const all = filterLS(lsRows, lsIdx, filters);
  const scoped = all.filter(r => {
    if (mode === 'market') return r._wkStore && r._wkStore.market === entity;
    if (mode === 'rm')     return r._rm === entity;
    return storeIdx >= 0 && String(r[storeIdx] || '').trim() === entity;
  });
  if (!scoped.length) return <div className="err-card">No loss data for {mode}: {entity}</div>;

  const wkStoresInScope = wk.stores.filter(s => {
    if (mode === 'market') return s.market === entity;
    if (mode === 'rm')     return s.rm === entity;
    return s.outlet === entity || s.outletNorm === normStore(entity);
  });

  let totalW = 0, totalB = 0;
  const storesReporting = new Set();
  wkStoresInScope.forEach(s => {
    const dRange = daysInRange(s.days, filters);
    dRange.forEach(d => {
      if (d.w > 0) { totalW += d.w; storesReporting.add(s.outletNorm); }
      totalB += d.b;
    });
  });
  const totalLS = scoped.length;
  const totalNB = totalW - totalB;
  const convPct = pct(totalB, totalW);
  const covPct = pct(totalLS, totalNB);
  const zeroWalkinStores = wkStoresInScope.filter(s => !storesReporting.has(s.outletNorm));

  const cc = getCustCounts(scoped, custIdx);
  const totalCust = cc.new + cc.repeat + cc.other;
  const newPct = pct(cc.new, totalCust);
  const repPct = pct(cc.repeat, totalCust);

  const reasonGrp = groupBy(scoped, r => reasonIdx >= 0 ? r[reasonIdx] : 'Unknown');
  const catGrp    = groupBy(scoped, r => catIdx    >= 0 ? r[catIdx]    : 'Unknown');
  const empGrp    = groupBy(scoped, r => empIdx    >= 0 ? r[empIdx]    : 'Unknown').filter(([k]) => k && k !== 'Unknown');
  const validM = scoped.filter(r => r._mob === 'valid').length;
  const invM = scoped.filter(r => r._mob === 'invalid_length' || r._mob === 'invalid_junk' || r._mob === 'invalid_repeated').length;
  const missM = scoped.filter(r => r._mob === 'missing').length;

  // Red flags
  const flags = [];
  if (convPct < 15 && totalW > 100) flags.push({ tone: 'red', text: `Conversion is ${convPct}% — well below healthy 25-30% benchmark.` });
  if (totalNB > 100 && totalLS === 0) flags.push({ tone: 'red', text: `${fi(totalNB)} non-buyers but zero loss entries captured — RM/staff not logging.` });
  if (totalNB > 0 && covPct < 10) flags.push({ tone: 'red', text: `Loss coverage is only ${covPct}% of non-buyers — most losses going unrecorded.` });
  if (zeroWalkinStores.length > 0) flags.push({ tone: 'amber', text: `${zeroWalkinStores.length} store${zeroWalkinStores.length > 1 ? 's are' : ' is'} not reporting any walkin data.` });
  if (invM + missM > totalLS * 0.4) flags.push({ tone: 'amber', text: `${pct(invM + missM, totalLS)}% of phone numbers are invalid or missing — data quality issue.` });
  if (reasonGrp.length > 0 && reasonGrp[0][1].c / totalLS >= 0.6) flags.push({ tone: 'amber', text: `${pct(reasonGrp[0][1].c, totalLS)}% of losses are due to "${reasonGrp[0][0]}" alone — single root cause.` });
  if (newPct > 70 && totalCust > 20) flags.push({ tone: 'amber', text: `${newPct}% of lost customers are first-timers — your store isn't converting walk-ins.` });

  // Recommendations
  const recs = [];
  if (reasonGrp.length > 0) recs.push(`Address top reason "${reasonGrp[0][0]}" first — that alone is ${pct(reasonGrp[0][1].c, totalLS)}% of all losses.`);
  if (catGrp.length > 0) recs.push(`Check stock/pricing for "${catGrp[0][0]}" category — ${pct(catGrp[0][1].c, totalLS)}% of losses.`);
  if (zeroWalkinStores.length > 0) recs.push(`Reach out to ${zeroWalkinStores.length} non-reporting store${zeroWalkinStores.length > 1 ? 's' : ''}: ${zeroWalkinStores.slice(0, 3).map(s => s.outlet).join(', ')}${zeroWalkinStores.length > 3 ? '…' : ''}`);
  if (covPct < 50 && totalNB > 50) recs.push(`Coverage is ${covPct}% — train staff to log every non-buyer; aim for >70%.`);
  if (empGrp.length > 0 && empGrp[0][1].c > totalLS * 0.2) recs.push(`Employee "${empGrp[0][0]}" accounts for ${pct(empGrp[0][1].c, totalLS)}% of logged losses — review.`);

  return (
    <>
      <div className="metrics">
        <div className="metric blue"><div className="lbl">Walkins</div><div className="val">{fi(totalW)}</div></div>
        <div className="metric green"><div className="lbl">Bills</div><div className="val">{fi(totalB)}</div><div className="sub"><span className={`badge ${bc(convPct)}`}>{convPct}% conv</span></div></div>
        <div className="metric red"><div className="lbl">Non-buyers</div><div className="val">{fi(totalNB)}</div></div>
        <div className="metric amber"><div className="lbl">Loss captured</div><div className="val">{fi(totalLS)}</div><div className="sub"><span className={`badge ${bc(covPct)}`}>{covPct}% cov</span></div></div>
      </div>

      {flags.length > 0 && (
        <div className="card">
          <div className="card-title">🚨 Red flags ({flags.length})</div>
          <div className="flag-list">
            {flags.map((flag, i) => (
              <div key={i} className={`flag flag-${flag.tone}`}>
                <span className="flag-mark">{flag.tone === 'red' ? '🔴' : '🟡'}</span>
                <span>{flag.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="card">
          <div className="card-title">✅ Recommended actions</div>
          <ol className="rec-list">
            {recs.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      )}

      <div className="card">
        <div className="card-title">Customer breakdown</div>
        <div className="cust-cards">
          <div className="cust-card cust-green"><div className="cust-label">New customers</div><div className="cust-val">{fi(cc.new)}</div><div className="cust-sub">{newPct}% of logged</div></div>
          <div className="cust-card cust-blue"><div className="cust-label">Repeat customers</div><div className="cust-val">{fi(cc.repeat)}</div><div className="cust-sub">{repPct}% of logged</div></div>
          {cc.other > 0 && <div className="cust-card cust-amber"><div className="cust-label">Other / unspecified</div><div className="cust-val">{fi(cc.other)}</div><div className="cust-sub">{pct(cc.other, totalCust)}%</div></div>}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Top reasons</div>
          <SortableTable
            dense
            columns={['Reason', 'Count', 'Share%']}
            rows={reasonGrp.slice(0, 10).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, totalLS)}%`] }))}
          />
        </div>
        <div className="card">
          <div className="card-title">Top categories</div>
          <SortableTable
            dense
            columns={['Category', 'Count', 'Share%']}
            rows={catGrp.slice(0, 10).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, totalLS)}%`] }))}
          />
        </div>
      </div>

      {empGrp.length > 0 && (
        <div className="card">
          <div className="card-title">Loss by employee (top 15)</div>
          <SortableTable
            dense
            columns={['Employee', 'Count', 'Share%']}
            rows={empGrp.slice(0, 15).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, totalLS)}%`] }))}
          />
        </div>
      )}
    </>
  );
}
