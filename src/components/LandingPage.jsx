const FEATURES = [
  {
    icon: '👥',
    title: 'Guest List',
    desc: 'Track RSVPs, dietary needs, and seating assignments for every guest.',
  },
  {
    icon: '✓',
    title: 'Task Manager',
    desc: 'Stay on top of every detail with assignable checklists and due dates.',
  },
  {
    icon: '🌸',
    title: 'Vendor Hub',
    desc: 'All your vendor contacts, contracts, and notes in one place.',
  },
  {
    icon: '💬',
    title: 'Team Messaging',
    desc: 'Keep your whole team aligned with dedicated channels and direct messages.',
  },
  {
    icon: '📄',
    title: 'Billing & Invoices',
    desc: "Upload invoices, track payments, and see exactly what's outstanding.",
  },
  {
    icon: '📅',
    title: 'Day-of Contacts',
    desc: 'One-tap access to every phone number and role when it matters most.',
  },
]

export default function LandingPage({ onStart, onSignIn }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'Jost', sans-serif", color: 'var(--deep)' }}>

      {/* ── Nav ── */}
      <nav style={{
        background: 'var(--deep)',
        padding: '0 48px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26,
          fontWeight: 300,
          color: 'var(--gold-light)',
          letterSpacing: 3,
          fontStyle: 'italic',
        }}>
          <span style={{ color: 'var(--blush)', fontStyle: 'normal', fontWeight: 600 }}>✦</span> Vow &amp; Venue
        </div>
        <button
          className="btn btn-ghost"
          style={{ color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}
          onClick={onSignIn}
        >
          SIGN IN
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        textAlign: 'center',
        padding: '100px 40px 80px',
        maxWidth: 760,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(184,151,90,0.12)',
          border: '1px solid var(--border)',
          color: 'var(--gold)',
          padding: '5px 18px',
          borderRadius: 20,
          fontSize: 11,
          letterSpacing: 3,
          fontWeight: 500,
          marginBottom: 28,
        }}>
          WEDDING PLANNING · MADE BEAUTIFUL
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(42px, 7vw, 72px)',
          fontWeight: 300,
          fontStyle: 'italic',
          lineHeight: 1.15,
          color: 'var(--deep)',
          marginBottom: 24,
        }}>
          Plan the most beautiful<br />day of your life
        </h1>

        <p style={{
          fontSize: 17,
          color: 'var(--muted)',
          lineHeight: 1.8,
          marginBottom: 40,
          maxWidth: 560,
          margin: '0 auto 40px',
        }}>
          Everything your wedding needs — guests, vendors, tasks, budgets,
          and your whole team — in one elegant, easy-to-use workspace.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-gold"
            style={{ padding: '16px 40px', fontSize: 13, letterSpacing: 2.5, borderRadius: 10 }}
            onClick={onStart}
          >
            START PLANNING FREE →
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '16px 32px', fontSize: 12, letterSpacing: 2 }}
          >
            SEE HOW IT WORKS
          </button>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 48, fontSize: 13, color: 'var(--muted)' }}>
          <span style={{ marginRight: 6 }}>✦</span>
          No account required &nbsp;·&nbsp; Free to start &nbsp;·&nbsp; No credit card needed
          <span style={{ marginLeft: 6 }}>✦</span>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ borderTop: '1px solid var(--border)', maxWidth: 800, margin: '0 auto' }} />

      {/* ── Features ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--gold)', fontWeight: 600, marginBottom: 12 }}>
            EVERYTHING IN ONE PLACE
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--deep)',
          }}>
            All the tools your wedding deserves
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '28px 24px',
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(61,44,44,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 8,
              }}>
                {f.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        background: 'var(--deep)',
        padding: '64px 40px',
        textAlign: 'center',
        margin: '0 0 0 0',
      }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'var(--gold-light)',
          marginBottom: 16,
        }}>
          Your perfect day starts here
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
          Jump in immediately — no account required. Upgrade anytime for cloud saves and unlimited collaborators.
        </p>
        <button
          className="btn-gold"
          style={{ padding: '16px 48px', fontSize: 13, letterSpacing: 2.5, borderRadius: 10 }}
          onClick={onStart}
        >
          START PLANNING FREE →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: 'var(--deep)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 18,
          color: 'var(--gold-light)',
          fontStyle: 'italic',
          letterSpacing: 2,
        }}>
          ✦ Vow &amp; Venue
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
          © 2026 Vow &amp; Venue · All rights reserved
        </div>
      </footer>
    </div>
  )
}
