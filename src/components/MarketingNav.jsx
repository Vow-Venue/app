import { NavLink, Link } from 'react-router-dom'

export default function MarketingNav({ onSignIn, onStartFree }) {
  return (
    <nav className="marketing-nav">
      <Link to="/" className="marketing-nav-logo">
        <span className="logo-star">✦</span> Vow &amp; Venue
      </Link>

      <div className="marketing-nav-links">
        <NavLink to="/features" className={({ isActive }) => isActive ? 'active' : ''}>
          Features
        </NavLink>
        <NavLink to="/pricing" className={({ isActive }) => isActive ? 'active' : ''}>
          Pricing
        </NavLink>
      </div>

      <div className="marketing-nav-actions">
        <button className="btn btn-ghost marketing-nav-signin" onClick={onSignIn}>SIGN IN</button>
        <button className="btn-gold" onClick={onStartFree}>START FREE</button>
      </div>
    </nav>
  )
}
