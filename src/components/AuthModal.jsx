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

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://amorisuite.com'
    const currentParams = new URLSearchParams(window.location.search)
    const inviteToken = currentParams.get('invite')
    const redirectUrl = inviteToken ? `${baseUrl}?invite=${inviteToken}` : `${baseUrl}/app`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
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
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--cream)',
              border: '1.5px solid var(--gold)',
              borderRadius: 8,
              color: 'var(--deep)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Jost', sans-serif",
              letterSpacing: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184, 151, 90, 0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--sand, #e0d5c1)' }} />
            <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: "'Jost', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--sand, #e0d5c1)' }} />
          </div>

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
