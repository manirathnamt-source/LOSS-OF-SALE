import { useEffect, useState } from 'react';
import { DashboardProvider, useDashboard, STATUS } from './store/DashboardContext.jsx';
import TopBar from './components/TopBar.jsx';
import Tabs from './components/Tabs.jsx';
import FilterBar from './components/FilterBar.jsx';
import Modal from './components/Modal.jsx';
import Setup from './components/Setup.jsx';
import { ErrorCard } from './components/Loading.jsx';
import { MetricsSkeleton, TableSkeleton, FilterBarSkeleton } from './components/Skeleton.jsx';
import Overview from './views/Overview.jsx';
import LossOfSale from './views/LossOfSale.jsx';
import LossDetail from './views/LossDetail.jsx';
import CategoryAnalysis from './views/CategoryAnalysis.jsx';
import WeeklyComparison from './views/WeeklyComparison.jsx';
import Audit from './views/Audit.jsx';
import Insights from './views/Insights.jsx';
import Ask from './views/Ask.jsx';

const VIEWS = {
  ov:    () => <Overview />,
  ls:    () => <LossOfSale />,
  lsd:   () => <LossDetail />,
  cat:   () => <CategoryAnalysis />,
  wkly:  () => <WeeklyComparison />,
  ask:   () => <Ask />,
  ins:   () => <Insights />,
  audit: () => <Audit />,
};

function Shell() {
  const [active, setActive] = useState('ov');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { status, error, isReady, disconnect } = useDashboard();

  useEffect(() => {
    if (status === STATUS.UNCONFIGURED) setSettingsOpen(true);
    if (status === STATUS.READY) setSettingsOpen(false);
  }, [status]);

  const isWaiting = status === STATUS.DISCOVERING || status === STATUS.LOADING;
  const isEmpty = status === STATUS.UNCONFIGURED;

  return (
    <div className="app-root">
      <TopBar onReconfigure={() => setSettingsOpen(true)} />
      <div className="page">
        {isReady ? <FilterBar /> : isWaiting ? <FilterBarSkeleton /> : <FilterBarPlaceholder />}
        <Tabs active={active} onChange={setActive} />
        <div className="page-body">
          {status === STATUS.ERROR && !isReady && <ErrorCard>{error || 'Unknown error'}</ErrorCard>}
          {isWaiting && <><MetricsSkeleton /><TableSkeleton rows={5} cols={7} /></>}
          {isEmpty && <EmptyState onOpen={() => setSettingsOpen(true)} />}
          {isReady && <div className="pane active">{VIEWS[active]()}</div>}
        </div>
      </div>

      {settingsOpen && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
          <div className="modal modal-narrow">
            <Setup onCancel={() => setSettingsOpen(false)} />
            {!isEmpty && (
              <div className="disconnect-row">
                <button className="btn-ghost" onClick={async () => { await disconnect(); setSettingsOpen(true); }}>
                  Disconnect & clear cache
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <Modal />
    </div>
  );
}

function FilterBarPlaceholder() {
  return <div className="filter-bar filter-bar-placeholder">Load data via ⚙ to enable filters</div>;
}

function EmptyState({ onOpen }) {
  return (
    <div className="empty-state">
      <div className="empty-emoji">📊</div>
      <div className="empty-title">No data yet</div>
      <div className="empty-hint">Click <strong>⚙</strong> in the top right to upload your Excel file or connect a Google Sheet.</div>
      <button className="btn-primary" onClick={onOpen}>Load data</button>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <Shell />
    </DashboardProvider>
  );
}
