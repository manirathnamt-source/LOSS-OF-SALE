import { useMemo, useState } from 'react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fi, fs, pct } from '../lib/format.js';
import { groupRows, uniqueBills } from '../lib/discountAgg.js';
import SortableTable from '../components/SortableTable.jsx';

const SUGGESTIONS = [
  'top 5 offers',
  'top 10 outlets by discount',
  'best margin offers',
  'worst margin outlets',
  'top free items',
  'discount by RM',
  'discount by market',
  'discount by category',
];

function runQuery(q, ctx) {
  const rows = ctx.data.filteredRows;
  const lower = q.toLowerCase().trim();
  const m = lower.match(/top\s+(\d+)?/);
  const n = m && m[1] ? parseInt(m[1]) : 10;

  if (/\boffer/.test(lower) && /margin/.test(lower)) {
    const grp = groupRows(rows, r => r.offer);
    const sorted = grp.map(([k, v]) => {
      const landing = v.items.reduce((s, x) => s + x.landing, 0);
      const margin = v.itemNet > 0 ? pct(v.itemNet - landing, v.itemNet) : 0;
      return { k, v, margin };
    }).sort((a, b) => /worst/.test(lower) ? a.margin - b.margin : b.margin - a.margin);
    return { title: (/worst/.test(lower) ? 'Worst' : 'Best') + ' margin offers', table: {
      columns: ['Offer', 'Lines', 'Net sales', 'Margin%'],
      rows: sorted.slice(0, n).map(({ k, v, margin }) => ({ cells: [k, fi(v.c), `₹${fs(v.itemNet)}`, `${margin}%`] })),
    } };
  }
  if (/\boutlet/.test(lower) && /margin/.test(lower)) {
    const grp = groupRows(rows, r => r.outlet);
    const sorted = grp.map(([k, v]) => {
      const landing = v.items.reduce((s, x) => s + x.landing, 0);
      const margin = v.itemNet > 0 ? pct(v.itemNet - landing, v.itemNet) : 0;
      return { k, v, margin };
    }).sort((a, b) => /worst/.test(lower) ? a.margin - b.margin : b.margin - a.margin);
    return { title: (/worst/.test(lower) ? 'Worst' : 'Best') + ' margin outlets', table: {
      columns: ['Outlet', 'Lines', 'Net sales', 'Margin%'],
      rows: sorted.slice(0, n).map(({ k, v, margin }) => ({ cells: [k, fi(v.c), `₹${fs(v.itemNet)}`, `${margin}%`] })),
    } };
  }
  if (/\b(offer)/.test(lower)) {
    const grp = groupRows(rows, r => r.offer);
    return { title: `Top ${n} offers by discount`, table: { columns: ['Offer', 'Lines', 'Discount', 'Net sales'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`] })) } };
  }
  if (/\boutlet|\bstore/.test(lower)) {
    const grp = groupRows(rows, r => r.outlet);
    return { title: `Top ${n} outlets by discount`, table: { columns: ['Outlet', 'Lines', 'Discount', 'Net sales'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`] })) } };
  }
  if (/\bfree|gift/.test(lower)) {
    const free = rows.filter(r => r.freeItem && r.freeItem !== '-');
    const grp = groupRows(free, r => r.freeItem);
    return { title: 'Top free items given', table: { columns: ['Free item', 'Lines', 'Units', 'Landing cost'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), fi(v.qty), `₹${fs(v.items.reduce((s, x) => s + x.landing, 0))}`] })) } };
  }
  if (/\b(rm|regional manager)/.test(lower)) {
    const grp = groupRows(rows, r => r.rm);
    return { title: 'Discount by RM', table: { columns: ['RM', 'Lines', 'Discount', 'Net sales'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`] })) } };
  }
  if (/\bmarket/.test(lower)) {
    const grp = groupRows(rows, r => r.market);
    return { title: 'Discount by market', table: { columns: ['Market', 'Lines', 'Discount', 'Net sales'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`] })) } };
  }
  if (/\bcategor|\bfamily/.test(lower)) {
    const grp = groupRows(rows, r => r.family);
    return { title: 'Discount by category', table: { columns: ['Category', 'Lines', 'Discount', 'Net sales'],
      rows: grp.slice(0, n).map(([k, v]) => ({ cells: [k, fi(v.c), `₹${fs(v.disc)}`, `₹${fs(v.itemNet)}`] })) } };
  }
  return null;
}

export default function Ask() {
  const ctx = useDashboard();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const result = useMemo(() => submitted ? runQuery(submitted, ctx) : null, [submitted, ctx]);
  const submit = (query) => {
    const t = (query || q).trim();
    if (t) setSubmitted(t);
  };

  return (
    <>
      <div className="view-banner banner-blue">
        <div className="banner-title">💬 Ask About Discount Data</div>
        <div className="banner-body">Pattern-matched plain-English queries. Try the chips or type your own.</div>
      </div>

      <div className="card">
        <div className="ask-row">
          <input
            className="ask-input"
            placeholder="e.g. top 5 offers, best margin outlets, top free items"
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
              Didn't match a known pattern. Try keywords: <em>offer</em>, <em>outlet</em>, <em>RM</em>,{' '}
              <em>market</em>, <em>category</em>, <em>free items</em>, optionally with <em>top N</em>,
              <em>best/worst margin</em>.
            </p>
          )}
        </div>
      )}
    </>
  );
}
