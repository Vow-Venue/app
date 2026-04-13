import { useState, useEffect } from 'react'
import { Outlet, useSearchParams, useLocation } from 'react-router-dom'
import MarketingNav from '../components/MarketingNav'
import MarketingFooter from '../components/MarketingFooter'
import AuthModal from '../components/AuthModal'

export default function MarketingLayout() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const handleSignIn = () => { setAuthMode('signin'); setAuthOpen(true) }
  const handleStartFree = () => { setAuthMode('signup'); setAuthOpen(true) }

  // Auto-open auth modal when invite token is present
  useEffect(() => {
    if (searchParams.get('invite')) {
      setAuthMode('signup')
      setAuthOpen(true)
    }
  }, [searchParams])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <MarketingNav onSignIn={handleSignIn} onStartFree={handleStartFree} />
      <Outlet context={{ onSignIn: handleSignIn, onStartFree: handleStartFree }} />
      <MarketingFooter onSignIn={handleSignIn} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
    </div>
  )
}
