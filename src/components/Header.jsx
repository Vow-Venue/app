import { useState, useRef, useEffect } from 'react'
import NotificationDropdown from './NotificationDropdown'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

const weddingLabel = (w) => {
  if (w.partner1 && w.partner2) return `${w.partner1} & ${w.partner2}`
  return 'Untitled Wedding'
}

const getInitials = (session, profile) => {
  if (profile?.display_name) {
    return profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }
  const email = session?.user?.email || ''
  return email.slice(0, 2).toUpperCase()
}

export default function Header({
  session, wedding, isPro,
  myWeddings = [], activeWeddingId = null,
  onSelectWedding, onBackToDashboard,
  onSignIn, onSignOut, onHelp,
  profile, onUpdateProfile, onUploadAvatar, onDeleteAccount,
  profileOpen, setProfileOpen, deleteAccountOpen, setDeleteAccountOpen,
  notifications = [], onMarkRead, onMarkAllRead, onTabChange,
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    if (!switcherOpen && !menuOpen) return
    const handleClick = (e) => {
      if (switcherOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSwitcherOpen(false)
      }
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen, menuOpen])

  const badge = session && activeWeddingId && wedding?.partner1 && wedding?.partner2
    ? `${wedding.partner1.toUpperCase()} & ${wedding.partner2.toUpperCase()} · ${fmtDate(wedding.wedding_date)}`
    : session && !activeWeddingId
      ? (profile?.display_name ? `${profile.display_name.toUpperCase()}'S STUDIO` : 'MY STUDIO')
      : 'AMORÍ'

  const showSwitcher = session && activeWeddingId && myWeddings.length > 1

  return (
    <header className="header">
      <div className="logo"><span>✦</span> Amorí</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Wedding switcher or static badge */}
        {showSwitcher ? (
          <div className="wedding-switcher" ref={dropdownRef}>
            <button
              className="wedding-badge wedding-badge-clickable"
              onClick={() => setSwitcherOpen(!switcherOpen)}
            >
              {badge} <span className="switcher-caret">&#9662;</span>
            </button>
            {switcherOpen && (
              <div className="wedding-switcher-dropdown">
                {myWeddings.map(w => (
                  <button
                    key={w.id}
                    className={`switcher-option${w.id === activeWeddingId ? ' active' : ''}`}
                    onClick={() => {
                      if (w.id !== activeWeddingId) onSelectWedding(w.id)
                      setSwitcherOpen(false)
                    }}
                  >
                    <span className="switcher-option-name">{weddingLabel(w)}</span>
                    {w.wedding_date && (
                      <span className="switcher-option-date">{fmtDate(w.wedding_date)}</span>
                    )}
                  </button>
                ))}
                <div className="switcher-divider" />
                <button
                  className="switcher-option switcher-option-dashboard"
                  onClick={() => { onBackToDashboard(); setSwitcherOpen(false) }}
                >
                  MY WEDDINGS
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="wedding-badge">{badge}</div>
        )}

        {isPro && <span className="header-pro-badge">PRO</span>}

        {session && (
          <NotificationDropdown
            notifications={notifications}
            activeWeddingId={activeWeddingId}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onSelectWedding={onSelectWedding}
            onTabChange={onTabChange}
          />
        )}

        {/* Account menu or Sign In */}
        {session ? (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              title="Account"
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                letterSpacing: 0.5, overflow: 'hidden',
              }}
            >
              {!profile?.avatar_url && getInitials(session, profile)}
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 42, right: 0, minWidth: 200,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #eee', zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                    {profile?.display_name || session.user.email?.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{session.user.email}</div>
                </div>
                <button style={menuItemStyle} onClick={() => { setMenuOpen(false); setProfileOpen(true) }}>
                  Profile Settings
                </button>
                <button style={menuItemStyle} onClick={() => { setMenuOpen(false); onHelp?.() }}>
                  Help
                </button>
                <div style={{ borderTop: '1px solid #f0f0f0' }} />
                <button style={menuItemStyle} onClick={() => { setMenuOpen(false); onSignOut() }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}
            onClick={onSignIn}
          >
            SIGN IN
          </button>
        )}
      </div>

      {/* ── Profile Settings Modal ────────────────────────────────────── */}
      {profileOpen && (
        <ProfileSettingsModal
          session={session}
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onUpdateProfile={onUpdateProfile}
          onUploadAvatar={onUploadAvatar}
          onOpenDeleteAccount={() => { setProfileOpen(false); setDeleteAccountOpen(true) }}
        />
      )}

      {/* ── Delete Account Modal ──────────────────────────────────────── */}
      {deleteAccountOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteAccountOpen(false)}
          onConfirm={onDeleteAccount}
        />
      )}
    </header>
  )
}

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
  background: 'none', border: 'none', fontSize: 13, color: '#444',
  cursor: 'pointer', fontFamily: 'inherit',
}

// ── Profile Settings Modal ──────────────────────────────────────────────────
function ProfileSettingsModal({ session, profile, onClose, onUpdateProfile, onUploadAvatar, onOpenDeleteAccount }) {
  const [name, setName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleSave = async () => {
    setSaving(true)
    await onUpdateProfile(name.trim())
    setSaving(false)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (file) await onUploadAvatar(file)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Profile Settings</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
                background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'var(--blush)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'var(--deep)', border: '2px solid var(--gold)',
                overflow: 'hidden', flexShrink: 0,
              }}
              title="Click to upload photo"
            >
              {!profile?.avatar_url && (profile?.display_name || session?.user?.email || '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Click avatar to upload a photo</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>JPG, PNG. Max 2MB.</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {/* Display name */}
          <div className="form-group">
            <label>DISPLAY NAME</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="form-group">
            <label>EMAIL</label>
            <input type="email" value={session?.user?.email || ''} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          {/* Auth method note */}
          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 20 }}>
            Password changes are managed via magic link — request a new login link from the sign-in page.
          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
            <button
              onClick={onOpenDeleteAccount}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: '#c6282899', fontFamily: 'inherit',
              }}
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Account Modal ────────────────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm }) {
  const [step, setStep] = useState(1)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onConfirm()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: '#c62828' }}>Delete Account</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          {step === 1 ? (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#444', marginBottom: 16 }}>
                This will permanently delete your account and all data. Weddings you solely own will be deleted.
                Weddings shared with other planners will be preserved — only your membership will be removed.
              </p>
              <p style={{ fontSize: 13, color: '#c62828', fontWeight: 600, marginBottom: 20 }}>
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
                <button
                  className="btn"
                  style={{ background: '#c62828', color: '#fff', border: 'none' }}
                  onClick={() => setStep(2)}
                >
                  I UNDERSTAND, CONTINUE
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#444', marginBottom: 16 }}>
                Type <strong>DELETE</strong> below to confirm:
              </p>
              <div className="form-group">
                <input
                  type="text" value={typed} onChange={e => setTyped(e.target.value)}
                  placeholder="Type DELETE" autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
                <button
                  className="btn"
                  style={{ background: '#c62828', color: '#fff', border: 'none', opacity: typed === 'DELETE' ? 1 : 0.4 }}
                  disabled={typed !== 'DELETE' || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'DELETING...' : 'DELETE MY ACCOUNT'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
