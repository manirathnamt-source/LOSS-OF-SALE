import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getMode, getSheetUrl, getSheetId, getApiKey, getFileMeta,
  setSheetConfig, setFileConfig, clearConfig, MODE,
} from '../lib/config.js';
import { getCached, setCached, clearAll as clearCache } from '../lib/cache.js';
import { extractSheetId, getSpreadsheetTabs, batchGetTabs } from '../lib/sheetsApi.js';
import { parseXlsxFile, parseXlsxBuffer } from '../lib/xlsx.js';
import { saveWorkbook, loadWorkbook, clearWorkbook } from '../lib/fileCache.js';
import { parseDiscount, parseMapping, applyFilters, EMPTY_FILTERS } from '../lib/discount.js';

const DashboardCtx = createContext(null);

export function useDashboard() {
  const v = useContext(DashboardCtx);
  if (!v) throw new Error('useDashboard must be used inside <DashboardProvider>');
  return v;
}

const STATUS = {
  UNCONFIGURED: 'unconfigured',
  DISCOVERING:  'discovering',
  LOADING:      'loading',
  READY:        'ready',
  ERROR:        'error',
};

const REQUIRED_TABS = ['Discount Report', 'Mapping']; // Sales Report is optional / may be empty

function pickTab(allTabs, candidates) {
  const lower = allTabs.map(t => t.toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return allTabs[i];
  }
  for (const c of candidates) {
    const i = lower.findIndex(t => t.includes(c.toLowerCase()));
    if (i >= 0) return allTabs[i];
  }
  return null;
}

function buildFromSheets(rawData) {
  const discountRaw = rawData['Discount Report'] || { headers: [], rows: [] };
  const mappingRaw  = rawData['Mapping']         || { headers: [], rows: [] };
  const mapping = parseMapping(mappingRaw.headers, mappingRaw.rows);
  const disc = parseDiscount(discountRaw.headers, discountRaw.rows, mapping);
  return { ...disc, mapping };
}

export function DashboardProvider({ children }) {
  const [mode, setMode] = useState(() => getMode());
  const [sheetUrl, setSheetUrlState] = useState(() => getSheetUrl());
  const [sheetId, setSheetIdState]   = useState(() => {
    const stored = getSheetId();
    if (stored) return stored;
    return extractSheetId(getSheetUrl()) || '';
  });
  const [apiKey, setApiKeyState]     = useState(() => getApiKey());
  const [fileMeta, setFileMetaState] = useState(() => getFileMeta());

  const initialStatus =
    (mode === MODE.SHEET && sheetId && apiKey) || (mode === MODE.FILE && fileMeta)
      ? STATUS.DISCOVERING : STATUS.UNCONFIGURED;

  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [modal, setModal] = useState(null);

  const loadFromSheet = useCallback(async (sid, key, opts = {}) => {
    if (!sid || !key) { setStatus(STATUS.UNCONFIGURED); return; }
    let renderedFromCache = false;

    if (!opts.skipCache) {
      const cached = getCached(sid, 'discount');
      if (cached?.data) {
        try {
          const built = buildFromSheets(cached.data);
          setData(built);
          setLastSyncTs(cached.ts);
          setStatus(STATUS.READY);
          renderedFromCache = true;
        } catch { /* fall through */ }
      }
    }
    setRefreshing(renderedFromCache);
    if (!renderedFromCache) setStatus(STATUS.DISCOVERING);

    try {
      const tabs = await getSpreadsheetTabs(sid, key);
      const wanted = REQUIRED_TABS.map(t => pickTab(tabs, [t])).filter(Boolean);
      if (wanted.length < 2) {
        throw new Error(`Sheet must contain "Discount Report" and "Mapping" tabs. Found: ${tabs.join(', ')}`);
      }
      if (!renderedFromCache) setStatus(STATUS.LOADING);
      const fetched = await batchGetTabs(sid, key, wanted);
      const normalized = {};
      REQUIRED_TABS.forEach((name, i) => { normalized[name] = fetched[wanted[i]] || { headers: [], rows: [] }; });
      setCached(sid, 'discount', null, normalized);
      const built = buildFromSheets(normalized);
      setData(built);
      setLastSyncTs(Date.now());
      setStatus(STATUS.READY);
      setError(null);
    } catch (e) {
      const msg = e?.message || String(e);
      if (renderedFromCache) setError(msg);
      else { setError(msg); setStatus(STATUS.ERROR); }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadFromFile = useCallback(async () => {
    setStatus(STATUS.DISCOVERING);
    setError(null);
    try {
      const wrap = await loadWorkbook();
      if (!wrap?.parsed) {
        setError('Workbook cache not found. Please re-upload the .xlsx file.');
        setStatus(STATUS.UNCONFIGURED);
        return;
      }
      setStatus(STATUS.LOADING);
      const tabs = wrap.parsed.sheetNames;
      const wanted = REQUIRED_TABS.map(t => pickTab(tabs, [t])).filter(Boolean);
      if (wanted.length < 2) throw new Error(`Workbook must contain "Discount Report" and "Mapping" tabs. Found: ${tabs.join(', ')}`);
      const normalized = {};
      REQUIRED_TABS.forEach((name, i) => { normalized[name] = wrap.parsed.sheets[wanted[i]] || { headers: [], rows: [] }; });
      const built = buildFromSheets(normalized);
      setData(built);
      setLastSyncTs(wrap.ts);
      setStatus(STATUS.READY);
    } catch (e) {
      setError(e.message || String(e));
      setStatus(STATUS.ERROR);
    }
  }, []);

  useEffect(() => {
    if (mode === MODE.FILE && fileMeta) loadFromFile();
    else if (mode === MODE.SHEET && sheetId && apiKey) loadFromSheet(sheetId, apiKey);
    else setStatus(STATUS.UNCONFIGURED);
  }, [mode, sheetId, apiKey, fileMeta, loadFromFile, loadFromSheet]);

  const filtered = useMemo(() => {
    if (!data) return null;
    return { ...data, filteredRows: applyFilters(data.rows, filters) };
  }, [data, filters]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'dateFrom' && next.dateTo && next.dateTo < value) next.dateTo = '';
      return next;
    });
  }, []);
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const connectSheet = useCallback(async (url, key) => {
    const id = extractSheetId(url);
    if (!id) { setError('Could not extract sheet ID from URL'); setStatus(STATUS.ERROR); return false; }
    if (!key || !key.trim()) { setError('Please paste your Google Sheets API key'); setStatus(STATUS.ERROR); return false; }
    setStatus(STATUS.DISCOVERING);
    setError(null);
    try { await getSpreadsheetTabs(id, key.trim()); }
    catch (e) { setError(e.message || String(e)); setStatus(STATUS.ERROR); return false; }
    setSheetConfig(url, id, key.trim());
    setSheetUrlState(url);
    setSheetIdState(id);
    setApiKeyState(key.trim());
    setMode(MODE.SHEET);
    return true;
  }, []);

  const connectFile = useCallback(async (file) => {
    setStatus(STATUS.DISCOVERING);
    setError(null);
    try {
      const parsed = await parseXlsxFile(file);
      const tabs = parsed.sheetNames;
      const wanted = REQUIRED_TABS.map(t => pickTab(tabs, [t])).filter(Boolean);
      if (wanted.length < 2) throw new Error(`Couldn't find "Discount Report" + "Mapping" tabs. Saw: ${tabs.slice(0, 8).join(', ')}`);
      await saveWorkbook(parsed);
      const meta = { fileName: parsed.fileName, fileSize: parsed.fileSize, sheetCount: parsed.sheetNames.length, ts: Date.now() };
      setFileConfig(meta);
      setFileMetaState(meta);
      setMode(MODE.FILE);
      return true;
    } catch (e) {
      setError(e.message || String(e));
      setStatus(STATUS.ERROR);
      return false;
    }
  }, []);

  const connectSampleFile = useCallback(async () => {
    setStatus(STATUS.DISCOVERING);
    setError(null);
    try {
      const r = await fetch('/sample.xlsx');
      if (!r.ok) throw new Error(`Sample file fetch failed (HTTP ${r.status})`);
      const ab = await r.arrayBuffer();
      const file = new File([ab], 'sample.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return await connectFile(file);
    } catch (e) {
      setError(e.message || String(e));
      setStatus(STATUS.ERROR);
      return false;
    }
  }, [connectFile]);

  const disconnect = useCallback(async () => {
    clearConfig();
    clearCache();
    await clearWorkbook();
    setMode(''); setSheetUrlState(''); setSheetIdState(''); setApiKeyState('');
    setFileMetaState(null); setData(null); setLastSyncTs(null); setError(null);
    setStatus(STATUS.UNCONFIGURED);
  }, []);

  const refresh = useCallback(() => {
    if (mode === MODE.SHEET && sheetId && apiKey) loadFromSheet(sheetId, apiKey, { skipCache: true });
    else if (mode === MODE.FILE) loadFromFile();
  }, [mode, sheetId, apiKey, loadFromSheet, loadFromFile]);

  const value = useMemo(() => ({
    mode, sheetUrl, sheetId, apiKey, fileMeta,
    status, error, data: filtered, refreshing, lastSyncTs,
    filters, setFilter, resetFilters,
    modal, setModal,
    connectSheet, connectFile, connectSampleFile, disconnect, refresh,
    isReady: status === STATUS.READY && !!filtered,
  }), [mode, sheetUrl, sheetId, apiKey, fileMeta, status, error, filtered, refreshing, lastSyncTs, filters, setFilter, resetFilters, modal, connectSheet, connectFile, connectSampleFile, disconnect, refresh]);

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}

export { STATUS, MODE };
