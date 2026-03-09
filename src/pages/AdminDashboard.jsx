import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = 'VowVenueAdmin2024'
const SUPABASE_COST = 25 // $25/mo Pro tier estimate

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

// ── Styles (self-contained dark theme) ──────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#0f0f1a', color: '#e0e0e0', fontFamily: "'Jost', sans-serif", padding: '32px 24px' },
  container: { maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 300, color: '#fff', fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 },
  subtitle: { fontSize: 11, color: '#666', letterSpacing: 1.5, textTransform: 'uppercase' },
  refreshBtn: { background: '#1e1e2f', border: '1px solid #2a2a3d', color: '#8888aa', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  sectionTitle: { fontSize: 11, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, marginTop: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#1a1a2e', borderRadius: 10, padding: '18px 20px', border: '1px solid #2a2a3d' },
  cardLabel: { fontSize: 10, color: '#666', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  cardValue: { fontSize: 26, fontWeight: 300, color: '#fff', fontFamily: "'Cormorant Garamond', serif" },
  cardSub: { fontSize: 11, color: '#555', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #2a2a3d', color: '#666', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' },
  td: { padding: '10px 14px', borderBottom: '1px solid #1e1e2f', color: '#ccc' },
  badge: (plan) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: plan === 'pro' ? 'rgba(184,151,90,0.15)' : 'rgba(100,100,120,0.2)', color: plan === 'pro' ? '#b8975a' : '#888' }),
  barWrap: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, padding: '0 4px' },
  bar: (h, max) => ({ flex: 1, background: 'linear-gradient(to top, #b8975a33, #b8975a)', borderRadius: '3px 3px 0 0', height: `${max > 0 ? (h / max) * 100 : 0}%`, minHeight: h > 0 ? 4 : 0, transition: 'height 0.3s' }),
  barLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 6, padding: '0 4px' },
  placeholder: { background: '#1a1a2e', borderRadius: 10, padding: 24, border: '1px dashed #2a2a3d', textAlign: 'center', color: '#444', fontSize: 13, fontStyle: 'italic' },
  // Password gate
  gate: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gateBox: { background: '#1a1a2e', borderRadius: 12, padding: '40px 36px', border: '1px solid #2a2a3d', textAlign: 'center', maxWidth: 340, width: '100%' },
  gateTitle: { fontSize: 20, color: '#fff', fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 },
  gateSubtitle: { fontSize: 11, color: '#555', marginBottom: 24, letterSpacing: 1 },
  gateInput: { width: '100%', padding: '10px 14px', background: '#0f0f1a', border: '1px solid #2a2a3d', borderRadius: 6, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  gateBtn: { width: '100%', marginTop: 14, padding: '10px 0', background: '#b8975a', border: 'none', borderRadius: 6, color: '#1a1a2e', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'inherit' },
  gateError: { color: '#c62828', fontSize: 12, marginTop: 10 },
  loading: { textAlign: 'center', color: '#555', padding: 60, fontSize: 14 },
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setError('')
    } else {
      setError('Wrong password')
    }
  }

  const loadData = async () => {
    setLoading(true)
    const [statsRes, signupsRes] = await Promise.all([
      supabase.rpc('get_admin_stats'),
      supabase.rpc('get_recent_signups', { limit_count: 50 }),
    ])
    if (statsRes.data) setStats(statsRes.data)
    if (signupsRes.data) setSignups(signupsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) loadData()
  }, [authed])

  // ── Password gate ────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={S.gate}>
        <div style={S.gateBox}>
          <div style={S.gateTitle}>Admin Dashboard</div>
          <div style={S.gateSubtitle}>VOW & VENUE INTERNAL</div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={S.gateInput}
              autoFocus
            />
            <button type="submit" style={S.gateBtn}>ENTER</button>
          </form>
          {error && <div style={S.gateError}>{error}</div>}
        </div>
      </div>
    )
  }

  if (loading || !stats) {
    return <div style={S.page}><div style={S.loading}>Loading dashboard...</div></div>
  }

  // ── Derived metrics ───────────────────────────────────────────────────────
  const profit = stats.mrr - SUPABASE_COST
  const dailyWeddings = stats.daily_weddings || []
  const maxDaily = Math.max(...dailyWeddings.map(d => d.count), 1)

  // ── Sorted signups ───────────────────────────────────────────────────────
  const sorted = [...signups].sort((a, b) => {
    let aVal = a[sortKey], bVal = b[sortKey]
    if (sortKey === 'created_at' || sortKey === 'last_sign_in_at') {
      aVal = aVal ? new Date(aVal).getTime() : 0
      bVal = bVal ? new Date(bVal).getTime() : 0
    }
    if (sortKey === 'wedding_count') { aVal = Number(aVal); bVal = Number(bVal) }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.title}>Admin Dashboard</div>
            <div style={S.subtitle}>Vow & Venue Internal</div>
          </div>
          <button style={S.refreshBtn} onClick={loadData}>REFRESH DATA</button>
        </div>

        {/* ── Business Health ──────────────────────────────────────────── */}
        <div style={S.sectionTitle}>Business Health</div>
        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Users</div>
            <div style={S.cardValue}>{stats.total_users}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Pro Seats</div>
            <div style={S.cardValue}>{stats.pro_seats}</div>
            <div style={S.cardSub}>paying $39/mo each</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Free Users</div>
            <div style={S.cardValue}>{stats.free_users}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Conversion Rate</div>
            <div style={S.cardValue}>{stats.conversion_rate}%</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>MRR</div>
            <div style={{ ...S.cardValue, color: '#4caf50' }}>{fmt(stats.mrr)}</div>
            <div style={S.cardSub}>{stats.pro_seats} seats × $39</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>ARR</div>
            <div style={{ ...S.cardValue, color: '#4caf50' }}>{fmt(stats.arr)}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Est. Monthly Costs</div>
            <div style={S.cardValue}>{fmt(SUPABASE_COST)}</div>
            <div style={S.cardSub}>Supabase Pro</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Est. Profit</div>
            <div style={{ ...S.cardValue, color: profit >= 0 ? '#4caf50' : '#c62828' }}>{fmt(profit)}</div>
            <div style={S.cardSub}>MRR − costs</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Inactive Users</div>
            <div style={S.cardValue}>{stats.inactive_users}</div>
            <div style={S.cardSub}>signed up, 0 weddings</div>
          </div>
        </div>

        {/* ── Growth ──────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>Growth</div>
        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.cardLabel}>Signups (7 days)</div>
            <div style={S.cardValue}>{stats.signups_7d}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Signups (30 days)</div>
            <div style={S.cardValue}>{stats.signups_30d}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Weddings (30 days)</div>
            <div style={S.cardValue}>{stats.weddings_30d}</div>
          </div>
        </div>

        {/* Bar chart — weddings by day */}
        {dailyWeddings.length > 0 && (
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={S.cardLabel}>Weddings Created — Last 30 Days</div>
            <div style={{ ...S.barWrap, marginTop: 12 }}>
              {dailyWeddings.map((d, i) => (
                <div
                  key={i}
                  style={S.bar(d.count, maxDaily)}
                  title={`${d.date}: ${d.count} wedding${d.count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
            <div style={S.barLabel}>
              <span>{dailyWeddings[0]?.date}</span>
              <span>{dailyWeddings[dailyWeddings.length - 1]?.date}</span>
            </div>
          </div>
        )}

        {/* ── Usage / Storage ─────────────────────────────────────────── */}
        <div style={S.sectionTitle}>Usage</div>
        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Weddings</div>
            <div style={S.cardValue}>{stats.total_weddings}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Avg Weddings / User</div>
            <div style={S.cardValue}>{stats.avg_weddings_per_user}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Guests</div>
            <div style={S.cardValue}>{Number(stats.total_guests).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Vendors</div>
            <div style={S.cardValue}>{Number(stats.total_vendors).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Messages</div>
            <div style={S.cardValue}>{Number(stats.total_messages).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Storage</div>
            <div style={{ ...S.cardValue, fontSize: 16, color: '#555' }}>—</div>
            <div style={S.cardSub}>coming soon</div>
          </div>
        </div>

        {/* ── Organizations (placeholder) ─────────────────────────────── */}
        <div style={S.sectionTitle}>Organizations</div>
        <div style={S.placeholder}>
          Organization system not built yet. Stats will appear here once orgs are live.
        </div>

        {/* ── Recent Signups ──────────────────────────────────────────── */}
        <div style={S.sectionTitle}>Recent Signups ({signups.length})</div>
        <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th} onClick={() => toggleSort('email')}>Email{sortArrow('email')}</th>
                <th style={S.th} onClick={() => toggleSort('created_at')}>Joined{sortArrow('created_at')}</th>
                <th style={S.th} onClick={() => toggleSort('last_sign_in_at')}>Last Active{sortArrow('last_sign_in_at')}</th>
                <th style={S.th} onClick={() => toggleSort('wedding_count')}>Weddings{sortArrow('wedding_count')}</th>
                <th style={S.th} onClick={() => toggleSort('plan')}>Plan{sortArrow('plan')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr key={u.id}>
                  <td style={S.td}>{u.email}</td>
                  <td style={S.td}>{fmtDate(u.created_at)}</td>
                  <td style={S.td}>{fmtDateTime(u.last_sign_in_at)}</td>
                  <td style={S.td}>{u.wedding_count}</td>
                  <td style={S.td}><span style={S.badge(u.plan)}>{u.plan.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 40, paddingBottom: 20 }}>
          Vow & Venue Admin — Internal Use Only
        </div>
      </div>
    </div>
  )
}
