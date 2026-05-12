import { useMemo, useState } from 'react';

function isPlainScalar(v) { return typeof v === 'string' || typeof v === 'number'; }

function sortKey(cell) {
  if (cell == null) return '';
  if (isPlainScalar(cell)) return String(cell);
  // React node — try to derive a comparable string
  if (cell.props && cell.props['data-sort'] != null) return String(cell.props['data-sort']);
  if (cell.props && typeof cell.props.children === 'string') return cell.props.children;
  if (cell.props && typeof cell.props.children === 'number') return String(cell.props.children);
  return '';
}

function numericish(s) {
  const cleaned = String(s).replace(/[₹,%\s▲▼]/g, '').trim();
  if (cleaned === '' || cleaned === '—') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export default function SortableTable({ columns, rows, footer, rowClass, dense }) {
  const [sort, setSort] = useState({ col: null, asc: true });

  const sorted = useMemo(() => {
    if (sort.col == null) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      const av = sortKey(a.cells[sort.col]);
      const bv = sortKey(b.cells[sort.col]);
      const an = numericish(av), bn = numericish(bv);
      if (an != null && bn != null) return sort.asc ? an - bn : bn - an;
      return sort.asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return out;
  }, [rows, sort]);

  const toggle = (i) => setSort(s => ({ col: i, asc: s.col === i ? !s.asc : true }));

  return (
    <div className="tw">
      <table className={dense ? 'dense' : ''}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                onClick={() => toggle(i)}
                className={sort.col === i ? (sort.asc ? 'sort-asc' : 'sort-desc') : ''}
              >{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, ri) => (
            <tr key={ri} className={rowClass ? rowClass(r) : undefined}>
              {r.cells.map((c, ci) => <td key={ci}>{c}</td>)}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>{footer.map((c, ci) => <td key={ci}>{c}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
