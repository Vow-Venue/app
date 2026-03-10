const TABS = [
  { id: 'overview',       label: 'OVERVIEW' },
  { id: 'guests',         label: 'GUESTS' },
  { id: 'seating',        label: 'SEATING' },
  { id: 'tasks',          label: 'TASKS' },
  { id: 'vendors',        label: 'VENDORS' },
  { id: 'messaging',      label: 'MESSAGES' },
  { id: 'billing',        label: 'BILLING' },
  { id: 'collaborators',  label: 'TEAM' },
  { id: 'dayofcontacts',  label: 'DAY-OF' },
  { id: 'notes',          label: 'NOTES' },
]

export default function NavTabs({ activeTab, onTabChange, hiddenTabs = new Set() }) {
  return (
    <nav className="tabs">
      {TABS.filter(t => !hiddenTabs.has(t.id)).map(t => (
        <button
          key={t.id}
          className={`tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
