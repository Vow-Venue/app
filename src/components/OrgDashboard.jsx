import { useState, useRef, useMemo } from 'react'
import {
  LayoutGrid, List, Phone, Mail, Camera,
  Pencil, Check, X, Plus, Trash2, Globe, Users, Download, FileText,
  Calendar, DollarSign, ClipboardList, UserPlus,
  Home, Heart, Settings, TrendingUp, Contact, Menu, ChevronRight,
} from 'lucide-react'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

const fmtCurrency = (n) => {
  if (!n) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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

const offsetLabel = (days) => {
  if (!days) return 'Wedding day'
  const abs = Math.abs(days)
  if (abs >= 365) return `${Math.round(abs / 30)} mo before`
  if (abs >= 30) return `${Math.round(abs / 30)} mo before`
  return `${abs}d before`
}

export default function OrgDashboard({
  weddings, userPlan, taskStats, sharedVendors, profile,
  teamMembers, revenue, taskTemplates, templateTasks,
  onSelectWedding, onCreateWedding, onUpgrade, onUploadCover,
  onUpdateStudioName, onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
  onAddTemplateTask, onUpdateTemplateTask, onDeleteTemplateTask,
  onImportTemplate, onSeedStarterTemplates, onCopyVendor, onArchiveWedding,
}) {
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('date')
  const fileInputRefs = useRef({})

  // Sidebar navigation
  const [activePage, setActivePage] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [weddingFilter, setWeddingFilter] = useState('active')

  // Archive menu
  const [menuOpenId, setMenuOpenId] = useState(null)

  // Studio name editing
  const [editingStudioName, setEditingStudioName] = useState(false)
  const [studioNameDraft, setStudioNameDraft] = useState('')

  // Template modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskOffset, setNewTaskOffset] = useState(-180)
  const [newTaskPriority, setNewTaskPriority] = useState('medium')

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importTemplateId, setImportTemplateId] = useState(null)
  const [importWeddingId, setImportWeddingId] = useState(null)
  const [importing, setImporting] = useState(false)

  // New wedding modal
  const [newWeddingOpen, setNewWeddingOpen] = useState(false)
  const [nwPartner1, setNwPartner1] = useState('')
  const [nwPartner2, setNwPartner2] = useState('')
  const [nwDate, setNwDate] = useState('')
  const [nwLoading, setNwLoading] = useState(false)

  // Invite placeholder modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  // Upgrade modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  // Vendor copy dropdown
  const [copyVendorIdx, setCopyVendorIdx] = useState(null)

  // New template name
  const [newTemplateName, setNewTemplateName] = useState('')
  const [creatingTemplate, setCreatingTemplate] = useState(false)

  const [recentOrder, setRecentOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_recent_weddings') || '[]') }
    catch { return [] }
  })

  const ownedCount = weddings.filter(w => w.myRole === 'owner').length
  const canCreate = userPlan === 'pro' || ownedCount < FREE_WEDDING_LIMIT

  const studioName = profile?.studio_name
    || (profile?.display_name ? `${profile.display_name}'s Studio` : 'My Studio')

  const totalGuests = weddings.reduce((s, w) => s + (w.guestCount || 0), 0)
  const totalTasks = Object.values(taskStats).reduce((s, t) => s + t.total, 0)
  const totalDone = Object.values(taskStats).reduce((s, t) => s + t.done, 0)

  const weddingsWithTasks = Object.values(taskStats).filter(s => s.total > 0)
  const avgCompletion = weddingsWithTasks.length > 0
    ? Math.round(weddingsWithTasks.reduce((s, t) => s + (t.done / t.total * 100), 0) / weddingsWithTasks.length)
    : 0

  const recentWeddings = useMemo(() => {
    return recentOrder
      .map(id => weddings.find(w => w.id === id))
      .filter(Boolean)
      .slice(0, 3)
  }, [recentOrder, weddings])

  const sortedWeddings = useMemo(() => {
    const filtered = weddings.filter(w =>
      weddingFilter === 'archived' ? w.archived === true : !w.archived
    )
    const sorted = [...filtered]
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
  }, [weddings, sortBy, recentOrder, weddingFilter])

  const handleSelect = (wId) => {
    const updated = [wId, ...recentOrder.filter(id => id !== wId)].slice(0, 20)
    setRecentOrder(updated)
    localStorage.setItem('vv_recent_weddings', JSON.stringify(updated))
    onSelectWedding(wId)
  }

  const handleCreate = () => {
    if (!canCreate) {
      setUpgradeModalOpen(true)
      return
    }
    setNewWeddingOpen(true)
  }

  const handleSubmitNewWedding = async (e) => {
    e.preventDefault()
    if (!nwPartner1.trim() || !nwPartner2.trim()) return
    setNwLoading(true)
    await onCreateWedding({
      partner1: nwPartner1.trim(),
      partner2: nwPartner2.trim(),
      weddingDate: nwDate || null,
    })
    setNwLoading(false)
    setNewWeddingOpen(false)
    setNwPartner1('')
    setNwPartner2('')
    setNwDate('')
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

  const handleSaveStudioName = () => {
    if (studioNameDraft.trim()) {
      onUpdateStudioName(studioNameDraft.trim())
    }
    setEditingStudioName(false)
  }

  const handleOpenTemplate = (tmpl) => {
    setActiveTemplate(tmpl)
    setTemplateModalOpen(true)
    setNewTaskTitle('')
    setNewTaskOffset(-180)
    setNewTaskPriority('medium')
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return
    setCreatingTemplate(true)
    const tmpl = await onCreateTemplate(newTemplateName.trim())
    setCreatingTemplate(false)
    setNewTemplateName('')
    if (tmpl) handleOpenTemplate(tmpl)
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !activeTemplate) return
    await onAddTemplateTask(activeTemplate.id, {
      title: newTaskTitle.trim(),
      offset_days: newTaskOffset,
      priority: newTaskPriority,
      assignee_role: 'planner',
    })
    setNewTaskTitle('')
  }

  const handleImport = async () => {
    if (!importTemplateId || !importWeddingId) return
    setImporting(true)
    const count = await onImportTemplate(importTemplateId, importWeddingId)
    setImporting(false)
    setImportModalOpen(false)
    if (count > 0) alert(`Imported ${count} tasks!`)
  }

  const handleCopyVendor = async (vendor, wId) => {
    const ok = await onCopyVendor(vendor, wId)
    setCopyVendorIdx(null)
    if (ok) alert(`${vendor.name} added to wedding!`)
  }

  const navigateTo = (page) => {
    setActivePage(page)
    setSidebarOpen(false)
  }

  // ── Shared: Wedding Cards ──────────────────────────────────────────────────

  const renderWeddingCards = () => (
    <>
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
              <div key={w.id} className={`org-list-row${w.archived ? ' archived' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button className="org-list-row-inner" onClick={() => handleSelect(w.id)} style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
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
                </button>
                {w.myRole === 'owner' && onArchiveWedding && (
                  <div style={{ position: 'relative' }}>
                    <button
                      className="wedding-card-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === w.id ? null : w.id) }}
                    >
                      ···
                    </button>
                    {menuOpenId === w.id && (
                      <>
                        <div className="wedding-card-menu-backdrop" onClick={() => setMenuOpenId(null)} />
                        <div className="wedding-card-menu">
                          <button onClick={() => { onArchiveWedding(w.id, !w.archived); setMenuOpenId(null) }}>
                            {w.archived ? 'Unarchive Wedding' : 'Archive Wedding'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div
              key={w.id}
              className={`wedding-card${w.archived ? ' archived' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(w.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelect(w.id) }}
            >
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
                      onChange={(e) => { e.stopPropagation(); handleCoverChange(e, w.id) }}
                    />
                  </>
                )}
              </div>
              <div className="wedding-card-body">
                {w.myRole === 'owner' && onArchiveWedding && (
                  <div style={{ position: 'relative', float: 'right' }}>
                    <button
                      className="wedding-card-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === w.id ? null : w.id) }}
                    >
                      ···
                    </button>
                    {menuOpenId === w.id && (
                      <>
                        <div className="wedding-card-menu-backdrop" onClick={() => setMenuOpenId(null)} />
                        <div className="wedding-card-menu">
                          <button onClick={(e) => { e.stopPropagation(); onArchiveWedding(w.id, !w.archived); setMenuOpenId(null) }}>
                            {w.archived ? 'Unarchive Wedding' : 'Archive Wedding'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
            </div>
          )
        })}

        {viewMode === 'grid' && weddingFilter !== 'archived' && (
          <button className="wedding-card wedding-card-new" onClick={handleCreate}>
            <div className="wedding-card-new-arch">
              <div className="wedding-card-new-icon">+</div>
            </div>
            <div className="wedding-card-body">
              <div className="wedding-card-new-label">NEW WEDDING</div>
            </div>
          </button>
        )}
      </div>

      {viewMode === 'list' && weddingFilter !== 'archived' && (
        <button className="org-list-new-btn" onClick={handleCreate}>
          + NEW WEDDING
        </button>
      )}
    </>
  )

  // ── Shared: Sort & View Controls ───────────────────────────────────────────

  const renderSortControls = () => (
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
        <button className={`org-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
          <LayoutGrid size={16} />
        </button>
        <button className={`org-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List view">
          <List size={16} />
        </button>
      </div>
    </div>
  )

  // ── Page Renderer ──────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <>
            {/* Dashboard Header */}
            <div className="org-dashboard-header">
              <div>
                {editingStudioName ? (
                  <div className="org-studio-edit">
                    <input
                      className="org-studio-input"
                      value={studioNameDraft}
                      onChange={e => setStudioNameDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveStudioName(); if (e.key === 'Escape') setEditingStudioName(false) }}
                      autoFocus
                    />
                    <button className="org-studio-save" onClick={handleSaveStudioName}><Check size={16} /></button>
                    <button className="org-studio-cancel" onClick={() => setEditingStudioName(false)}><X size={16} /></button>
                  </div>
                ) : (
                  <h1
                    className="section-title org-studio-name"
                    style={{ marginBottom: 4, cursor: 'pointer' }}
                    onClick={() => { setEditingStudioName(true); setStudioNameDraft(studioName) }}
                  >
                    {studioName}
                    <Pencil size={14} className="org-studio-pencil" />
                  </h1>
                )}
                <p className="section-subtitle">
                  {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
                  {' · '}{totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                  {totalTasks > 0 && ` · ${Math.round(totalDone / totalTasks * 100)}% tasks complete`}
                </p>
              </div>
              {renderSortControls()}
            </div>

            {/* Quick Actions */}
            <div className="org-quick-actions">
              <button className="org-quick-btn" onClick={handleCreate}>
                <Plus size={16} /> New Wedding
              </button>
              <button className="org-quick-btn" onClick={() => setInviteModalOpen(true)}>
                <UserPlus size={16} /> Invite Planner
              </button>
              <button className="org-quick-btn" onClick={() => setImportModalOpen(true)} disabled={taskTemplates.length === 0}>
                <Download size={16} /> Import Template
              </button>
            </div>

            {/* Recently Viewed */}
            {recentWeddings.length > 0 && (
              <div className="org-recent-section">
                <div className="org-section-label">RECENTLY VIEWED</div>
                <div className="org-recent-row">
                  {recentWeddings.map(w => {
                    const stats = taskStats[w.id] || { total: 0, done: 0 }
                    const pct = stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0
                    return (
                      <button key={w.id} className="org-recent-card" onClick={() => handleSelect(w.id)}>
                        <div className="org-recent-couple">
                          {w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled'}
                        </div>
                        <div className="org-recent-meta">
                          {w.guestCount || 0} guests · {pct}% done
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats Bar */}
            <div className="org-stats-bar">
              <div className="org-stat-card">
                <Calendar size={18} className="org-stat-icon" />
                <div className="org-stat-value">{weddings.length}</div>
                <div className="org-stat-label">Active Weddings</div>
              </div>
              <div className="org-stat-card">
                <Users size={18} className="org-stat-icon" />
                <div className="org-stat-value">{totalGuests}</div>
                <div className="org-stat-label">Total Guests</div>
              </div>
              <div className="org-stat-card">
                <ClipboardList size={18} className="org-stat-icon" />
                <div className="org-stat-value">{avgCompletion}%</div>
                <div className="org-stat-label">Avg Completion</div>
              </div>
              <div className="org-stat-card">
                <DollarSign size={18} className="org-stat-icon" />
                <div className="org-stat-value">{fmtCurrency(revenue)}</div>
                <div className="org-stat-label">Revenue Tracked</div>
              </div>
            </div>

            {/* Wedding Cards */}
            {renderWeddingCards()}
          </>
        )

      case 'weddings':
        return (
          <>
            <div className="org-dashboard-header">
              <div>
                <h1 className="section-title" style={{ marginBottom: 4 }}>Weddings</h1>
                <p className="section-subtitle">
                  {sortedWeddings.length} wedding{sortedWeddings.length !== 1 ? 's' : ''}
                </p>
              </div>
              {renderSortControls()}
            </div>

            <div className="org-wedding-filter-tabs">
              <button
                className={`org-filter-tab${weddingFilter === 'active' ? ' active' : ''}`}
                onClick={() => setWeddingFilter('active')}
              >
                Active ({weddings.filter(w => !w.archived).length})
              </button>
              <button
                className={`org-filter-tab${weddingFilter === 'archived' ? ' active' : ''}`}
                onClick={() => setWeddingFilter('archived')}
              >
                Archived ({weddings.filter(w => w.archived === true).length})
              </button>
            </div>

            {renderWeddingCards()}
          </>
        )

      case 'team':
        return (
          <>
            <div className="org-dashboard-header">
              <div>
                <h1 className="section-title" style={{ marginBottom: 4 }}>Team Members</h1>
                <p className="section-subtitle">
                  Manage who has access to your studio
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setInviteModalOpen(true)}>
                <UserPlus size={16} /> Invite Planner
              </button>
            </div>

            {teamMembers.length > 1 ? (
              <div className="org-team-grid">
                {teamMembers.map(m => (
                  <div key={m.userId} className="org-team-card">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="org-team-avatar" />
                    ) : (
                      <div className="org-team-initials">
                        {(m.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="org-team-info">
                      <div className="org-team-name">{m.displayName || 'Unknown'}</div>
                      <span className={`wedding-card-role-inline role-${m.role}`}>
                        {ROLE_LABELS[m.role] || 'MEMBER'}
                      </span>
                      <div className="org-team-meta">
                        {m.weddingCount} wedding{m.weddingCount !== 1 ? 's' : ''}
                        {m.email && <> &middot; {m.email}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="org-team-empty">
                <Users size={40} strokeWidth={1.2} />
                <h3>No co-planners yet</h3>
                <p>Invite another planner to collaborate on weddings together. Both planners need an active Pro subscription to share access.</p>
                <button className="btn btn-primary" onClick={() => setInviteModalOpen(true)}>
                  <UserPlus size={16} /> Invite Planner
                </button>
              </div>
            )}
          </>
        )

      case 'resources':
        return (
          <>
            <div className="org-dashboard-header">
              <div>
                <h1 className="section-title" style={{ marginBottom: 4 }}>Shared Resources</h1>
                <p className="section-subtitle">
                  Vendors and task templates shared across weddings
                </p>
              </div>
            </div>

            {/* Shared Vendors */}
            {sharedVendors.length > 0 && (
              <>
                <div className="org-section-label" style={{ marginBottom: 12 }}>VENDOR CONTACTS</div>
                <div className="org-shared-grid">
                  {sharedVendors.map((v, i) => (
                    <div key={i} className="org-shared-vendor-card">
                      <div className="org-shared-vendor-name">{v.name}</div>
                      <div className="org-shared-vendor-role">{VENDOR_ROLES[v.role] || v.role || 'Vendor'}</div>
                      <div className="org-shared-vendor-meta">
                        {v.phone && <span><Phone size={12} /> {v.phone}</span>}
                        {v.email && <span><Mail size={12} /> {v.email}</span>}
                        {v.website && <span><Globe size={12} /> {v.website}</span>}
                      </div>
                      {v.weddingNames && (
                        <div className="org-shared-vendor-weddings">
                          {v.weddingNames.join(', ')}
                        </div>
                      )}
                      <div className="org-shared-vendor-actions">
                        <div className="org-shared-vendor-count">
                          Used in {v.weddingCount} wedding{v.weddingCount !== 1 ? 's' : ''}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <button
                            className="org-vendor-copy-btn"
                            onClick={() => setCopyVendorIdx(copyVendorIdx === i ? null : i)}
                          >
                            <Plus size={12} /> Add to Wedding
                          </button>
                          {copyVendorIdx === i && (
                            <div className="org-vendor-copy-dropdown">
                              {weddings.map(w => (
                                <button
                                  key={w.id}
                                  className="org-vendor-copy-option"
                                  onClick={() => handleCopyVendor(v, w.id)}
                                >
                                  {w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Task Templates */}
            <div className="org-templates-section" style={{ marginTop: sharedVendors.length > 0 ? 32 : 0 }}>
              <div className="org-section-label" style={{ marginBottom: 8 }}>TASK TEMPLATES</div>
              {taskTemplates.length === 0 ? (
                <div className="org-templates-empty">
                  <p>No templates yet. Create one or load the starter checklist.</p>
                  <button className="org-quick-btn" onClick={onSeedStarterTemplates}>
                    <FileText size={14} /> Load Starter Templates
                  </button>
                </div>
              ) : (
                <div className="org-templates-list">
                  {taskTemplates.map(tmpl => {
                    const tasks = templateTasks[tmpl.id] || []
                    return (
                      <button key={tmpl.id} className="org-template-row" onClick={() => handleOpenTemplate(tmpl)}>
                        <FileText size={14} />
                        <span className="org-template-name">{tmpl.name}</span>
                        <span className="org-template-count">{tasks.length} tasks</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="org-tmpl-create-row">
                <input
                  className="org-tmpl-create-input"
                  placeholder="New template name..."
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateTemplate() }}
                />
                <button
                  className="org-quick-btn"
                  onClick={handleCreateTemplate}
                  disabled={creatingTemplate || !newTemplateName.trim()}
                >
                  <Plus size={14} /> Create
                </button>
              </div>
            </div>
          </>
        )

      case 'settings':
        return (
          <>
            <div className="org-dashboard-header">
              <div>
                <h1 className="section-title" style={{ marginBottom: 4 }}>Settings</h1>
                <p className="section-subtitle">Studio configuration</p>
              </div>
            </div>
            <div style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                Studio settings are coming soon. You can edit your studio name by clicking it on the Studio Home page.
              </p>
            </div>
          </>
        )

      default:
        return null
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="org-dashboard-layout">
      {/* Mobile hamburger */}
      <button
        className="org-sidebar-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <Menu size={22} />
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="org-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <nav className={`org-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="org-sidebar-brand">{studioName}</div>

        <div className="org-sidebar-nav">
          <button
            className={`org-sidebar-item${activePage === 'home' ? ' active' : ''}`}
            onClick={() => navigateTo('home')}
          >
            <Home size={16} />
            <span>Studio Home</span>
          </button>

          <button
            className={`org-sidebar-item${activePage === 'weddings' ? ' active' : ''}`}
            onClick={() => navigateTo('weddings')}
          >
            <Heart size={16} />
            <span>Weddings</span>
          </button>
          {activePage === 'weddings' && (
            <div className="org-sidebar-subitems">
              <button
                className={`org-sidebar-subitem${weddingFilter === 'active' ? ' active' : ''}`}
                onClick={() => setWeddingFilter('active')}
              >
                <ChevronRight size={12} /> Active
              </button>
              <button
                className={`org-sidebar-subitem${weddingFilter === 'archived' ? ' active' : ''}`}
                onClick={() => setWeddingFilter('archived')}
              >
                <ChevronRight size={12} /> Archived
              </button>
            </div>
          )}

          <button
            className={`org-sidebar-item${activePage === 'team' ? ' active' : ''}`}
            onClick={() => navigateTo('team')}
          >
            <Users size={16} />
            <span>Team Members</span>
          </button>

          <button
            className={`org-sidebar-item${activePage === 'resources' ? ' active' : ''}`}
            onClick={() => navigateTo('resources')}
          >
            <FileText size={16} />
            <span>Shared Resources</span>
          </button>

          <div className="org-sidebar-item disabled">
            <TrendingUp size={16} />
            <span>Sales</span>
            <span className="org-sidebar-soon-badge">SOON</span>
          </div>
          <div className="org-sidebar-item disabled">
            <Calendar size={16} />
            <span>Calendar</span>
            <span className="org-sidebar-soon-badge">SOON</span>
          </div>
          <div className="org-sidebar-item disabled">
            <Contact size={16} />
            <span>Contacts</span>
            <span className="org-sidebar-soon-badge">SOON</span>
          </div>

          <div className="org-sidebar-divider" />

          <button
            className={`org-sidebar-item${activePage === 'settings' ? ' active' : ''}`}
            onClick={() => navigateTo('settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="org-dashboard-main">
        {renderPage()}
      </div>

      {/* ── Template Editor Modal ──────────────────────────────────────────── */}
      {templateModalOpen && activeTemplate && (
        <div className="modal-backdrop" onClick={() => setTemplateModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{activeTemplate.name}</div>
              <button className="modal-close" onClick={() => setTemplateModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '16px 24px 24px', maxHeight: 500, overflowY: 'auto' }}>
              {(templateTasks[activeTemplate.id] || []).length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>No tasks in this template yet.</p>
              ) : (
                <div className="org-tmpl-task-list">
                  {(templateTasks[activeTemplate.id] || []).map(t => (
                    <div key={t.id} className="org-tmpl-task-row">
                      <div className="org-tmpl-task-title">{t.title}</div>
                      <div className="org-tmpl-task-meta">
                        <span className="org-tmpl-task-offset">{offsetLabel(t.offset_days)}</span>
                        <span className={`org-tmpl-task-priority priority-${t.priority}`}>{t.priority}</span>
                      </div>
                      <button
                        className="org-tmpl-task-delete"
                        onClick={() => onDeleteTemplateTask(t.id, activeTemplate.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="org-tmpl-add-form">
                <input
                  className="org-tmpl-add-input"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
                />
                <select
                  className="org-tmpl-add-select"
                  value={newTaskOffset}
                  onChange={e => setNewTaskOffset(Number(e.target.value))}
                >
                  <option value={-365}>12+ mo before</option>
                  <option value={-300}>9-12 mo before</option>
                  <option value={-210}>6-9 mo before</option>
                  <option value={-120}>3-6 mo before</option>
                  <option value={-45}>1-3 mo before</option>
                  <option value={-7}>Week of</option>
                  <option value={0}>Wedding day</option>
                </select>
                <select
                  className="org-tmpl-add-select"
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button className="org-quick-btn" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="org-tmpl-bottom-actions">
                <button
                  className="org-quick-btn"
                  onClick={() => { setImportTemplateId(activeTemplate.id); setTemplateModalOpen(false); setImportModalOpen(true) }}
                  disabled={(templateTasks[activeTemplate.id] || []).length === 0}
                >
                  <Download size={14} /> Import to Wedding
                </button>
                <button
                  className="btn-ghost-danger"
                  onClick={() => { onDeleteTemplate(activeTemplate.id); setTemplateModalOpen(false) }}
                >
                  <Trash2 size={14} /> Delete Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ───────────────────────────────────────────────────── */}
      {importModalOpen && (
        <div className="modal-backdrop" onClick={() => setImportModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Template to Wedding</div>
              <button className="modal-close" onClick={() => setImportModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              <label className="org-import-label">Template</label>
              <select
                className="org-import-select"
                value={importTemplateId || ''}
                onChange={e => setImportTemplateId(e.target.value)}
              >
                <option value="">Select template...</option>
                {taskTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(templateTasks[t.id] || []).length} tasks)
                  </option>
                ))}
              </select>

              <label className="org-import-label" style={{ marginTop: 16 }}>Wedding</label>
              <select
                className="org-import-select"
                value={importWeddingId || ''}
                onChange={e => setImportWeddingId(e.target.value)}
              >
                <option value="">Select wedding...</option>
                {weddings.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled'}
                    {w.wedding_date ? ` (${fmtDate(w.wedding_date)})` : ''}
                  </option>
                ))}
              </select>

              {importTemplateId && importWeddingId && (
                <div className="org-import-preview">
                  Will import {(templateTasks[importTemplateId] || []).length} tasks
                  {weddings.find(w => w.id === importWeddingId)?.wedding_date
                    ? ' with calculated due dates'
                    : ' (no due dates — wedding has no date set)'}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleImport}
                disabled={!importTemplateId || !importWeddingId || importing}
              >
                {importing ? 'Importing...' : `Import ${(templateTasks[importTemplateId] || []).length} Tasks`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Wedding Modal ──────────────────────────────────────────────── */}
      {newWeddingOpen && (
        <div className="modal-backdrop" onClick={() => setNewWeddingOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Wedding</div>
              <button className="modal-close" onClick={() => setNewWeddingOpen(false)}>×</button>
            </div>
            <form className="org-new-wedding-form" onSubmit={handleSubmitNewWedding}>
              <label className="org-import-label">Partner 1</label>
              <input
                className="org-import-select"
                type="text"
                value={nwPartner1}
                onChange={e => setNwPartner1(e.target.value)}
                placeholder="First partner's name"
                autoFocus
                required
              />
              <label className="org-import-label" style={{ marginTop: 14 }}>Partner 2</label>
              <input
                className="org-import-select"
                type="text"
                value={nwPartner2}
                onChange={e => setNwPartner2(e.target.value)}
                placeholder="Second partner's name"
                required
              />
              <label className="org-import-label" style={{ marginTop: 14 }}>
                Wedding Date <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                className="org-import-select"
                type="date"
                value={nwDate}
                onChange={e => setNwDate(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 20 }}
                disabled={nwLoading || !nwPartner1.trim() || !nwPartner2.trim()}
              >
                {nwLoading ? 'Creating...' : 'CREATE WEDDING'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ────────────────────────────────────────────────── */}
      {upgradeModalOpen && (
        <div className="modal-backdrop" onClick={() => setUpgradeModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Upgrade to Pro</div>
              <button className="modal-close" onClick={() => setUpgradeModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: 'var(--deep)', marginBottom: 8 }}>
                You've reached the 2-wedding limit on the Free plan.
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                Upgrade to Pro for unlimited weddings, priority support, and more.
              </p>
              <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setUpgradeModalOpen(false); onUpgrade() }}>
                UPGRADE TO PRO · $39/MO
              </button>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setUpgradeModalOpen(false)}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Planner Modal ───────────────────────────────────────────── */}
      {inviteModalOpen && (
        <div className="modal-backdrop" onClick={() => setInviteModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Invite a Planner</div>
              <button className="modal-close" onClick={() => setInviteModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <div className="org-section-label" style={{ marginBottom: 8 }}>PER-WEDDING CO-PLANNER</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  To invite a co-planner to a specific wedding, open that wedding and go to the
                  <strong> Team</strong> tab. You can invite them with an email link.
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Available on Free + Pro plans.
                </p>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />
              <div>
                <div className="org-section-label" style={{ marginBottom: 8 }}>
                  ORG-LEVEL PLANNER SEATS
                  <span className="org-coming-soon" style={{ marginLeft: 8 }}>COMING SOON</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Org-level planner seats will let you invite planners to your entire organization
                  with access to all weddings. Pro plan only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
