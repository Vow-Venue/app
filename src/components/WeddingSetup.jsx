import { useState } from 'react'

export default function WeddingSetup({ onComplete }) {
  const [partner1, setPartner1]     = useState('')
  const [partner2, setPartner2]     = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!partner1.trim() || !partner2.trim() || !weddingDate) return
    setLoading(true)
    await onComplete({ partner1: partner1.trim(), partner2: partner2.trim(), weddingDate })
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
        <div style={{ width: '100%', maxWidth: 480 }}>

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
              Let&apos;s set up your wedding
            </h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7 }}>
              Tell us a bit about your big day — you can always update this later.
            </p>
          </div>

          {/* Form */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '36px 32px',
            boxShadow: '0 4px 32px rgba(61,44,44,0.07)',
          }}>
            <form onSubmit={handleSubmit}>

              <div className="form-grid-2" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>YOUR NAME *</label>
                  <input
                    type="text"
                    value={partner1}
                    onChange={e => setPartner1(e.target.value)}
                    required
                    placeholder="e.g. Austin"
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>PARTNER&apos;S NAME *</label>
                  <input
                    type="text"
                    value={partner2}
                    onChange={e => setPartner2(e.target.value)}
                    required
                    placeholder="e.g. Taylor"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>WEDDING DATE *</label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={e => setWeddingDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <button
                type="submit"
                className="btn-gold"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: 13,
                  letterSpacing: 2.5,
                  borderRadius: 10,
                  marginTop: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'SAVING...' : "LET'S GET STARTED →"}
              </button>

            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
