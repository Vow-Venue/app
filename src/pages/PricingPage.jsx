import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const PRICING_FAQ = [
  { q: 'What\u2019s a seat?', a: 'Each paying planner needs their own seat. Collaborators (couples, vendors, family) are always free and don\u2019t count toward your seat total.' },
  { q: 'Can I collaborate with other planners on Free?', a: 'No, planner collaboration requires both planners to be on Pro. Collaborators like couples, vendors, and family members can always be invited for free on any plan.' },
  { q: 'What happens if I hit 2 weddings on Free?', a: 'You\u2019ll be prompted to upgrade when you try to create a third wedding. Your existing data is completely safe \u2014 nothing is deleted or locked.' },
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
            <div className="pricing-period">to start</div>
            <ul className="pricing-features">
              <li><span className="pricing-check">✓</span> Up to 2 weddings</li>
              <li><span className="pricing-check">✓</span> All planning features (guests, tasks, vendors, budget, seating chart, messaging, notes, day-of timeline)</li>
              <li><span className="pricing-check">✓</span> Unlimited guests, vendors, and collaborators per wedding</li>
              <li><span className="pricing-check">✓</span> Collaborator invites (couple, family, vendor — always free)</li>
              <li><span className="pricing-check">✓</span> CSV import &amp; export</li>
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
              <li><span className="pricing-check">✓</span> Everything in Free</li>
              <li><span className="pricing-check">✓</span> Unlimited weddings</li>
              <li><span className="pricing-check">✓</span> Planner collaboration (invite co-planners — both must be Pro)</li>
              <li><span className="pricing-check">✓</span> Studio/org creation and management</li>
              <li><span className="pricing-check">✓</span> Priority support</li>
              <li><span className="pricing-check">✓</span> Advanced exports</li>
            </ul>
            <button className="btn-gold" style={{ width: '100%' }} onClick={onStartFree}>
              START FREE, UPGRADE LATER
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 20 }}>
          Collaborators (couples, vendors, family) are always free and don&apos;t require a seat.
        </p>
      </section>

      <div className="marketing-divider" />

      {/* ── Comparison Table ──────────────────────────────── */}
      <section className="comparison-section">
        <div className="marketing-section-label">COMPARISON</div>
        <h2 className="marketing-section-title">Why Amorí?</h2>
        <p className="marketing-section-subtitle">
          See how purpose-built wedding planning software compares to the alternatives.
        </p>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Feature</th>
              <th>Amorí</th>
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
