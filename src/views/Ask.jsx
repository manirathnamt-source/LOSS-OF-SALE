import { useMemo, useState } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { filterLS } from '../lib/filter.js';
import { fi, pct } from '../lib/format.js';
import SortableTable from '../components/SortableTable.jsx';
import { groupBy } from '../lib/aggregate.js';

const SUGGESTIONS = [
  'top 5 RMs by loss',
  'top 10 stores by loss',
  'worst markets',
  'top reasons',
  'top categories',
  'staff with most loss',
  'best performing RM',
  'worst conversion stores',
];

function runQuery(q, ctx) {
  const { merged, filters } = ctx;
  const { wk, lsRows, idx: lsIdx } = merged;
  const rows = filterLS(lsRows, lsIdx, filters);
  const { storeIdx, reasonIdx, catIdx, empIdx } = lsIdx;
  const lower = q.toLowerCase().trim();
  const m = lower.match(/top\s+(\d+)?/);
  const n = m && m[1] ? parseInt(m[1]) : 10;

  if (/\b(rm|regional manager)/.test(lower) && !/best|worst|conversion/.test(lower)) {
    const grp = groupBy(rows, r => r._rm || 'Unknown');
    return { title: `Top ${n} RMs by loss`, table: { columns: ['RM', 'Count', 'Share%'], rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  if (/\bstore/.test(lower) && /best|worst|low conversion|low conv/.test(lower)) {
    const items = wk.stores.map(s => {
      const w = s.days.reduce((a, d) => a + d.w, 0);
      const b = s.days.reduce((a, d) => a + d.b, 0);
      return { outlet: s.outlet, rm: s.rm, w, b, conv: pct(b, w) };
    }).filter(x => x.w >= 100).sort((a, b) => a.conv - b.conv).slice(0, n);
    return { title: `Worst ${n} stores by conversion`, table: { columns: ['Store', 'RM', 'Walkins', 'Bills', 'Conv%'], rows: items.map(x => ({ cells: [x.outlet, x.rm, fi(x.w), fi(x.b), `${x.conv}%`] })) } };
  }
  if (/\bstore/.test(lower)) {
    const grp = storeIdx >= 0 ? groupBy(rows, r => r[storeIdx] || 'Unknown') : [];
    return { title: `Top ${n} stores by loss`, table: { columns: ['Store', 'Count', 'Share%'], rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  if (/\bmarket/.test(lower)) {
    const grp = groupBy(rows, r => r._wkStore ? r._wkStore.market : 'Unknown');
    return { title: 'Markets by loss', table: { columns: ['Market', 'Count', 'Share%'], rows: grp.map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  if (/\breason/.test(lower)) {
    const grp = reasonIdx >= 0 ? groupBy(rows, r => r[reasonIdx] || 'Unknown') : [];
    return { title: 'Top reasons for loss', table: { columns: ['Reason', 'Count', 'Share%'], rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  if (/\bcateg/.test(lower)) {
    const grp = catIdx >= 0 ? groupBy(rows, r => r[catIdx] || 'Unknown') : [];
    return { title: 'Top categories by loss', table: { columns: ['Category', 'Count', 'Share%'], rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  if (/\b(staff|employee|emp)/.test(lower)) {
    const grp = empIdx >= 0 ? groupBy(rows, r => r[empIdx] || 'Unknown').filter(([k]) => k && k !== 'Unknown') : [];
    return { title: 'Staff with most loss entries', table: { columns: ['Employee', 'Count', 'Share%'], rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `${pct(v.c, rows.length)}%`] })) } };
  }
  return null;
}

export default function Ask() {
  const ctx = useDashboard();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [history, setHistory] = useState([]);

  const result = useMemo(() => submitted ? runQuery(submitted, ctx) : null, [submitted, ctx]);

  function submit(query) {
    const text = (query || q).trim();
    if (!text) return;
    setSubmitted(text);
    setHistory((h) => [text, ...h.filter(x => x !== text)].slice(0, 8));
  }

  return (
    <>
      <div className="view-banner banner-blue">
        <div className="banner-title">💬 Ask About Loss Data</div>
        <div className="banner-body">Pattern-matched plain-English queries. Try a suggestion chip or type your own.</div>
      </div>

      <div className="card">
        <div className="ask-row">
          <input
            className="ask-input"
            type="text"
            placeholder="e.g. top 5 RMs by loss, worst conversion stores, top categories"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button className="btn-primary" onClick={() => submit()}>Ask →</button>
          <button className="btn-ghost" onClick={() => { setQ(''); setSubmitted(null); }}>Clear</button>
        </div>
        <div className="ask-chips">
          {SUGGESTIONS.map(s => (
            <button key={s} className="ask-chip" onClick={() => { setQ(s); submit(s); }}>{s}</button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="ask-history">
          <span className="ask-history-label">Recent:</span>
          {history.map((h, i) => (
            <button key={i} className="ask-chip" onClick={() => { setQ(h); submit(h); }}>{h}</button>
          ))}
        </div>
      )}

      {submitted && (
        <div className="card">
          <div className="card-title">Q: {submitted}</div>
          {result ? (
            <>
              <div className="section-title">{result.title}</div>
              <SortableTable columns={result.table.columns} rows={result.table.rows} />
            </>
          ) : (
            <p className="muted-note">
              Didn't match a known pattern. Try keywords: <em>RM</em>, <em>store</em>, <em>market</em>,
              <em> reason</em>, <em>category</em>, <em>staff</em>, prefixed with <em>top N</em> or
              <em>worst</em>.
            </p>
          )}
        </div>
      )}
    </>
  );
}
