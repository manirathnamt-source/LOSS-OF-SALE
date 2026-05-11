const TABS = [
  { id: 'ov',    label: 'Overview' },
  { id: 'ls',    label: 'Loss of Sale' },
  { id: 'lsd',   label: 'Loss Detail' },
  { id: 'cat',   label: 'Category Analysis' },
  { id: 'wkly',  label: 'Weekly Comparison' },
  { id: 'ask',   label: '💬 Ask' },
  { id: 'ins',   label: '💎 Insights' },
  { id: 'audit', label: 'Audit' },
];

export default function Tabs({ active, onChange }) {
  return (
    <div className="tabs">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`tab-btn${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >{t.label}</button>
      ))}
    </div>
  );
}

export { TABS };
