import { useDashboard, STATUS, MODE } from '../store/DashboardContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { fmtDK } from '../lib/date.js';

function fmtRelative(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function TopBar({ onReconfigure }) {
  const { mode, status, data, fileMeta, error, refreshing, lastSyncTs, refresh } = useDashboard();
  const { theme, toggle: toggleTheme } = useTheme();

  const sourceLabel = mode === MODE.FILE && fileMeta?.fileName ? fileMeta.fileName : 'Live sheet';
  const dks = data?.dks || [];
  const rangeLabel = dks.length ? `${fmtDK(dks[0])} → ${fmtDK(dks[dks.length - 1])}` : '';

  let meta;
  if (status === STATUS.UNCONFIGURED) meta = 'No data loaded';
  else if (status === STATUS.DISCOVERING) meta = mode === MODE.FILE ? 'Reading workbook…' : 'Discovering sheet tabs…';
  else if (status === STATUS.LOADING) meta = 'Loading data…';
  else if (status === STATUS.ERROR && !data) meta = `Error — ${error?.slice(0, 60) || ''}`;
  else meta = `${rangeLabel} · ${refreshing ? 'syncing…' : `${sourceLabel} · ${fmtRelative(lastSyncTs)}`}`;

  const canSync = status === STATUS.READY || status === STATUS.ERROR;

  return (
    <div className="topbar">
      <div className="brand">Discount <span>Dashboard</span></div>
      <div className="topbar-right">
        <div className="topbar-meta">{meta}</div>
        <button
          className="icon-btn"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={toggleTheme}
        >{theme === 'dark' ? '☀' : '☾'}</button>
        <button
          className="icon-btn"
          title="Sync data"
          onClick={refresh}
          disabled={!canSync || refreshing}
        >{refreshing ? '⟳' : '↻'}</button>
        <button className="icon-btn icon-btn-primary" title="Load data / settings" onClick={onReconfigure}>⚙</button>
      </div>
    </div>
  );
}
