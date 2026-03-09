import { useState, useRef, useMemo } from 'react'
import { LayoutGrid, List, ChevronDown, ChevronUp, Phone, Mail, Camera } from 'lucide-react'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

const ROLE_LABELS = {
  owner: 'OWNER', planner: 'PLANNER', couple: 'COUPLE',
  family: 'FAMILY', vendor: 'VENDOR', viewer: 'VIEWER',
}

const VENDOR_ROLES = {
  photographer: 'Photographer', florist: 'Florist', caterer: 'Caterer',
  dj: 'DJ / Music', venue: 'Venue', hair_makeup: 'Hair & Makeup',
  transport: 'Transport', cake: 'Cake / Bakery', other: 'Other',
}

const DEFAULT_COVERS = [
  'linear-gradient(135deg, #3d2c2c 0%, #5a3e3e 50%, #8a6e5e 100%)',
  'linear-gradient(135deg, #2c3d3d 0%, #3e5a5a 50%, #5e8a7e 100%)',
  'linear-gradient(135deg, #3d2c3d 0%, #5a3e5a 50%, #8a6e8a 100%)',
  'linear-gradient(135deg, #2c2c3d 0%, #3e3e5a 50%, #6e6e8a 100%)',
]

const FREE_WEDDING_LIMIT = 2

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const diff = new Date(dateStr + 'T00:00:00') - new Date()
  return diff > 0 ? Math.ceil(diff / 86400000) : null
}

export default function OrgDashboard({
  weddings, userPlan, taskStats, sharedVendors, profile,
  onSelectWedding, onCreateWedding, onUpgrade, onUploadCover,
}) {
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('date')
  const [sharedOpen, setSharedOpen] = useState(false)
  const fileInputRefs = useRef({})

  const [recentOrder, setRecentOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_recent_weddings') || '[]') }
    catch { return [] }
  })

  const ownedCount = weddings.filter(w => w.myRole === 'owner').length
  const canCreate = userPlan === 'pro' || ownedCount < FREE_WEDDING_LIMIT
  const studioName = profile?.display_name
    ? `${profile.display_name}'s Studio`
    : 'My Studio'

  const totalGuests = weddings.reduce((s, w) => s + (w.guestCount || 0), 0)
  const totalTasks = Object.values(taskStats).reduce((s, t) => s + t.total, 0)
  const totalDone = Object.values(taskStats).reduce((s, t) => s + t.done, 0)

  const sortedWeddings = useMemo(() => {
    const sorted = [...weddings]
    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => {
          if (!a.wedding_date) return 1
          if (!b.wedding_date) return -1
          return new Date(a.wedding_date) - new Date(b.wedding_date)
        })
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = (a.partner1 || '') + (a.partner2 || '')
          const nameB = (b.partner1 || '') + (b.partner2 || '')
          return nameA.localeCompare(nameB)
        })
      case 'recent':
        return sorted.sort((a, b) => {
          const idxA = recentOrder.indexOf(a.id)
          const idxB = recentOrder.indexOf(b.id)
          if (idxA === -1 && idxB === -1) return 0
          if (idxA === -1) return 1
          if (idxB === -1) return -1
          return idxA - idxB
        })
      default:
        return sorted
    }
  }, [weddings, sortBy, recentOrder])

  const handleSelect = (wId) => {
    const updated = [wId, ...recentOrder.filter(id => id !== wId)].slice(0, 20)
    setRecentOrder(updated)
    localStorage.setItem('vv_recent_weddings', JSON.stringify(updated))
    onSelectWedding(wId)
  }

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="org-dashboard">
      {/* Dashboard header */}
      <div className="org-dashboard-header">
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>{studioName}</h1>
          <p className="section-subtitle">
            {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
            {' · '}{totalGuests} guest{totalGuests !== 1 ? 's' : ''}
            {totalTasks > 0 && ` · ${Math.round(totalDone / totalTasks * 100)}% tasks complete`}
          </p>
        </div>
        <div className="org-dashboard-controls">
          <div className="org-sort-group">
            <label className="org-sort-label">SORT</label>
            <select className="org-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date">By Date</option>
              <option value="name">By Name</option>
              <option value="recent">Recently Viewed</option>
            </select>
          </div>
          <div className="org-view-toggle">
            <button
              className={`org-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`org-view-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Shared Resources (collapsible) */}
      {sharedVendors.length > 0 && (
        <div className="org-shared-section">
          <button className="org-shared-toggle" onClick={() => setSharedOpen(!sharedOpen)}>
            <span>SHARED RESOURCES</span>
            {sharedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {sharedOpen && (
            <div className="org-shared-content">
              <div className="org-shared-grid">
                {sharedVendors.map((v, i) => (
                  <div key={i} className="org-shared-vendor-card">
                    <div className="org-shared-vendor-name">{v.name}</div>
                    <div className="org-shared-vendor-role">{VENDOR_ROLES[v.role] || v.role || 'Vendor'}</div>
                    <div className="org-shared-vendor-meta">
                      {v.phone && <span><Phone size={12} /> {v.phone}</span>}
                      {v.email && <span><Mail size={12} /> {v.email}</span>}
                    </div>
                    <div className="org-shared-vendor-count">
                      Used in {v.weddingCount} wedding{v.weddingCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="org-shared-placeholder">
                <span>Task Templates</span>
                <span className="org-coming-soon">COMING SOON</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wedding Events */}
      <div className={viewMode === 'grid' ? 'weddings-grid' : 'org-weddings-list'}>
        {sortedWeddings.map((w, i) => {
          const hasCover = !!w.cover_url
          const bgStyle = hasCover
            ? { backgroundImage: `url(${w.cover_url})` }
            : { background: DEFAULT_COVERS[i % DEFAULT_COVERS.length] }
          const stats = taskStats[w.id] || { total: 0, done: 0 }
          const taskPct = stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0
          const days = daysUntil(w.wedding_date)

          if (viewMode === 'list') {
            return (
              <button key={w.id} className="org-list-row" onClick={() => handleSelect(w.id)}>
                <div className="org-list-thumb" style={bgStyle} />
                <div className="org-list-info">
                  <div className="org-list-couple">
                    {w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled Wedding'}
                  </div>
                  <div className="org-list-date">
                    {w.wedding_date ? fmtDate(w.wedding_date) : 'NO DATE SET'}
                  </div>
                </div>
                <div className="org-list-stat">{days !== null ? `${days}d` : '—'}</div>
                <div className="org-list-stat">{w.guestCount || 0} guests</div>
                <div className="org-list-stat">
                  <span className="org-list-pct">{taskPct}%</span>
                </div>
                <span className={`wedding-card-role-inline role-${w.myRole || 'viewer'}`}>
                  {ROLE_LABELS[w.myRole] || 'MEMBER'}
                </span>
              </button>
            )
          }

          // Grid view
          return (
            <button key={w.id} className="wedding-card" onClick={() => handleSelect(w.id)}>
              <div className="wedding-card-arch" style={bgStyle}>
                <div className="wedding-card-arch-overlay" />
                {w.myRole === 'owner' && (
                  <>
                    <button
                      className="wedding-card-upload-btn"
                      onClick={(e) => handleCoverClick(e, w.id)}
                      title="Upload cover photo"
                    >
                      <Camera size={16} />
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
                <span className={`wedding-card-role role-${w.myRole || 'viewer'}`}>
                  {ROLE_LABELS[w.myRole] || 'MEMBER'}
                </span>
              </div>
              <div className="wedding-card-body">
                <div className="wedding-card-couple">
                  {w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled Wedding'}
                </div>
                <div className="wedding-card-meta">
                  {w.wedding_date ? (
                    <span className="wedding-card-date">{fmtDate(w.wedding_date)}</span>
                  ) : !w.setup_complete ? (
                    <span className="wedding-card-date">SETUP INCOMPLETE</span>
                  ) : null}
                  {days !== null && (
                    <span className="wedding-card-countdown">{days} days</span>
                  )}
                </div>
                <div className="wedding-card-stats">
                  <span>{w.guestCount || 0} guests</span>
                  <span className="wedding-card-task-bar">
                    <span className="wedding-card-task-fill" style={{ width: `${taskPct}%` }} />
                  </span>
                  <span className="wedding-card-task-pct">{taskPct}%</span>
                </div>
              </div>
            </button>
          )
        })}

        {/* Create new / upgrade card */}
        {viewMode === 'grid' && (
          canCreate ? (
            <button className="wedding-card wedding-card-new" onClick={handleCreate}>
              <div className="wedding-card-new-arch">
                <div className="wedding-card-new-icon">+</div>
              </div>
              <div className="wedding-card-body">
                <div className="wedding-card-new-label">NEW WEDDING</div>
              </div>
            </button>
          ) : (
            <button className="wedding-card wedding-card-new wedding-card-upgrade" onClick={onUpgrade}>
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
          )
        )}
      </div>

      {/* List view: new wedding button below */}
      {viewMode === 'list' && canCreate && (
        <button className="org-list-new-btn" onClick={handleCreate}>
          + NEW WEDDING
        </button>
      )}
    </div>
  )
}
