import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

const FAQ_ITEMS = [
  { q: 'Is it really free?', a: 'Yes. The free plan includes all features with up to 2 weddings. No credit card required, no trial period, no hidden fees.' },
  { q: 'Do I need a credit card to sign up?', a: 'No. Just enter your email and you\'re in. We\'ll never ask for payment information unless you choose to upgrade to Pro.' },
  { q: 'Can my team access the same wedding?', a: 'Absolutely. Invite planners, family members, and vendors as collaborators with role-based access. Everyone works from the same workspace.' },
  { q: 'How is this better than spreadsheets?', a: 'Spreadsheets weren\'t built for wedding planning. Vow & Venue gives you guest RSVP tracking, interactive seating charts, vendor payment management, team messaging, and collaborator invites -- all in one purpose-built tool.' },
  { q: 'Can I manage multiple weddings?', a: 'Yes. Free accounts can manage up to 2 weddings. Pro accounts get unlimited weddings -- perfect for professional planners handling multiple clients.' },
]

export default function HomePage() {
  const { onStartFree } = useOutletContext()
  const [openFaq, setOpenFaq] = useState(null)

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="marketing-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="marketing-hero">
        <div className="marketing-hero-badge">BUILT FOR WEDDING PROFESSIONALS</div>
        <h1 className="marketing-hero-title">
          The planning tool professional wedding planners actually want to use
        </h1>
        <p className="marketing-hero-subtitle">
          Manage every wedding from guest lists to vendor payments to seating charts
          — all in one workspace your whole team can access.
        </p>
        <div className="marketing-hero-actions">
          <button className="btn-gold btn-gold-lg" onClick={onStartFree}>
            START PLANNING FREE &rarr;
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => scrollToSection('how-it-works')}
          >
            SEE HOW IT WORKS
          </button>
        </div>
        <p className="marketing-hero-proof">
          Free forever &middot; No credit card &middot; Unlimited features
        </p>
      </section>

      <div className="marketing-divider" />

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="how-it-works" id="how-it-works">
        <div className="marketing-section-label">HOW IT WORKS</div>
        <h2 className="marketing-section-title">Up and running in minutes</h2>
        <div className="how-it-works-grid">
          <div className="how-it-works-card">
            <div className="how-it-works-number">1</div>
            <h3>Create Your Workspace</h3>
            <p>Sign up in seconds. Add your couple&apos;s names, wedding date, and you&apos;re ready to go.</p>
          </div>
          <div className="how-it-works-card">
            <div className="how-it-works-number">2</div>
            <h3>Add Your Team</h3>
            <p>Invite planners, family members, and vendors as collaborators with role-based access.</p>
          </div>
          <div className="how-it-works-card">
            <div className="how-it-works-number">3</div>
            <h3>Plan Everything</h3>
            <p>Track guests, manage vendors, assign tasks, and message your team — all in one place.</p>
          </div>
        </div>
      </section>

      <div className="marketing-divider" />

      {/* ── Feature Highlights ───────────────────────────── */}
      <section className="marketing-features">
        <div className="marketing-section-label">FEATURES</div>
        <h2 className="marketing-section-title">Everything you need, nothing you don&apos;t</h2>
        <div className="marketing-features-grid">
          {[
            { icon: '👥', title: 'Guest Management', desc: 'Track RSVPs, dietary needs, roles, and seating assignments. Import guests from CSV in seconds.' },
            { icon: '💳', title: 'Vendor Payments', desc: 'Manage vendor contacts, track payment status, and keep invoices organized in one place.' },
            { icon: '🪑', title: 'Seating Chart', desc: 'Drag-and-drop table placement with round and long table support. Assign guests visually.' },
            { icon: '💬', title: 'Team Messaging', desc: 'Slack-style channels and direct messages. Keep your entire team aligned without leaving the app.' },
            { icon: '🤝', title: 'Collaborator Invites', desc: 'Role-based access for planners, family, and vendors. One-click magic link invites.' },
            { icon: '✅', title: 'Task Management', desc: 'Assign tasks with due dates and priorities. Track progress across your entire team.' },
          ].map((f) => (
            <div key={f.title} className="marketing-feature-card">
              <div className="marketing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/features" className="marketing-link">
            See all features &rarr;
          </Link>
        </div>
      </section>

      <div className="marketing-divider" />

      {/* ── Pricing Summary ──────────────────────────────── */}
      <section className="marketing-pricing-summary">
        <div className="marketing-section-label">PRICING</div>
        <h2 className="marketing-section-title">Start free, upgrade when you&apos;re ready</h2>
        <div className="pricing-cards pricing-cards-summary">
          <div className="pricing-card">
            <h3 className="pricing-plan-name">Free</h3>
            <div className="pricing-amount">$0</div>
            <div className="pricing-period">forever</div>
            <ul className="pricing-features">
              <li><span className="pricing-check">✓</span> Up to 2 weddings</li>
              <li><span className="pricing-check">✓</span> All features included</li>
              <li><span className="pricing-check">✓</span> Unlimited guests</li>
              <li><span className="pricing-check">✓</span> Team collaboration</li>
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
            </ul>
            <button className="btn-gold" style={{ width: '100%' }} onClick={onStartFree}>
              START FREE, UPGRADE LATER
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/pricing" className="marketing-link">
            See full comparison &rarr;
          </Link>
        </div>
      </section>

      <div className="marketing-divider" />

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="testimonials">
        <div className="marketing-section-label">TESTIMONIALS</div>
        <h2 className="marketing-section-title">Trusted by planners everywhere</h2>
        <div className="testimonials-grid">
          {[
            { quote: 'Finally, a tool that understands how wedding planners actually work. I switched from spreadsheets and never looked back.', name: 'Sarah M.', role: 'Wedding Planner, Austin TX' },
            { quote: 'The seating chart alone saved me hours. Being able to invite my clients as collaborators is a game-changer.', name: 'Rachel K.', role: 'Event Coordinator, Nashville TN' },
            { quote: 'I manage 15 weddings a year. Vow & Venue keeps everything organized and my team on the same page.', name: 'David L.', role: 'Wedding Planner, Los Angeles CA' },
          ].map((t) => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="testimonial-author">{t.name}</div>
              <div className="testimonial-role">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="marketing-divider" />

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="faq-section">
        <div className="marketing-section-label">FAQ</div>
        <h2 className="marketing-section-title">Frequently asked questions</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
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
        <h2>Ready to simplify your wedding planning?</h2>
        <p>Join professional planners who&apos;ve switched to a better way to work.</p>
        <button className="btn-gold btn-gold-lg" onClick={onStartFree}>
          START PLANNING FREE &rarr;
        </button>
      </section>
    </div>
  )
}
