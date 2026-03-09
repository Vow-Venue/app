import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const PRICING_FAQ = [
  { q: 'Can I switch plans anytime?', a: 'Yes. Upgrade to Pro whenever you need more weddings, or stay on the free plan as long as you like. No pressure, no lock-in.' },
  { q: 'What counts as a seat?', a: 'A seat is one user account. Each person who logs into Vow & Venue and actively uses the platform counts as one seat. Collaborators you invite count as seats on the Pro plan.' },
  { q: 'Is there a contract?', a: 'No contracts. Pro is billed monthly and you can cancel anytime. Your data stays available even after downgrading.' },
  { q: 'What happens if I downgrade?', a: 'You keep access to all your data. If you have more than 2 weddings, you\'ll be able to view them all but won\'t be able to create new ones until you\'re back under the limit.' },
  { q: 'Do I lose data if I cancel Pro?', a: 'Never. Your weddings, guests, vendors, and everything else stays exactly as you left it. You just won\'t be able to create more than 2 weddings on the free plan.' },
]

const COMPARISON_ROWS = [
  { feature: 'Guest RSVP Tracking', vv: true, spreadsheet: 'Manual', generic: false },
  { feature: 'Interactive Seating Chart', vv: true, spreadsheet: false, generic: false },
  { feature: 'Team Messaging', vv: true, spreadsheet: false, generic: true },
  { feature: 'Vendor Payment Tracking', vv: true, spreadsheet: 'Manual', generic: false },
  { feature: 'Role-Based Access', vv: true, spreadsheet: false, generic: true },
  { feature: 'Wedding-Specific Features', vv: true, spreadsheet: false, generic: false },
  { feature: 'CSV Import/Export', vv: true, spreadsheet: true, generic: true },
  { feature: 'Magic Link Invites', vv: true, spreadsheet: false, generic: false },
  { feature: 'Price', vv: 'Free', spreadsheet: 'Free', generic: '$10–50/mo' },
]

function CellValue({ val }) {
  if (val === true) return <span className="comparison-yes">✓</span>
  if (val === false) return <span className="comparison-no">✗</span>
  return <span>{val}</span>
}

export default function PricingPage() {
  const { onStartFree } = useOutletContext()
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="marketing-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-hero-badge">PRICING</div>
        <h1 className="marketing-hero-title">Simple, transparent pricing</h1>
        <p className="marketing-hero-subtitle">
          Start free. Upgrade when you&apos;re ready. No surprises.
        </p>
      </section>

      {/* ── Pricing Cards ────────────────────────────────── */}
      <section className="marketing-pricing-section">
        <div className="pricing-cards">
          <div className="pricing-card">
            <h3 className="pricing-plan-name">Free</h3>
            <div className="pricing-amount">$0</div>
            <div className="pricing-period">forever</div>
            <ul className="pricing-features">
              <li><span className="pricing-check">✓</span> Up to 2 weddings</li>
              <li><span className="pricing-check">✓</span> All features included</li>
              <li><span className="pricing-check">✓</span> Unlimited guests per wedding</li>
              <li><span className="pricing-check">✓</span> Team messaging</li>
              <li><span className="pricing-check">✓</span> Seating chart</li>
              <li><span className="pricing-check">✓</span> CSV import &amp; export</li>
              <li><span className="pricing-check">✓</span> Collaborator invites</li>
            </ul>
            <button className="btn-gold" style={{ width: '100%' }} onClick={onStartFree}>
              START FREE
            </button>
          </div>
          <div className="pricing-card featured">
            <div className="pricing-badge">MOST POPULAR</div>
            <h3 className="pricing-plan-name">Pro</h3>
            <div className="pricing-amount">$39</div>
            <div className="pricing-period">per seat / month</div>
            <ul className="pricing-features">
              <li><span className="pricing-check">✓</span> Unlimited weddings</li>
              <li><span className="pricing-check">✓</span> Everything in Free</li>
              <li><span className="pricing-check">✓</span> Priority support</li>
              <li><span className="pricing-check">✓</span> Advanced exports</li>
              <li><span className="pricing-check">✓</span> BEO generator (coming soon)</li>
            </ul>
            <button className="btn-gold" style={{ width: '100%' }} onClick={onStartFree}>
              START FREE, UPGRADE LATER
            </button>
          </div>
        </div>
      </section>

      <div className="marketing-divider" />

      {/* ── Comparison Table ──────────────────────────────── */}
      <section className="comparison-section">
        <div className="marketing-section-label">COMPARISON</div>
        <h2 className="marketing-section-title">Why Vow &amp; Venue?</h2>
        <p className="marketing-section-subtitle">
          See how purpose-built wedding planning software compares to the alternatives.
        </p>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Feature</th>
              <th>Vow &amp; Venue</th>
              <th>Spreadsheets</th>
              <th>Generic PM Tools</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.feature}>
                <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.feature}</td>
                <td><CellValue val={row.vv} /></td>
                <td><CellValue val={row.spreadsheet} /></td>
                <td><CellValue val={row.generic} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="marketing-divider" />

      {/* ── Pricing FAQ ──────────────────────────────────── */}
      <section className="faq-section">
        <div className="marketing-section-label">FAQ</div>
        <h2 className="marketing-section-title">Pricing questions</h2>
        <div className="faq-list">
          {PRICING_FAQ.map((item, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-chevron">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="marketing-cta-banner">
        <h2>Start planning for free today</h2>
        <p>No credit card required. No time limit. Just better wedding planning.</p>
        <button className="btn-gold btn-gold-lg" onClick={onStartFree}>
          START PLANNING FREE &rarr;
        </button>
      </section>
    </div>
  )
}
