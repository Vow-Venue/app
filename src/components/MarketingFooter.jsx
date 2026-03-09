import { Link } from 'react-router-dom'

export default function MarketingFooter({ onSignIn }) {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-brand">
          <span className="marketing-nav-logo" style={{ fontSize: 22 }}>
            <span className="logo-star">✦</span> Vow &amp; Venue
          </span>
          <p className="marketing-footer-tagline">
            Wedding planning software for professionals.
          </p>
        </div>

        <div className="marketing-footer-links">
          <div className="marketing-footer-col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="marketing-footer-col">
            <h4>Get Started</h4>
            <button onClick={onSignIn} className="marketing-footer-link-btn">Sign In</button>
          </div>
        </div>
      </div>

      <div className="marketing-footer-bottom">
        <span>&copy; {new Date().getFullYear()} Vow &amp; Venue. All rights reserved.</span>
      </div>
    </footer>
  )
}
