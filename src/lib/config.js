const SHEET_URL_KEY = 'dash:sheetUrl';
const SHEET_ID_KEY = 'dash:sheetId';
const API_KEY_KEY = 'dash:apiKey';
const MODE_KEY = 'dash:mode';
const FILE_META_KEY = 'dash:fileMeta';

function hasLS() { return typeof localStorage !== 'undefined'; }

export const MODE = { FILE: 'file', SHEET: 'sheet' };

const ENV_SHEET_URL = import.meta.env.VITE_SHEET_URL || '';
const ENV_API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY || '';

export function envHasSheetUrl() { return !!ENV_SHEET_URL; }
export function envHasApiKey()   { return !!ENV_API_KEY; }
export function envHasSheetConfig() { return !!(ENV_SHEET_URL && ENV_API_KEY); }

export function getMode() {
  if (!hasLS()) return envHasSheetConfig() ? MODE.SHEET : '';
  const stored = localStorage.getItem(MODE_KEY);
  if (stored) return stored;
  return envHasSheetConfig() ? MODE.SHEET : '';
}

export function getSheetUrl() {
  if (!hasLS()) return ENV_SHEET_URL;
  return localStorage.getItem(SHEET_URL_KEY) || ENV_SHEET_URL;
}

export function getSheetId() {
  if (!hasLS()) return '';
  return localStorage.getItem(SHEET_ID_KEY) || '';
}

export function getApiKey() {
  if (!hasLS()) return ENV_API_KEY;
  return localStorage.getItem(API_KEY_KEY) || ENV_API_KEY;
}

export function getFileMeta() {
  if (!hasLS()) return null;
  try {
    const raw = localStorage.getItem(FILE_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSheetConfig(url, sheetId, apiKey) {
  if (!hasLS()) return;
  localStorage.setItem(MODE_KEY, MODE.SHEET);
  if (url) localStorage.setItem(SHEET_URL_KEY, url); else localStorage.removeItem(SHEET_URL_KEY);
  if (sheetId) localStorage.setItem(SHEET_ID_KEY, sheetId); else localStorage.removeItem(SHEET_ID_KEY);
  if (apiKey) localStorage.setItem(API_KEY_KEY, apiKey); else localStorage.removeItem(API_KEY_KEY);
  localStorage.removeItem(FILE_META_KEY);
}

export function setFileConfig(meta) {
  if (!hasLS()) return;
  localStorage.setItem(MODE_KEY, MODE.FILE);
  if (meta) localStorage.setItem(FILE_META_KEY, JSON.stringify(meta));
  localStorage.removeItem(SHEET_URL_KEY);
  localStorage.removeItem(SHEET_ID_KEY);
  localStorage.removeItem(API_KEY_KEY);
}

export function clearConfig() {
  if (!hasLS()) return;
  [SHEET_URL_KEY, SHEET_ID_KEY, API_KEY_KEY, MODE_KEY, FILE_META_KEY].forEach(k => localStorage.removeItem(k));
}
