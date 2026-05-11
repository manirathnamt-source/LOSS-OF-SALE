export function MetricSkeleton() {
  return (
    <div className="metric skeleton">
      <div className="sk-line sk-sm" style={{ width: '60%' }} />
      <div className="sk-line sk-lg" style={{ width: '40%' }} />
      <div className="sk-line sk-sm" style={{ width: '30%' }} />
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="metrics">
      {Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="card">
      <div className="sk-line sk-md" style={{ width: '30%', marginBottom: 16 }} />
      <div className="tw">
        <table>
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><div className="sk-line sk-sm" style={{ width: '70%' }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}><div className="sk-line sk-sm" style={{ width: `${50 + ((r * c) % 4) * 10}%` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="filter-bar skeleton-bar">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="sk-line sk-pill" />
      ))}
    </div>
  );
}
