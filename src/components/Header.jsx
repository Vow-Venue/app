import { useState, useRef, useEffect } from 'react'

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

export default function Header({
  session, wedding,
  myWeddings = [], activeWeddingId = null,
  onSelectWedding, onBackToDashboard,
  onSignIn, onSignOut,
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!switcherOpen) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen])

  const badge = session && wedding && wedding.partner1 && wedding.partner2
    ? `${wedding.partner1.toUpperCase()} & ${wedding.partner2.toUpperCase()} · ${fmtDate(wedding.wedding_date)}`
    : 'VOW & VENUE'

  const showSwitcher = session && activeWeddingId && myWeddings.length > 1

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Back arrow when inside a wedding with multiple weddings */}
        {showSwitcher && (
          <button
            className="header-back-btn"
            onClick={onBackToDashboard}
            title="Back to My Weddings"
          >
            &larr;
          </button>
        )}
        <div className="logo"><span>✦</span> Vow &amp; Venue</div>
      </div>

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

        <button
          className="btn btn-ghost"
          style={{ color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}
          onClick={session ? onSignOut : onSignIn}
        >
          {session ? 'SIGN OUT' : 'SIGN IN'}
        </button>
      </div>
    </header>
  )
}
