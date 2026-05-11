import * as XLSX from 'xlsx';

export async function parseXlsxFile(file) {
  const ab = await file.arrayBuffer();
  return parseXlsxBuffer(ab, { fileName: file.name, fileSize: file.size });
}

export function parseXlsxBuffer(ab, meta = {}) {
  const wb = XLSX.read(ab, { type: 'array', cellDates: true });
  const sheets = {};
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    if (!ws) return;
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false });
    if (!aoa.length) {
      sheets[name] = { headers: [], rows: [] };
      return;
    }
    const headers = (aoa[0] || []).map(h => String(h ?? '').trim());
    const rows = aoa.slice(1).map(r => r.map(c => c instanceof Date ? c : c));
    sheets[name] = { headers, rows };
  });
  return { sheets, sheetNames: wb.SheetNames.slice(), ...meta };
}
