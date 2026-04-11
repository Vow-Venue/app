import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

export default function AuthModal({ isOpen, onClose, mode = 'signin' }) {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [isSignUp, setIsSignUp]       = useState(mode === 'signup')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [confirmSent, setConfirmSent] = useState(false)

  const isDev = import.meta.env.VITE_DEV_MODE === 'true'

  // Sync mode prop when modal reopens
  const handleClose = () => {
    setEmail('')
    setPassword('')
    setConfirmPw('')
    setIsSignUp(mode === 'signup')
    setError('')
    setConfirmSent(false)
    onClose()
  }

  const toggleMode = () => {
    setIsSignUp(prev => !prev)
    setError('')
    setPassword('')
    setConfirmPw('')
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
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

  // ── Email + Password ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      if (password !== confirmPw) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      const baseUrl = import.meta.env.VITE_APP_URL || 'https://amorisuite.com'
      const currentParams = new URLSearchParams(window.location.search)
      const inviteToken = currentParams.get('invite')
      const redirectUrl = inviteToken ? `${baseUrl}?invite=${inviteToken}` : `${baseUrl}/app`

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      })
      setLoading(false)
      if (error) {
        setError(error.message)
      } else {
        setError('')
        setEmail('')
        setPassword('')
        setConfirmPw('')
        // Show confirmation message in place of form
        setConfirmSent(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setError(error.message)
    }
  }

  // ── Dev login ─────────────────────────────────────────────────────────────
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSignUp ? 'Create Your Account' : 'Sign In'}
    >
      {confirmSent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontStyle: 'italic',
            marginBottom: 12,
            color: 'var(--deep)',
          }}>
            Verify your email
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--deep)' }}>{email || 'your email'}</strong>.<br />
            Click the link to activate your account.
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={handleClose}>
            CLOSE
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Google OAuth */}
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

          {/* Divider */}
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

          {/* Email */}
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

          {/* Password */}
          <div className="form-group">
            <label>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder={isSignUp ? 'Create a password (6+ characters)' : 'Enter your password'}
              minLength={6}
            />
          </div>

          {/* Confirm password (sign up only) */}
          {isSignUp && (
            <div className="form-group">
              <label>CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? (isSignUp ? 'CREATING...' : 'SIGNING IN...')
                : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')
              }
            </button>
          </div>

          {/* Toggle sign in / sign up */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>{' '}
            <button
              type="button"
              onClick={toggleMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Jost', sans-serif",
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
              }}
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          {/* Dev login — local only */}
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
