import { useRef, useState } from 'react';
import { useDashboard, MODE } from '../store/DashboardContext.jsx';
import { envHasSheetUrl, envHasApiKey, envHasSheetConfig } from '../lib/config.js';

function fmtTs(ts) {
  if (!ts) return '—';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function Setup({ onCancel }) {
  const dash = useDashboard();
  const { mode, sheetUrl, apiKey, fileMeta, lastSyncTs, activeMonths, months,
          connectSheet, connectFile, connectSampleFile, refresh, disconnect } = dash;

  const sheetIsActive = mode === MODE.SHEET && !!apiKey && !!sheetUrl;
  const fileIsActive  = mode === MODE.FILE && !!fileMeta;
  const initialTab = sheetIsActive ? 'sheet' : 'file';

  const [tab, setTab] = useState(initialTab);
  const [showSheetForm, setShowSheetForm] = useState(!sheetIsActive);
  const [urlInput, setUrlInput] = useState(sheetUrl || '');
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
      setErr('Please pick a .xlsx, .xls, or .xlsm file');
      return;
    }
    setErr(null); setOk(null); setBusy(true);
    try {
      const success = await connectFile(file);
      if (success) setOk(`✓ Loaded ${file.name}`);
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function submitSheet(e) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!urlInput.trim()) { setErr('Paste your Google Sheet URL'); return; }
    if (!keyInput.trim()) { setErr('Paste your Sheets API key'); return; }
    setBusy(true);
    try {
      const success = await connectSheet(urlInput.trim(), keyInput.trim());
      if (success) {
        setOk('✓ Connected — loading data…');
        setKeyInput(''); // never keep the key in component state
        setShowSheetForm(false);
      }
    } catch (e) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="setup-title">Load your dashboard data</div>

        <div className="setup-tabs">
          <button type="button" className={`setup-tab${tab === 'file' ? ' active' : ''}`} onClick={() => setTab('file')}>
            📂 Upload .xlsx {fileIsActive && <span className="setup-dot" />}
          </button>
          <button type="button" className={`setup-tab${tab === 'sheet' ? ' active' : ''}`} onClick={() => setTab('sheet')}>
            🔗 Live Google Sheet {sheetIsActive && <span className="setup-dot" />}
          </button>
        </div>

        {tab === 'file' && (
          <>
            <p className="setup-hint">
              Drop or pick the Excel file with your <strong>Walkins</strong> and{' '}
              <strong>Loss of sale data</strong> tabs. Parsed instantly in your browser — nothing
              is uploaded anywhere.
            </p>
            <label
              className={`drop-zone${dragging ? ' drag-over' : ''}${busy ? ' busy' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm"
                hidden
                disabled={busy}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="drop-text">
                {busy ? 'Parsing workbook…' : <>📂 <strong>Drop file here</strong> or click to browse</>}
              </div>
              <div className="drop-hint">.xlsx, .xls, .xlsm</div>
            </label>
            {err && <div className="setup-error">⚠ {err}</div>}
            {ok && <div className="setup-ok">{ok}</div>}
            <div className="setup-actions" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  setErr(null); setOk(null); setBusy(true);
                  try {
                    const success = await connectSampleFile();
                    if (success) setOk('✓ Sample data loaded');
                  } catch (e) { setErr(e.message || String(e)); }
                  finally { setBusy(false); }
                }}
                disabled={busy}
              >Load sample data</button>
              {onCancel && (
                <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Close</button>
              )}
            </div>
          </>
        )}

        {tab === 'sheet' && sheetIsActive && !showSheetForm && (
          <ConnectedView
            sheetUrl={sheetUrl}
            monthsLabel={activeMonths.map(k => months[k]?.label).filter(Boolean).join(' + ')}
            lastSyncTs={lastSyncTs}
            onRefresh={refresh}
            onChange={() => { setShowSheetForm(true); setKeyInput(''); }}
            onDisconnect={async () => { await disconnect(); }}
            onClose={onCancel}
            busy={busy}
          />
        )}

        {tab === 'sheet' && (!sheetIsActive || showSheetForm) && (
          <>
            <p className="setup-hint">
              Auto-syncs whenever the sheet changes. Needs a Sheets API key + your sheet shared as{' '}
              <strong>Anyone with link → Viewer</strong>.
            </p>
            {envHasSheetConfig() && !sheetIsActive && (
              <div className="setup-ok" style={{ marginBottom: '0.75rem' }}>
                ℹ️ Sheet URL + API key found in <code>.env.local</code> — click Connect to use them.
              </div>
            )}
            {envHasSheetUrl() && !envHasApiKey() && !sheetIsActive && (
              <div className="setup-info" style={{ marginBottom: '0.75rem' }}>
                ℹ️ Sheet URL loaded from <code>.env.local</code>. Add <code>VITE_GOOGLE_API_KEY</code> there too and restart <code>npm run dev</code> to skip the key field.
              </div>
            )}
            <form onSubmit={submitSheet}>
              <label className="setup-label">Sheet URL</label>
              <input
                type="url"
                className="setup-input"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                disabled={busy}
              />
              <label className="setup-label">API key {sheetIsActive && <span className="muted">(re-enter to change)</span>}</label>
              <input
                type="password"
                className="setup-input"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={sheetIsActive ? '••••••••' : 'AIzaSy…'}
                disabled={busy}
                autoComplete="off"
              />
              <div className="setup-actions">
                <button type="submit" className="btn-primary" disabled={busy || !urlInput.trim() || !keyInput.trim()}>
                  {busy ? 'Connecting…' : 'Connect'}
                </button>
                {sheetIsActive && (
                  <button type="button" className="btn-ghost" onClick={() => setShowSheetForm(false)} disabled={busy}>
                    Back
                  </button>
                )}
                {!sheetIsActive && onCancel && (
                  <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                )}
              </div>
              {err && <div className="setup-error">⚠ {err}</div>}
              {ok && <div className="setup-ok">{ok}</div>}
            </form>
            <details className="setup-help">
              <summary>Get an API key (5 min)</summary>
              <ol>
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Cloud Console → Credentials</a></li>
                <li>Enable the <strong>Google Sheets API</strong> on your project</li>
                <li><strong>+ Create credentials → API key</strong>, copy it</li>
                <li>Click the new key → <strong>Application restrictions → HTTP referrers</strong> → add <code>http://localhost:5173/*</code> + your real domain</li>
                <li><strong>API restrictions → Restrict key</strong> → check only "Google Sheets API"</li>
                <li>Open your Google Sheet → <strong>Share → Anyone with link → Viewer</strong></li>
                <li>(Optional) Put the key in <code>.env.local</code> so you don't paste it every time</li>
              </ol>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function ConnectedView({ sheetUrl, monthsLabel, lastSyncTs, onRefresh, onChange, onDisconnect, onClose, busy }) {
  return (
    <>
      <div className="connected-card">
        <div className="connected-row">
          <div>
            <div className="connected-label">Connected sheet</div>
            <a href={sheetUrl} target="_blank" rel="noreferrer" className="connected-link">
              {sheetUrl.length > 56 ? sheetUrl.slice(0, 56) + '…' : sheetUrl}
            </a>
          </div>
          <div className="connected-status">✓ Live</div>
        </div>
        <div className="connected-meta">
          <span><strong>{monthsLabel || '—'}</strong></span>
          <span className="dim">·</span>
          <span>synced {fmtTs(lastSyncTs)}</span>
        </div>
      </div>
      <div className="setup-actions" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-primary" onClick={onRefresh} disabled={busy}>↻ Sync now</button>
          <button type="button" className="btn-ghost" onClick={onChange} disabled={busy}>Change…</button>
        </div>
        {onClose && <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Close</button>}
      </div>
      <div className="setup-actions" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn-ghost btn-danger" onClick={onDisconnect} disabled={busy}>
          Disconnect & clear cache
        </button>
      </div>
    </>
  );
}
