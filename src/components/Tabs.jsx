const TABS = [
  { id: 'ov',     label: 'Overview' },
  { id: 'offers', label: 'Offers' },
  { id: 'outlets',label: 'Outlets' },
  { id: 'family', label: 'Categories' },
  { id: 'free',   label: '🎁 Free Items' },
  { id: 'daily',  label: 'Daily' },
  { id: 'margin', label: 'Margin' },
  { id: 'ask',    label: '💬 Ask' },
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
