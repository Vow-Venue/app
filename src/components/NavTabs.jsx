const TABS = [
  { id: 'overview',       label: 'OVERVIEW',  tip: 'Wedding summary & countdown' },
  { id: 'guests',         label: 'GUESTS',    tip: 'Manage your guest list & RSVPs' },
  { id: 'seating',        label: 'SEATING',   tip: 'Design your floor plan & seat guests' },
  { id: 'tasks',          label: 'TASKS',     tip: 'Track your planning checklist' },
  { id: 'vendors',        label: 'VENDORS',   tip: 'Manage vendors & contacts' },
  { id: 'messaging',      label: 'MESSAGES',  tip: 'Chat with your team & couple' },
  { id: 'billing',        label: 'BILLING',   tip: 'Track payments & invoices' },
  { id: 'collaborators',  label: 'TEAM',      tip: 'Manage collaborators & planners' },
  { id: 'dayofcontacts',  label: 'DAY-OF',    tip: 'Build your wedding day timeline' },
  { id: 'notes',          label: 'NOTES',     tip: 'Private & shared notes' },
  { id: 'guidance',       label: 'GUIDANCE',  tip: 'Welcome packet for your couple' },
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
          <span className="tab-tooltip">{t.tip}</span>
        </button>
      ))}
    </nav>
  )
}
