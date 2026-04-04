import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fmt = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #faf8f4 0%, #f5f0e8 50%, #faf8f4 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px',
  },
  container: { maxWidth: 520, width: '100%' },
  header: { textAlign: 'center', marginBottom: 40 },
  flourish: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 14, letterSpacing: 6,
    color: '#b8975a', marginBottom: 20,
  },
  divider: {
    width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #b8975a, transparent)',
    margin: '0 auto 20px',
  },
  couple: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontStyle: 'italic',
    color: '#1a1a2e', margin: '0 0 8px', fontWeight: 400, lineHeight: 1.2,
  },
  date: { fontSize: 13, letterSpacing: 3, color: '#999', margin: 0, fontWeight: 500 },
  card: {
    background: '#fff', borderRadius: 16, padding: '36px 40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(184,151,90,0.15)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontStyle: 'italic',
    color: '#1a1a2e', marginBottom: 4, textAlign: 'center', fontWeight: 400,
  },
  cardSub: {
    fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 28, lineHeight: 1.6,
  },
  label: {
    display: 'block', fontSize: 10, letterSpacing: 2.5, color: '#999',
    fontWeight: 600, marginBottom: 6, fontFamily: "'Jost', sans-serif",
  },
  input: {
    width: '100%', padding: '12px 14px', border: '1px solid #e8e4dc', borderRadius: 8,
    fontSize: 14, fontFamily: "'Jost', sans-serif", color: '#1a1a2e',
    background: '#faf8f4', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  group: { marginBottom: 20 },
  attendOpt: (active) => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 4, padding: '14px 8px', borderRadius: 10,
    cursor: 'pointer', transition: 'all 0.2s', fontSize: 12, textAlign: 'center',
    border: `2px solid ${active ? '#b8975a' : '#e8e4dc'}`,
    background: active ? 'rgba(184,151,90,0.08)' : 'transparent',
    color: active ? '#b8975a' : '#999', fontWeight: active ? 600 : 400,
  }),
  submit: {
    width: '100%', padding: '14px', fontSize: 12, letterSpacing: 3, fontWeight: 600,
    fontFamily: "'Jost', sans-serif", border: 'none', borderRadius: 10,
    background: 'linear-gradient(135deg, #b8975a, #a07c3f)', color: '#fff',
    cursor: 'pointer', transition: 'opacity 0.2s',
  },
  error: {
    background: 'rgba(205,92,92,0.08)', border: '1px solid rgba(205,92,92,0.3)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c44', marginBottom: 16,
  },
  footer: { textAlign: 'center', marginTop: 32, fontSize: 11, color: '#ccc', letterSpacing: 1 },
  successIcon: {
    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, border: '2px solid #b8975a', color: '#b8975a',
  },
}

export default function RSVPPage() {
  const { slug } = useParams()
  const [wedding, setWedding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', rsvp: 'yes', dietary: '', meal: '', plusOne: '', message: '',
  })

  useEffect(() => {
    supabase
      .from('weddings')
      .select('id, partner1, partner2, wedding_date')
      .eq('rsvp_slug', slug)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) setNotFound(true)
        else setWedding(data)
        setLoading(false)
      })
  }, [slug])

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)

    // Duplicate detection by email then name
    let guestId = null
    if (form.email) {
      const { data: existing } = await supabase
        .from('guests').select('id')
        .eq('wedding_id', wedding.id)
        .eq('email', form.email.trim())
        .maybeSingle()
      if (existing) guestId = existing.id
    }
    if (!guestId) {
      const { data: existing } = await supabase
        .from('guests').select('id')
        .eq('wedding_id', wedding.id)
        .ilike('name', form.name.trim())
        .maybeSingle()
      if (existing) guestId = existing.id
    }

    const guestData = {
      wedding_id: wedding.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      rsvp: form.rsvp,
      dietary: [form.meal, form.dietary].filter(Boolean).join(', ').trim() || null,
      guest_role: null,
      table_id: null,
    }

    let err
    if (guestId) {
      const { error: updateError } = await supabase
        .from('guests')
        .update({ rsvp: form.rsvp, dietary: guestData.dietary, email: guestData.email, name: guestData.name })
        .eq('id', guestId)
      err = updateError
    } else {
      const { error: insertError } = await supabase.from('guests').insert(guestData)
      err = insertError
    }

    // Insert plus-one as separate guest if provided
    if (!err && form.rsvp === 'yes' && form.plusOne.trim()) {
      const plusData = {
        wedding_id: wedding.id,
        name: form.plusOne.trim(),
        rsvp: 'yes',
        guest_role: `Plus-one of ${form.name.trim()}`,
      }
      // Check for duplicate plus-one
      const { data: existingPlus } = await supabase
        .from('guests').select('id')
        .eq('wedding_id', wedding.id)
        .ilike('name', form.plusOne.trim())
        .maybeSingle()
      if (existingPlus) {
        await supabase.from('guests').update({ rsvp: 'yes', guest_role: plusData.guest_role }).eq('id', existingPlus.id)
      } else {
        await supabase.from('guests').insert(plusData)
      }
    }

    if (err) {
      setError('Something went wrong. Please try again.')
      console.error('RSVP submit error:', err)
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', color: '#1a1a2e', opacity: 0.5 }}>
          ✦
        </div>
      </div>
    )
  }

  // ── Not found ──
  if (notFound) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ ...S.successIcon, borderColor: '#ddd', color: '#ccc' }}>?</div>
          <h1 style={{ ...S.couple, fontSize: 28, marginBottom: 12 }}>Link Not Found</h1>
          <p style={{ color: '#999', fontSize: 14, lineHeight: 1.7 }}>
            This RSVP link is no longer active or doesn't exist. Please contact the couple for an updated link.
          </p>
        </div>
      </div>
    )
  }

  const couple = [wedding.partner1, wedding.partner2].filter(Boolean).join(' & ') || 'The Couple'

  // ── Submitted ──
  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ textAlign: 'center' }}>
            <div style={S.successIcon}>
              {form.rsvp === 'yes' ? '♥' : '✦'}
            </div>
            <h1 style={{ ...S.couple, fontSize: 36, marginBottom: 12 }}>
              {form.rsvp === 'yes' ? "We'll See You There!" : 'Thank You'}
            </h1>
            <div style={S.divider} />
            <p style={{ color: '#999', fontSize: 15, lineHeight: 1.8, marginBottom: 8, maxWidth: 400, margin: '0 auto 24px' }}>
              {form.rsvp === 'yes'
                ? `Your RSVP for ${couple}'s wedding has been received. We can't wait to celebrate with you!`
                : `We're sorry you won't be able to make it. Thank you for letting ${couple} know.`}
            </p>
            {form.rsvp === 'yes' && form.plusOne.trim() && (
              <p style={{ fontSize: 13, color: '#b8975a', marginBottom: 16 }}>
                Plus-one ({form.plusOne.trim()}) has been added.
              </p>
            )}
            {wedding.wedding_date && (
              <p style={{ ...S.date, marginTop: 20 }}>
                {fmt(wedding.wedding_date).toUpperCase()}
              </p>
            )}
          </div>
          <div style={S.footer}>✦ Powered by Amorí</div>
        </div>
      </div>
    )
  }

  // ── RSVP Form ──
  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.flourish}>✦ YOU'RE INVITED ✦</div>
          <div style={S.divider} />
          <h1 style={S.couple}>{couple}</h1>
          {wedding.wedding_date && (
            <p style={S.date}>{fmt(wedding.wedding_date).toUpperCase()}</p>
          )}
        </div>

        {/* Card */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Kindly Reply</h2>
          <p style={S.cardSub}>Please let us know if you'll be joining us on our special day.</p>

          <form onSubmit={handleSubmit}>
            <div style={S.group}>
              <label style={S.label}>FULL NAME *</label>
              <input
                name="name" type="text" value={form.name}
                onChange={handleChange} required autoFocus
                placeholder="First and Last Name"
                style={S.input}
              />
            </div>

            <div style={S.group}>
              <label style={S.label}>EMAIL</label>
              <input
                name="email" type="email" value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={S.input}
              />
            </div>

            <div style={S.group}>
              <label style={S.label}>WILL YOU ATTEND?</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[
                  { value: 'yes', label: 'Joyfully Accepts', icon: '♥' },
                  { value: 'no', label: 'Regretfully Declines', icon: '—' },
                ].map(opt => (
                  <label key={opt.value} style={S.attendOpt(form.rsvp === opt.value)}>
                    <input
                      type="radio" name="rsvp" value={opt.value}
                      checked={form.rsvp === opt.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.rsvp === 'yes' && (
              <>
                <div style={S.group}>
                  <label style={S.label}>MEAL PREFERENCE</label>
                  <select
                    name="meal" value={form.meal} onChange={handleChange}
                    style={{ ...S.input, appearance: 'auto' }}
                  >
                    <option value="">Select preference</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Fish">Fish</option>
                    <option value="Beef">Beef</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>

                <div style={S.group}>
                  <label style={S.label}>DIETARY RESTRICTIONS</label>
                  <input
                    name="dietary" type="text" value={form.dietary}
                    onChange={handleChange}
                    placeholder="e.g. Gluten-free, Nut allergy"
                    style={S.input}
                  />
                </div>

                <div style={S.group}>
                  <label style={S.label}>PLUS-ONE</label>
                  <input
                    name="plusOne" type="text" value={form.plusOne}
                    onChange={handleChange}
                    placeholder="Guest's full name (if applicable)"
                    style={S.input}
                  />
                </div>
              </>
            )}

            <div style={S.group}>
              <label style={S.label}>MESSAGE TO THE COUPLE (OPTIONAL)</label>
              <textarea
                name="message" value={form.message}
                onChange={handleChange}
                placeholder="Share your well-wishes..."
                style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
              />
            </div>

            {error && <div style={S.error}>{error}</div>}

            <button
              type="submit" style={{ ...S.submit, opacity: submitting ? 0.6 : 1 }}
              disabled={submitting}
            >
              {submitting ? 'SENDING...' : 'SEND RSVP'}
            </button>
          </form>
        </div>

        <div style={S.footer}>✦ Powered by Amorí</div>
      </div>
    </div>
  )
}
