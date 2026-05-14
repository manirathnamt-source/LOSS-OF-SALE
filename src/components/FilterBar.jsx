import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtDK } from '../lib/date.js';
import { fi } from '../lib/format.js';

export default function FilterBar() {
  const { data, filters, setFilter, resetFilters } = useDashboard();
  if (!data) return null;
  const { dks, outlets, offers, families, rms, markets, filteredRows, rows } = data;

  return (
    <>
      <div className="filter-bar">
        <label>From:</label>
        <select value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)}>
          <option value="">Start</option>
          {dks.map(dk => <option key={dk} value={dk}>{fmtDK(dk)}</option>)}
        </select>
        <label>To:</label>
        <select value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)}>
          <option value="">End</option>
          {dks.filter(dk => !filters.dateFrom || dk >= filters.dateFrom).map(dk => <option key={dk} value={dk}>{fmtDK(dk)}</option>)}
        </select>
        <div className="filter-sep" />

        <label>Outlet:</label>
        <select value={filters.outlet} onChange={(e) => setFilter('outlet', e.target.value)}>
          <option value="">All outlets</option>
          {outlets.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <label>Offer:</label>
        <select value={filters.offer} onChange={(e) => setFilter('offer', e.target.value)}>
          <option value="">All offers</option>
          {offers.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <label>Category:</label>
        <select value={filters.family} onChange={(e) => setFilter('family', e.target.value)}>
          <option value="">All categories</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label>RM:</label>
        <select value={filters.rm} onChange={(e) => setFilter('rm', e.target.value)}>
          <option value="">All RMs</option>
          {rms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label>Market:</label>
        <select value={filters.market} onChange={(e) => setFilter('market', e.target.value)}>
          <option value="">All markets</option>
          {markets.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button className="filter-btn" onClick={resetFilters}>Reset</button>
      </div>

      <div className="filter-summary">
        <span>📅 <strong>Range:</strong> {dks.length ? fmtDK(dks[0]) : '—'} → <strong>{dks.length ? fmtDK(dks[dks.length - 1]) : '—'}</strong> ({dks.length} day{dks.length === 1 ? '' : 's'})</span>
        <span className="dim">|</span>
        <span>📊 <strong>{fi(filteredRows.length)}</strong> of {fi(rows.length)} records visible</span>
      </div>
    </>
  );
}
