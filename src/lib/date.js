export function dayKey(day, month, year) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function fmtDK(dk) {
  try {
    const d = new Date(dk + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return dk;
  }
}

export function parseDate(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date && !isNaN(raw)) {
    return { year: raw.getFullYear(), month: raw.getMonth() + 1, day: raw.getDate() };
  }
  const s = String(raw).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]), hh = parseInt(m[4]);
    if (/Z$/.test(s)) {
      if (hh >= 12) {
        const dt = new Date(Date.UTC(y, mo - 1, d));
        dt.setUTCDate(dt.getUTCDate() + 1);
        return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
      }
      return { year: y, month: mo, day: d };
    }
    return { year: y, month: mo, day: d };
  }

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]), day: parseInt(m[3]) };

  m = s.match(/^(\d{1,2})-([A-Za-z]{3,9})-(\d{2,4})$/);
  if (m) {
    const mo = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    }[m[2].toLowerCase()];
    const yr = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return mo ? { year: yr, month: mo, day: parseInt(m[1]) } : null;
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { year: parseInt(m[3]), month: parseInt(m[2]), day: parseInt(m[1]) };

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) return { year: 2000 + parseInt(m[3]), month: parseInt(m[2]), day: parseInt(m[1]) };

  return null;
}

export function toDayKey(raw) {
  const p = parseDate(raw);
  if (!p) return null;
  return dayKey(p.day, p.month, p.year);
}

export function toTimeBucket(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})-(\d{1,2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1]);
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
  }
  if (s && s !== '-') return s;
  return null;
}
