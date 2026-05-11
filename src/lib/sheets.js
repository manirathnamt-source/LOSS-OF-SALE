export function extractSheetId(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{30,}$/.test(s)) return s;
  return null;
}

function convertCell(cell) {
  if (!cell || cell.v == null) return '';
  const v = cell.v;
  if (typeof v === 'string') {
    const m = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
    if (m) {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]) + 1;
      const day = parseInt(m[3]);
      if (m[4] != null) {
        const hh = parseInt(m[4]), mm = parseInt(m[5]), ss = parseInt(m[6]);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return v;
}

function parseGvizResponse(text) {
  const m = text.match(/setResponse\(([\s\S]*)\);?$/);
  if (!m) {
    const stripped = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    if (!stripped) throw new Error('Unexpected GViz response shape');
    return JSON.parse(stripped);
  }
  return JSON.parse(m[1]);
}

export async function fetchSheetTab(sheetId, tabName) {
  if (!sheetId) throw new Error('No sheet ID');
  if (!tabName) throw new Error('No tab name');
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}&headers=1`;
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for tab "${tabName}"`);
  const text = await r.text();
  const data = parseGvizResponse(text);
  if (data.status === 'error') {
    const reasons = (data.errors || []).map(e => e.reason || e.detailed_message || e.message).join('; ');
    throw new Error(reasons || 'GViz error');
  }
  const tbl = data.table || {};
  const cols = tbl.cols || [];
  const headers = cols.map((c, i) => (c.label || c.id || `col${i}`).trim());
  const rows = (tbl.rows || []).map(r => (r.c || []).map(convertCell));
  return { headers, rows };
}

export async function probeSheetExists(sheetId) {
  if (!sheetId) return false;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=__probe__&headers=1`;
    const r = await fetch(url, { credentials: 'omit' });
    if (r.status === 401 || r.status === 403) return false;
    const text = await r.text();
    return /setResponse\(/.test(text);
  } catch {
    return false;
  }
}
