import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

const passwordRules = [
  { test: pw => pw.length >= 8, label: 'At least 8 characters' },
  { test: pw => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { test: pw => /[0-9]/.test(pw), label: 'One number' },
  { test: pw => /[!@#$%^&*]/.test(pw), label: 'One special character (!@#$%^&*)' },
]

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  const passed = passwordRules.filter(r => r.test(password)).length
  if (passed <= 1) return { score: passed, label: 'Weak', color: 'var(--rose)' }
  if (passed <= 3) return { score: passed, label: 'Fair', color: 'var(--gold)' }
  return { score: passed, label: 'Strong', color: '#5a9a6a' }
}

export default function AuthModal({ isOpen, onClose, mode = 'signin' }) {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [isSignUp, setIsSignUp]       = useState(mode === 'signup')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [confirmSent, setConfirmSent] = useState(false)
  const [showPw, setShowPw]           = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Sync isSignUp when modal opens with a different mode
  useEffect(() => {
    if (isOpen) setIsSignUp(mode === 'signup')
  }, [isOpen, mode])

  const isDev = import.meta.env.VITE_DEV_MODE === 'true'

  const strength = useMemo(() => getPasswordStrength(password), [password])

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setConfirmPw('')
    setIsSignUp(mode === 'signup')
    setError(null)
    setConfirmSent(false)
    onClose()
  }

  const toggleMode = () => {
    setIsSignUp(prev => !prev)
    setError(null)
    setPassword('')
    setConfirmPw('')
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
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
    setError(null)

    if (isSignUp) {
      // Validate password rules
      for (const rule of passwordRules) {
        if (!rule.test(password)) {
          setError(`Password must include: ${rule.label.toLowerCase()}`)
          setLoading(false)
          return
        }
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      })
      setLoading(false)

      if (error) {
        setError(error.message)
        return
      }

      // Detect duplicate email (Supabase returns fake success with empty identities)
      if (data?.user && data.user.identities?.length === 0) {
        setError(
          <span>
            An account with this email already exists.{' '}
            <button
              type="button"
              onClick={toggleMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Jost', sans-serif",
                fontSize: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
              }}
            >
              Sign in instead
            </button>
          </span>
        )
        return
      }

      setError(null)
      setEmail('')
      setPassword('')
      setConfirmPw('')
      setConfirmSent(true)
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
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSignUp ? 'Create Your Account' : 'Sign In'}
      className="auth-modal"
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
              padding: '13px 16px',
              background: 'var(--cream)',
              border: '1.5px solid var(--gold)',
              borderRadius: 12,
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
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184, 151, 90, 0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 151, 90, 0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
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
            margin: '14px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(184, 151, 90, 0.15)' }} />
            <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: "'Jost', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(184, 151, 90, 0.15)' }} />
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
          <div className="form-group" style={{ marginBottom: isSignUp ? 4 : 12 }}>
            <label>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={isSignUp ? 'Create a password (8+ characters)' : 'Enter your password'}
                minLength={8}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password strength indicator (sign-up only) */}
          {isSignUp && password.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                height: 3,
                borderRadius: 2,
                background: 'var(--sand, #e0d5c1)',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                <div style={{
                  height: '100%',
                  width: `${(strength.score / 4) * 100}%`,
                  background: strength.color,
                  borderRadius: 2,
                  transition: 'width 0.2s ease, background 0.2s ease',
                }} />
              </div>
              <div style={{
                fontSize: 11,
                fontFamily: "'Jost', sans-serif",
                color: strength.color,
                fontWeight: 500,
                letterSpacing: 0.5,
              }}>
                {strength.label}
              </div>
            </div>
          )}

          {/* Confirm password (sign up only) */}
          {isSignUp && (
            <div className="form-group">
              <label>CONFIRM PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  minLength={8}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{error}</div>
          )}

          {/* Submit button — full width, no Cancel */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 0.5,
              marginTop: 4,
            }}
          >
            {loading
              ? (isSignUp ? 'CREATING ACCOUNT...' : 'SIGNING IN...')
              : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')
            }
          </button>

          {/* Toggle sign in / sign up — pinned at bottom */}
          <div style={{
            textAlign: 'center',
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--sand, #e0d5c1)',
          }}>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>{' '}
            <button
              type="button"
              onClick={toggleMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontSize: 12,
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
                marginTop: 12,
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
