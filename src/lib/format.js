export const n = (v) => parseFloat(v) || 0;

export const fi = (v) => Math.round(v).toLocaleString('en-IN');

export const fs = (v) =>
  v >= 1e5 ? (v / 1e5).toFixed(1) + 'L'
  : v >= 1000 ? (v / 1000).toFixed(1) + 'K'
  : Math.round(v) + '';

export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

export const bc = (p) => (p >= 40 ? 'badge-hi' : p >= 25 ? 'badge-mid' : 'badge-lo');
