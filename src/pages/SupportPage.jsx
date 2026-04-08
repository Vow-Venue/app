import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['General', 'Billing', 'Platform Usage', 'Bug Report']

export default function SupportPage() {
  const { onStartFree } = useOutletContext()
  const [form, setForm] = useState({ name: '', email: '', category: 'General', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setSending(true)
    const { error: dbError } = await supabase.from('support_tickets').insert({
      email: form.email.trim(),
      subject: `[${form.category}] ${form.subject.trim()}`,
      message: `From: ${form.name.trim()} <${form.email.trim()}>\n\n${form.message.trim()}`,
    })
    setSending(false)

    if (dbError) {
      console.error('Support ticket failed:', dbError.message)
      setError('Something went wrong. Please try again.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="support-page">
        <div className="support-success">
          <div className="support-success-icon">✓</div>
          <h2 className="support-success-title">Message Sent</h2>
          <p className="support-success-text">
            Thanks for reaching out! We'll get back to you within 24 hours.
          </p>
          <button className="btn btn-primary" onClick={() => { setSent(false); setForm({ name: '', email: '', category: 'General', subject: '', message: '' }) }}>
            Send Another Message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="support-page">
      <section className="marketing-hero" style={{ paddingBottom: 32 }}>
        <div className="marketing-hero-badge">SUPPORT</div>
        <h1 className="marketing-hero-title">How can we help?</h1>
        <p className="marketing-hero-subtitle">
          Questions about billing, platform features, or found a bug? We're here for you.
        </p>
      </section>

      <div className="support-content">
        <form className="support-form" onSubmit={handleSubmit}>
          <div className="support-form-row">
            <div className="support-field">
              <label className="support-label">Name</label>
              <input
                className="support-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
              />
            </div>
            <div className="support-field">
              <label className="support-label">Email</label>
              <input
                className="support-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="support-form-row">
            <div className="support-field">
              <label className="support-label">Category</label>
              <select
                className="support-input"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="support-field">
              <label className="support-label">Subject</label>
              <input
                className="support-input"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Brief summary"
              />
            </div>
          </div>

          <div className="support-field">
            <label className="support-label">Message</label>
            <textarea
              className="support-input support-textarea"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Describe your question or issue in detail..."
              rows={6}
            />
          </div>

          {error && <div className="support-error">{error}</div>}

          <button className="btn btn-primary support-submit" type="submit" disabled={sending}>
            {sending ? 'SENDING...' : 'SEND MESSAGE'}
          </button>
        </form>

        <div className="support-sidebar">
          <div className="support-sidebar-card">
            <h3 className="support-sidebar-title">Response Time</h3>
            <p className="support-sidebar-text">We typically respond within 24 hours on business days.</p>
          </div>
          <div className="support-sidebar-card">
            <h3 className="support-sidebar-title">Billing Questions</h3>
            <p className="support-sidebar-text">Need to update your plan, cancel, or request a refund? Select "Billing" above and we'll prioritize your request.</p>
          </div>
          <div className="support-sidebar-card">
            <h3 className="support-sidebar-title">Bug Reports</h3>
            <p className="support-sidebar-text">Found something broken? Include steps to reproduce and we'll fix it fast.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
