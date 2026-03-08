import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: import.meta.env.VITE_APP_URL || window.location.origin },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  const handleClose = () => {
    setEmail('')
    setSent(false)
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Sign In">
      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontStyle: 'italic',
            marginBottom: 12,
            color: 'var(--deep)',
          }}>
            Check your email
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
            We sent a magic link to{' '}
            <strong style={{ color: 'var(--deep)' }}>{email}</strong>.<br />
            Click the link to sign in — no password needed.
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={handleClose}>
            CLOSE
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Enter your email and we&apos;ll send you a magic link to sign in.
            First time? Your account will be ready instantly.
          </p>
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          {error && (
            <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'SENDING...' : 'SEND MAGIC LINK →'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
