import { Link } from 'react-router-dom'

export default function MarketingFooter({ onSignIn }) {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-brand">
          <span className="marketing-nav-logo" style={{ fontSize: 22 }}>
            <span className="logo-star">✦</span> Amorí
          </span>
          <p className="marketing-footer-tagline">
            Wedding planning software for professionals.
          </p>
          <div className="marketing-footer-social">
            <a href="https://instagram.com/amorisuite" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://pinterest.com/amorisuite" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.425 1.808-2.425.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.806 1.48 1.806 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.282a.3.3 0 01.069.288l-.278 1.133c-.044.183-.146.222-.337.134-1.254-.584-2.038-2.416-2.038-3.89 0-3.164 2.3-6.072 6.63-6.072 3.48 0 6.186 2.48 6.186 5.79 0 3.457-2.18 6.24-5.207 6.24-1.017 0-1.974-.528-2.301-1.154l-.626 2.386c-.226.872-.836 1.964-1.244 2.628.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            </a>
            <a href="https://x.com/amorisuite" target="_blank" rel="noopener noreferrer" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://tiktok.com/@amorisuite" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V12.7a8.19 8.19 0 005.58 2.17V11.4a4.83 4.83 0 01-3.77-1.82V6.69h3.77z"/></svg>
            </a>
          </div>
        </div>

        <div className="marketing-footer-links">
          <div className="marketing-footer-col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="marketing-footer-col">
            <h4>Support</h4>
            <Link to="/support">Contact Us</Link>
            <button onClick={onSignIn} className="marketing-footer-link-btn">Sign In</button>
          </div>
          <div className="marketing-footer-col">
            <h4>Company</h4>
            <a href="https://instagram.com/amorisuite" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://pinterest.com/amorisuite" target="_blank" rel="noopener noreferrer">Pinterest</a>
            <a href="https://tiktok.com/@amorisuite" target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </div>

      <div className="marketing-footer-bottom">
        <span>&copy; {new Date().getFullYear()} Amorí. All rights reserved.</span>
      </div>
    </footer>
  )
}
