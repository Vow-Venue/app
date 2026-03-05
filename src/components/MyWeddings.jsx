import { useState } from 'react'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

const ROLE_LABELS = {
  owner: 'OWNER',
  planner: 'PLANNER',
  family: 'FAMILY',
  vendor: 'VENDOR',
  viewer: 'VIEWER',
}

const FREE_WEDDING_LIMIT = 2

export default function MyWeddings({ weddings, userPlan, onSelectWedding, onCreateWedding, onUpgrade }) {
  const [creating, setCreating] = useState(false)

  const ownedCount = weddings.filter(w => w.myRole === 'owner').length
  const canCreate = userPlan === 'pro' || ownedCount < FREE_WEDDING_LIMIT

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    await onCreateWedding()
    setCreating(false)
  }

  return (
    <div className="my-weddings">
      <div className="my-weddings-header">
        <h1 className="section-title" style={{ marginBottom: 4 }}>My Weddings</h1>
        <p className="section-subtitle">
          {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
          {userPlan === 'pro' && <span className="plan-badge-pro">PRO</span>}
        </p>
      </div>

      <div className="weddings-grid">
        {weddings.map(w => (
          <button
            key={w.id}
            className="wedding-card"
            onClick={() => onSelectWedding(w.id)}
          >
            <div className="wedding-card-couple">
              {w.partner1 && w.partner2
                ? `${w.partner1} & ${w.partner2}`
                : 'Untitled Wedding'}
            </div>
            {w.wedding_date && (
              <div className="wedding-card-date">{fmtDate(w.wedding_date)}</div>
            )}
            {!w.wedding_date && !w.setup_complete && (
              <div className="wedding-card-date">SETUP INCOMPLETE</div>
            )}
            <span className={`wedding-card-role role-${w.myRole || 'viewer'}`}>
              {ROLE_LABELS[w.myRole] || 'MEMBER'}
            </span>
          </button>
        ))}

        {/* Create new wedding card */}
        {canCreate ? (
          <button
            className="wedding-card wedding-card-new"
            onClick={handleCreate}
            disabled={creating}
          >
            <div className="wedding-card-new-icon">+</div>
            <div className="wedding-card-new-label">
              {creating ? 'CREATING...' : 'CREATE NEW WEDDING'}
            </div>
          </button>
        ) : (
          <button
            className="wedding-card wedding-card-new wedding-card-upgrade"
            onClick={onUpgrade}
          >
            <div className="wedding-card-new-icon">✦</div>
            <div className="wedding-card-new-label">UPGRADE TO PRO</div>
            <div className="wedding-card-upgrade-text">
              Free plan allows {FREE_WEDDING_LIMIT} weddings.
              Upgrade for unlimited.
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
