import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { parseWalkins, parseLoss } from '../lib/parse.js';
import { mergeMonths } from '../lib/merge.js';
import { EMPTY_FILTERS } from '../lib/filter.js';
import {
  getMode, getSheetUrl, getSheetId, getApiKey, getFileMeta,
  setSheetConfig, setFileConfig, clearConfig, MODE,
} from '../lib/config.js';
import { getCached, setCached, clearAll as clearCache } from '../lib/cache.js';
import { extractSheetId, discoverViaApi, fetchMonthsViaApi, getSpreadsheetTabs } from '../lib/sheetsApi.js';
import { parseXlsxFile } from '../lib/xlsx.js';
import { discoverMonthsFromWorkbook, getTabData } from '../lib/fileSource.js';
import { saveWorkbook, loadWorkbook, clearWorkbook } from '../lib/fileCache.js';

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
      ? STATUS.DISCOVERING
      : STATUS.UNCONFIGURED;

  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState({});
  const [activeMonths, setActiveMonths] = useState([]);
  const [monthData, setMonthData] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [lsSyncOn, setLsSyncOn] = useState(false);
  const [modal, setModal] = useState(null);
  const reloadKey = useRef(0);

  const buildFromParsed = useCallback((parsed) => {
    const disc = discoverMonthsFromWorkbook(parsed);
    if (!disc.activeMonths.length) {
      throw new Error(`No paired month tabs found in workbook. Sheets seen: ${parsed.sheetNames.slice(0, 8).join(', ')}${parsed.sheetNames.length > 8 ? '…' : ''}`);
    }
    const next = {};
    disc.activeMonths.forEach(k => {
      const m = disc.months[k];
      const wkData = getTabData(parsed, m.wkTab);
      const lsData = getTabData(parsed, m.lsTab);
      const wk = parseWalkins(wkData.headers || [], wkData.rows || []);
      next[k] = { wk, lsHeaders: lsData.headers || [], lsRowsRaw: lsData.rows || [] };
    });
    return {
      months: Object.fromEntries(
        Object.entries(disc.months).map(([k, m]) => [k, { num: m.num, year: m.year, label: m.label, wkTab: m.wkTab, lsTab: m.lsTab }])
      ),
      activeMonths: disc.activeMonths,
      monthData: next,
    };
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
      const built = buildFromParsed(wrap.parsed);
      setMonths(built.months);
      setActiveMonths(built.activeMonths);
      setMonthData(built.monthData);
      setLastSyncTs(wrap.ts);
      setStatus(STATUS.READY);
    } catch (e) {
      setError(e.message || String(e));
      setStatus(STATUS.ERROR);
    }
  }, [buildFromParsed]);

  const loadFromSheet = useCallback(async (sid, key, opts = {}) => {
    if (!sid || !key) { setStatus(STATUS.UNCONFIGURED); return; }
    const cacheKey = sid;
    let renderedFromCache = false;

    if (!opts.skipCache) {
      const cachedReg = getCached(cacheKey, 'registry');
      if (cachedReg?.data?.activeMonths?.length) {
        const reg = cachedReg.data;
        const cachedMd = {};
        let allFound = true;
        for (const k of reg.activeMonths) {
          const m = reg.months[k];
          const wkC = getCached(cacheKey, 'tab', m.wkTab);
          const lsC = getCached(cacheKey, 'tab', m.lsTab);
          if (wkC?.data && lsC?.data) {
            const wk = parseWalkins(wkC.data.headers || [], wkC.data.rows || []);
            cachedMd[k] = { wk, lsHeaders: lsC.data.headers || [], lsRowsRaw: lsC.data.rows || [] };
          } else { allFound = false; break; }
        }
        if (allFound) {
          setMonths(reg.months);
          setActiveMonths(reg.activeMonths);
          setMonthData(cachedMd);
          setLastSyncTs(cachedReg.ts);
          setStatus(STATUS.READY);
          renderedFromCache = true;
        }
      }
    }

    setRefreshing(renderedFromCache);
    if (!renderedFromCache) setStatus(STATUS.DISCOVERING);

    try {
      const disc = await discoverViaApi(sid, key);
      if (!disc.activeMonths.length) {
        if (!renderedFromCache) {
          const seen = (disc.allTabNames || []).slice(0, 8).join(', ');
          setError(`No paired Walkins/Loss month tabs found. Tabs seen: ${seen}${(disc.allTabNames || []).length > 8 ? '…' : ''}`);
          setStatus(STATUS.ERROR);
        }
        setRefreshing(false);
        return;
      }

      const regToCache = { months: disc.months, activeMonths: disc.activeMonths };
      setCached(cacheKey, 'registry', null, regToCache);
      setMonths(regToCache.months);
      setActiveMonths(regToCache.activeMonths);
      if (!renderedFromCache) setStatus(STATUS.LOADING);

      const fetched = await fetchMonthsViaApi(sid, key, disc.months, disc.activeMonths);
      const next = {};
      disc.activeMonths.forEach(k => {
        const m = disc.months[k];
        const { wkRaw, lsRaw } = fetched[k];
        setCached(cacheKey, 'tab', m.wkTab, wkRaw);
        setCached(cacheKey, 'tab', m.lsTab, lsRaw);
        const wk = parseWalkins(wkRaw.headers, wkRaw.rows);
        next[k] = { wk, lsHeaders: lsRaw.headers, lsRowsRaw: lsRaw.rows };
      });
      setMonthData(next);
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

  useEffect(() => {
    reloadKey.current++;
    if (mode === MODE.FILE && fileMeta) {
      loadFromFile();
    } else if (mode === MODE.SHEET && sheetId && apiKey) {
      loadFromSheet(sheetId, apiKey);
    } else {
      setStatus(STATUS.UNCONFIGURED);
    }
  }, [mode, sheetId, apiKey, fileMeta, loadFromFile, loadFromSheet]);

  const merged = useMemo(() => {
    if (status !== STATUS.READY || !Object.keys(monthData).length) return null;
    const keys = filters.month === 'all' ? activeMonths : [filters.month];
    const available = keys.filter(k => monthData[k]);
    if (!available.length) return null;
    const m = mergeMonths(monthData, available);
    const ls = parseLoss(m.lsHeaders, m.lsRowsRaw, m.wk);
    return { wk: m.wk, lsHeaders: m.lsHeaders, ...ls };
  }, [status, filters.month, activeMonths, monthData]);

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
    if (!id) {
      setError('Could not extract sheet ID from that URL.');
      setStatus(STATUS.ERROR);
      return false;
    }
    if (!key || !key.trim()) {
      setError('Please paste your Google Sheets API key.');
      setStatus(STATUS.ERROR);
      return false;
    }
    setStatus(STATUS.DISCOVERING);
    setError(null);
    try {
      await getSpreadsheetTabs(id, key.trim());
    } catch (e) {
      setError(e.message || String(e));
      setStatus(STATUS.ERROR);
      return false;
    }
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
      const disc = discoverMonthsFromWorkbook(parsed);
      if (!disc.activeMonths.length) {
        throw new Error(`Couldn't find any paired Walkins + Loss of sale tabs. Tabs seen: ${parsed.sheetNames.slice(0, 8).join(', ')}${parsed.sheetNames.length > 8 ? '…' : ''}`);
      }
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
    setMode('');
    setSheetUrlState(''); setSheetIdState(''); setApiKeyState('');
    setFileMetaState(null);
    setMonths({}); setActiveMonths([]); setMonthData({});
    setLastSyncTs(null); setError(null);
    setStatus(STATUS.UNCONFIGURED);
  }, []);

  const refresh = useCallback(() => {
    if (mode === MODE.SHEET && sheetId && apiKey) loadFromSheet(sheetId, apiKey, { skipCache: true });
    else if (mode === MODE.FILE) loadFromFile();
  }, [mode, sheetId, apiKey, loadFromSheet, loadFromFile]);

  const value = useMemo(() => ({
    mode, sheetUrl, sheetId, apiKey, fileMeta,
    status, error,
    months, activeMonths, monthData, merged,
    refreshing, lastSyncTs,
    filters, setFilter, resetFilters,
    lsSyncOn, setLsSyncOn,
    modal, setModal,
    connectSheet, connectFile, connectSampleFile,
    disconnect, refresh,
    isReady: status === STATUS.READY && !!merged,
  }), [mode, sheetUrl, sheetId, apiKey, fileMeta, status, error, months, activeMonths, monthData, merged, refreshing, lastSyncTs, filters, setFilter, resetFilters, lsSyncOn, modal, connectSheet, connectFile, connectSampleFile, disconnect, refresh]);

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}

export { STATUS, MODE };
