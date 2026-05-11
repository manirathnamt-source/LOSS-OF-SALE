export function mobStatus(val) {
  if (!val || String(val).trim() === '' || String(val).trim() === '-') return 'missing';
  const s = String(val).replace(/\D/g, '');
  if (s.length !== 10) return 'invalid_length';
  if (/^(\d)\1{9}$/.test(s)) return 'invalid_junk';
  if (/(\d)\1{3,}/.test(s)) return 'invalid_repeated';
  return 'valid';
}

export function normStore(s) {
  return String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase();
}

export function storeKeys(s) {
  const base = normStore(s);
  if (!base) return [];
  const out = new Set([base]);
  const dashIdx = base.search(/\s[-–]\s/);
  if (dashIdx > 0) out.add(base.slice(0, dashIdx).trim());
  if (dashIdx > 0) out.add(base.slice(dashIdx).replace(/^\s*[-–]\s*/, '').trim());
  const spaceIdx = base.indexOf(' ');
  if (spaceIdx > 0) out.add(base.slice(0, spaceIdx).trim());
  out.add(base.replace(/[-–_]+/g, ' ').replace(/\s+/g, ' ').trim());
  return [...out].filter(Boolean);
}
