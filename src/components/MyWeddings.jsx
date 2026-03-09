import { useRef } from 'react'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

const ROLE_LABELS = {
  owner: 'OWNER',
  planner: 'PLANNER',
  couple: 'COUPLE',
  family: 'FAMILY',
  vendor: 'VENDOR',
  viewer: 'VIEWER',
}

const DEFAULT_COVERS = [
  'linear-gradient(135deg, #3d2c2c 0%, #5a3e3e 50%, #8a6e5e 100%)',
  'linear-gradient(135deg, #2c3d3d 0%, #3e5a5a 50%, #5e8a7e 100%)',
  'linear-gradient(135deg, #3d2c3d 0%, #5a3e5a 50%, #8a6e8a 100%)',
  'linear-gradient(135deg, #2c2c3d 0%, #3e3e5a 50%, #6e6e8a 100%)',
]

const FREE_WEDDING_LIMIT = 2

export default function MyWeddings({ weddings, userPlan, onSelectWedding, onCreateWedding, onUpgrade, onUploadCover }) {
  const fileInputRefs = useRef({})

  const ownedCount = weddings.filter(w => w.myRole === 'owner').length
  const canCreate = userPlan === 'pro' || ownedCount < FREE_WEDDING_LIMIT

  const handleCreate = async () => {
    if (!canCreate) return
    await onCreateWedding()
  }

  const handleCoverClick = (e, wId) => {
    e.stopPropagation()
    fileInputRefs.current[wId]?.click()
  }

  const handleCoverChange = (e, wId) => {
    const file = e.target.files?.[0]
    if (!file) return
    onUploadCover(wId, file)
    e.target.value = ''
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
        {weddings.map((w, i) => {
          const hasCover = !!w.cover_url
          const bgStyle = hasCover
            ? { backgroundImage: `url(${w.cover_url})` }
            : { background: DEFAULT_COVERS[i % DEFAULT_COVERS.length] }

          return (
            <button
              key={w.id}
              className="wedding-card"
              onClick={() => onSelectWedding(w.id)}
            >
              {/* Arch photo area */}
              <div className="wedding-card-arch" style={bgStyle}>
                <div className="wedding-card-arch-overlay" />

                {/* Upload button */}
                {w.myRole === 'owner' && (
                  <>
                    <button
                      className="wedding-card-upload-btn"
                      onClick={(e) => handleCoverClick(e, w.id)}
                      title="Upload cover photo"
                    >
                      📷
                    </button>
                    <input
                      ref={el => { fileInputRefs.current[w.id] = el }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleCoverChange(e, w.id)}
                    />
                  </>
                )}

                {/* Role badge floating on photo */}
                <span className={`wedding-card-role role-${w.myRole || 'viewer'}`}>
                  {ROLE_LABELS[w.myRole] || 'MEMBER'}
                </span>
              </div>

              {/* Text content below arch */}
              <div className="wedding-card-body">
                <div className="wedding-card-couple">
                  {w.partner1 && w.partner2
                    ? `${w.partner1} & ${w.partner2}`
                    : 'Untitled Wedding'}
                </div>
                <div className="wedding-card-meta">
                  {w.wedding_date ? (
                    <span className="wedding-card-date">{fmtDate(w.wedding_date)}</span>
                  ) : !w.setup_complete ? (
                    <span className="wedding-card-date">SETUP INCOMPLETE</span>
                  ) : null}
                  {w.guestCount > 0 && (
                    <span className="wedding-card-guests">
                      {w.guestCount} guest{w.guestCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {/* Create new wedding card */}
        {canCreate ? (
          <button
            className="wedding-card wedding-card-new"
            onClick={handleCreate}
          >
            <div className="wedding-card-new-arch">
              <div className="wedding-card-new-icon">+</div>
            </div>
            <div className="wedding-card-body">
              <div className="wedding-card-new-label">NEW WEDDING</div>
            </div>
          </button>
        ) : (
          <button
            className="wedding-card wedding-card-new wedding-card-upgrade"
            onClick={onUpgrade}
          >
            <div className="wedding-card-new-arch">
              <div className="wedding-card-new-icon">✦</div>
            </div>
            <div className="wedding-card-body">
              <div className="wedding-card-new-label">UPGRADE TO PRO</div>
              <div className="wedding-card-upgrade-text">
                Free plan allows {FREE_WEDDING_LIMIT} weddings. Upgrade for unlimited.
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
