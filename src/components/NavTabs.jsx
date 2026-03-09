const TABS = [
  { id: 'overview',       label: 'OVERVIEW' },
  { id: 'guests',         label: 'GUESTS' },
  { id: 'tasks',          label: 'TASKS' },
  { id: 'vendors',        label: 'VENDORS' },
  { id: 'messaging',      label: 'MESSAGES' },
  { id: 'billing',        label: 'BILLING' },
  { id: 'collaborators',  label: 'TEAM' },
  { id: 'dayofcontacts',  label: 'DAY-OF' },
  { id: 'notes',          label: 'NOTES' },
]

export default function NavTabs({ activeTab, onTabChange }) {
  return (
    <nav className="tabs">
      {TABS.map(t => (
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
