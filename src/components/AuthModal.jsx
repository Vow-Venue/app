import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

export default function AuthModal({ isOpen, onClose, mode = 'signin' }) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const isSignUp = mode === 'signup'
  const isDev = import.meta.env.VITE_DEV_MODE === 'true'

  const handleDevLogin = async () => {
    const devEmail = import.meta.env.VITE_DEV_EMAIL
    const devPassword = import.meta.env.VITE_DEV_PASSWORD
    if (!devEmail || !devPassword) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword })
    setLoading(false)
    if (error) setError(error.message)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Preserve invite token through the magic link redirect
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const currentParams = new URLSearchParams(window.location.search)
    const inviteToken = currentParams.get('invite')
    const redirectUrl = inviteToken ? `${baseUrl}?invite=${inviteToken}` : baseUrl

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSignUp ? 'Create Your Account' : 'Sign In'}
    >
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
            Click the link to {isSignUp ? 'create your account' : 'sign in'} — no password needed.
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={handleClose}>
            CLOSE
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            {isSignUp
              ? 'Enter your email to get started — we\'ll send a magic link to set up your account. No password needed.'
              : 'Enter your email and we\'ll send you a magic link to sign in. First time? Your account will be ready instantly.'}
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
              {loading ? 'SENDING...' : (isSignUp ? 'CREATE ACCOUNT →' : 'SEND MAGIC LINK →')}
            </button>
          </div>
          {isDev && (
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={loading}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '10px',
                background: 'rgba(184, 151, 90, 0.1)',
                border: '1px dashed var(--gold)',
                borderRadius: 8,
                color: 'var(--gold)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 2,
                cursor: 'pointer',
                fontFamily: "'Jost', sans-serif",
              }}
            >
              {loading ? 'SIGNING IN...' : 'DEV LOGIN →'}
            </button>
          )}
        </form>
      )}
    </Modal>
  )
}
