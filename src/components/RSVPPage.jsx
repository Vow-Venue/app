import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fmt = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
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
    name: '', email: '', rsvp: 'yes', dietary: '', plusOne: '', message: '',
  })

  useEffect(() => {
    supabase
      .from('weddings')
      .select('id, partner1, partner2, wedding_date')
      .eq('rsvp_slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setWedding(data)
        }
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

    // Try to find an existing guest by name or email, then upsert
    let guestId = null

    if (form.email) {
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('wedding_id', wedding.id)
        .eq('email', form.email.trim())
        .maybeSingle()
      if (existing) guestId = existing.id
    }

    if (!guestId) {
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
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
      dietary: form.dietary.trim() || null,
      guest_role: null,
      table_id: null,
    }

    let err
    if (guestId) {
      const { error: updateError } = await supabase
        .from('guests')
        .update({ rsvp: form.rsvp, dietary: guestData.dietary, email: guestData.email })
        .eq('id', guestId)
      err = updateError
    } else {
      const { error: insertError } = await supabase.from('guests').insert(guestData)
      err = insertError
    }

    if (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontStyle: 'italic', color: 'var(--deep)', opacity: 0.6 }}>
          ✦ Loading...
        </div>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontStyle: 'italic', color: 'var(--deep)', marginBottom: 16 }}>
            ✦ Vow &amp; Venue
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            This RSVP link is no longer active or doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  const couple = [wedding.partner1, wedding.partner2].filter(Boolean).join(' & ') || 'The Wedding'

  // ── Submitted ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, color: 'var(--gold)', marginBottom: 20 }}>
            ✦
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontStyle: 'italic', color: 'var(--deep)', marginBottom: 12 }}>
            {form.rsvp === 'yes' ? "We'll see you there!" : 'Thank you for letting us know'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            {form.rsvp === 'yes'
              ? `Your RSVP for ${couple}'s wedding has been received. We're so excited to celebrate with you!`
              : `We're sorry you won't be able to make it. Thank you for letting ${couple} know.`}
          </p>
          {wedding.wedding_date && (
            <p style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 1, marginTop: 20 }}>
              {fmt(wedding.wedding_date)}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── RSVP Form ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, letterSpacing: 3, color: 'var(--gold)', marginBottom: 12 }}>
            ✦ VOW &amp; VENUE ✦
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontStyle: 'italic', color: 'var(--deep)', margin: '0 0 10px' }}>
            {couple}
          </h1>
          {wedding.wedding_date && (
            <p style={{ fontSize: 14, letterSpacing: 2, color: 'var(--muted)', margin: 0 }}>
              {fmt(wedding.wedding_date).toUpperCase()}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 36px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontStyle: 'italic', color: 'var(--deep)', marginBottom: 6, textAlign: 'center' }}>
            Kindly Reply
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
            Please let us know if you'll be joining us on our special day.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>YOUR NAME *</label>
              <input
                name="name" type="text" value={form.name}
                onChange={handleChange} required
                placeholder="First and Last Name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>EMAIL</label>
              <input
                name="email" type="email" value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label>WILL YOU ATTEND?</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {[
                  { value: 'yes', label: 'Joyfully Accepts' },
                  { value: 'no', label: 'Regretfully Declines' },
                  { value: 'pending', label: 'TBD' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${form.rsvp === opt.value ? 'var(--gold)' : 'var(--border)'}`,
                      background: form.rsvp === opt.value ? 'rgba(184,151,90,0.1)' : 'transparent',
                      fontSize: 12, textAlign: 'center', lineHeight: 1.3,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio" name="rsvp" value={opt.value}
                      checked={form.rsvp === opt.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {form.rsvp === 'yes' && (
              <>
                <div className="form-group">
                  <label>DIETARY REQUIREMENTS</label>
                  <input
                    name="dietary" type="text" value={form.dietary}
                    onChange={handleChange}
                    placeholder="e.g. Vegetarian, Gluten-free, None"
                  />
                </div>

                <div className="form-group">
                  <label>BRINGING A PLUS-ONE?</label>
                  <input
                    name="plusOne" type="text" value={form.plusOne}
                    onChange={handleChange}
                    placeholder="Plus-one's full name (if applicable)"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>MESSAGE TO THE COUPLE (OPTIONAL)</label>
              <textarea
                name="message" value={form.message}
                onChange={handleChange}
                placeholder="Share your well-wishes..."
                style={{ minHeight: 80 }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(205,92,92,0.1)', border: '1px solid var(--rose)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 13, letterSpacing: 2 }}
              disabled={submitting}
            >
              {submitting ? 'SENDING...' : 'SEND RSVP'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--muted)', opacity: 0.6 }}>
          Powered by Vow &amp; Venue
        </div>
      </div>
    </div>
  )
}
