import { useState } from 'react'

export default function RoleSelection({ onSelect }) {
  const [loading, setLoading] = useState(false)

  const handleSelect = async (role) => {
    setLoading(true)
    await onSelect(role)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      fontFamily: "'Jost', sans-serif",
      color: 'var(--deep)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--deep)',
        padding: '0 48px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 24,
          fontWeight: 300,
          color: 'var(--gold-light)',
          fontStyle: 'italic',
          letterSpacing: 2,
        }}>
          <span style={{ color: 'var(--blush)', fontStyle: 'normal', fontWeight: 600 }}>✦</span> Amorí
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
              marginBottom: 20,
            }}>
              WELCOME TO AMORÍ
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(30px, 5vw, 44px)',
              fontWeight: 300,
              fontStyle: 'italic',
              lineHeight: 1.2,
              color: 'var(--deep)',
              marginBottom: 12,
            }}>
              How will you use Amorí?
            </h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7 }}>
              This helps us tailor your experience.
            </p>
          </div>

          {/* Role cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
          }}>
            <button
              onClick={() => handleSelect('planner')}
              disabled={loading}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px 28px',
                cursor: loading ? 'default' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 32px rgba(61,44,44,0.07)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(184,151,90,0.15)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(61,44,44,0.07)' }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22,
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--deep)',
                marginBottom: 8,
              }}>
                I&apos;m a Wedding Planner
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Manage multiple weddings, collaborate with couples and vendors
              </div>
            </button>

            <button
              onClick={() => handleSelect('couple')}
              disabled={loading}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px 28px',
                cursor: loading ? 'default' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 32px rgba(61,44,44,0.07)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(184,151,90,0.15)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(61,44,44,0.07)' }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>💍</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22,
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--deep)',
                marginBottom: 8,
              }}>
                I&apos;m Planning My Wedding
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Plan your big day — guests, seating, budget, and more
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
