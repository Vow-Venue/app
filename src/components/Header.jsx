const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase()
}

export default function Header({ session, wedding, onSignIn, onSignOut }) {
  const badge = session && wedding
    ? `${wedding.partner1.toUpperCase()} & ${wedding.partner2.toUpperCase()} · ${fmtDate(wedding.wedding_date)}`
    : 'VOW & VENUE'

  return (
    <header className="header">
      <div className="logo"><span>✦</span> Vow &amp; Venue</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="wedding-badge">{badge}</div>
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
