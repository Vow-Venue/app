import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = 'flower'
const SUPABASE_COST = 25 // $25/mo Pro tier estimate

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

const timeAgo = (d) => {
  if (!d) return 'never'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Styles (self-contained light theme) ─────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#f8f9fa', color: '#1a1a2e', fontFamily: "'Jost', sans-serif", padding: '32px 24px' },
  container: { maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 300, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 },
  subtitle: { fontSize: 11, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' },
  refreshBtn: { background: '#fff', border: '1px solid #ddd', color: '#666', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  sectionTitle: { fontSize: 11, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, marginTop: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #eee' },
  cardLabel: { fontSize: 10, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  cardValue: { fontSize: 26, fontWeight: 300, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif" },
  cardSub: { fontSize: 11, color: '#aaa', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #eee', color: '#999', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', color: '#444' },
  badge: (plan) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: plan === 'pro' ? 'rgba(184,151,90,0.12)' : 'rgba(0,0,0,0.05)', color: plan === 'pro' ? '#b8975a' : '#999' }),
  statusBadge: (status) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: status === 'open' ? 'rgba(198,40,40,0.1)' : 'rgba(46,125,50,0.1)', color: status === 'open' ? '#c62828' : '#2e7d32', cursor: 'pointer' }),
  dot: (ok) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? '#2e7d32' : '#c62828', marginRight: 8 }),
  healthRow: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  healthLabel: { flex: 1, color: '#444' },
  healthValue: { color: '#999', fontSize: 12 },
  placeholder: { background: '#fff', borderRadius: 10, padding: 24, border: '1px dashed #ddd', textAlign: 'center', color: '#bbb', fontSize: 13, fontStyle: 'italic' },
  tabBar: { display: 'flex', gap: 8, marginBottom: 12 },
  tabBtn: (active) => ({ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#666', fontSize: 11, fontWeight: 600, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }),
  // Password gate
  gate: { minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gateBox: { background: '#fff', borderRadius: 12, padding: '40px 36px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 340, width: '100%' },
  gateTitle: { fontSize: 20, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 },
  gateSubtitle: { fontSize: 11, color: '#999', marginBottom: 24, letterSpacing: 1 },
  gateInput: { width: '100%', padding: '10px 14px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 6, color: '#333', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  gateBtn: { width: '100%', marginTop: 14, padding: '10px 0', background: '#b8975a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'inherit' },
  gateError: { color: '#c62828', fontSize: 12, marginTop: 10 },
  loading: { textAlign: 'center', color: '#999', padding: 60, fontSize: 14 },
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('adminAuthed') === 'true')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [signups, setSignups] = useState([])
  const [storage, setStorage] = useState(null)
  const [health, setHealth] = useState(null)
  const [tickets, setTickets] = useState([])
  const [ticketFilter, setTicketFilter] = useState('open')
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuthed', 'true')
      setAuthed(true)
      setError('')
    } else {
      setError('Wrong password')
    }
  }

  const loadData = async () => {
    setLoading(true)
    const [statsRes, signupsRes, storageRes, healthRes, ticketsRes] = await Promise.all([
      supabase.rpc('get_admin_stats'),
      supabase.rpc('get_recent_signups', { limit_count: 50 }),
      supabase.rpc('get_storage_stats'),
      supabase.rpc('get_system_health'),
      supabase.rpc('get_support_tickets', { limit_count: 100 }),
    ])
    if (statsRes.data) setStats(statsRes.data)
    if (signupsRes.data) setSignups(signupsRes.data)
    if (storageRes.data) setStorage(storageRes.data)
    if (healthRes.data) setHealth(healthRes.data)
    if (ticketsRes.data) setTickets(ticketsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) loadData()
  }, [authed])

  const handleToggleTicketStatus = async (ticket) => {
    const newStatus = ticket.status === 'open' ? 'resolved' : 'open'
    await supabase.rpc('update_ticket_status', { ticket_id: ticket.id, new_status: newStatus })
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t))
  }

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

  const filteredTickets = tickets.filter(t => t.status === ticketFilter)

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
            <div style={S.cardLabel}>Churn Rate</div>
            <div style={S.cardValue}>0%</div>
            <div style={S.cardSub}>tracks cancellations once org billing is live</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>MRR</div>
            <div style={{ ...S.cardValue, color: '#2e7d32' }}>{fmt(stats.mrr)}</div>
            <div style={S.cardSub}>{stats.pro_seats} seats × $39</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>ARR</div>
            <div style={{ ...S.cardValue, color: '#2e7d32' }}>{fmt(stats.arr)}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Est. Monthly Costs</div>
            <div style={{ ...S.cardValue, color: '#c62828' }}>{fmt(SUPABASE_COST)}</div>
            <div style={S.cardSub}>Supabase Pro</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Est. Profit</div>
            <div style={{ ...S.cardValue, color: profit >= 0 ? '#2e7d32' : '#c62828' }}>{fmt(profit)}</div>
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

        {/* ── Usage ─────────────────────────────────────────────────── */}
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
            <div style={S.cardLabel}>Total Vendors</div>
            <div style={S.cardValue}>{Number(stats.total_vendors).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Total Messages</div>
            <div style={S.cardValue}>{Number(stats.total_messages).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardLabel}>Storage</div>
            <div style={S.cardValue}>{storage ? storage.file_count : 0}</div>
            <div style={S.cardSub}>
              {storage ? `${storage.total_mb} MB used` : '0 MB used'} · files uploaded
            </div>
          </div>
        </div>

        {/* ── System Health ──────────────────────────────────────────── */}
        <div style={S.sectionTitle}>System Health</div>
        <div style={S.card}>
          <div style={S.healthRow}>
            <span style={S.dot(true)} />
            <span style={S.healthLabel}>Supabase DB</span>
            <span style={S.healthValue}>connected</span>
          </div>
          <div style={S.healthRow}>
            <span style={S.dot(!!health?.last_login)} />
            <span style={S.healthLabel}>Last User Login</span>
            <span style={S.healthValue}>{health?.last_login ? timeAgo(health.last_login) : 'no data'}</span>
          </div>
          <div style={S.healthRow}>
            <span style={S.dot(false)} />
            <span style={S.healthLabel}>Stripe Webhook</span>
            <span style={S.healthValue}>not yet tracked</span>
          </div>
          <div style={S.healthRow}>
            <span style={S.dot(false)} />
            <span style={S.healthLabel}>Resend Last Email</span>
            <span style={S.healthValue}>not yet tracked</span>
          </div>
          <div style={{ ...S.healthRow, borderBottom: 'none' }}>
            <span style={S.dot(!!health?.last_ticket)} />
            <span style={S.healthLabel}>Last Support Ticket</span>
            <span style={S.healthValue}>{health?.last_ticket ? timeAgo(health.last_ticket) : 'none yet'}</span>
          </div>
        </div>

        {/* ── Organizations (placeholder) ─────────────────────────────── */}
        <div style={S.sectionTitle}>Organizations</div>
        <div style={S.placeholder}>
          Organization system not built yet. Stats will appear here once orgs are live.
        </div>

        {/* ── Support Tickets ──────────────────────────────────────────── */}
        <div style={S.sectionTitle}>Support Tickets ({tickets.length})</div>
        <div style={S.tabBar}>
          <button style={S.tabBtn(ticketFilter === 'open')} onClick={() => setTicketFilter('open')}>
            OPEN ({tickets.filter(t => t.status === 'open').length})
          </button>
          <button style={S.tabBtn(ticketFilter === 'resolved')} onClick={() => setTicketFilter('resolved')}>
            RESOLVED ({tickets.filter(t => t.status === 'resolved').length})
          </button>
        </div>
        {filteredTickets.length === 0 ? (
          <div style={S.placeholder}>No {ticketFilter} tickets.</div>
        ) : (
          <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Subject</th>
                  <th style={S.th}>Message</th>
                  <th style={S.th}>Submitted</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id}>
                    <td style={S.td}>{t.email}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{t.subject}</td>
                    <td style={{ ...S.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</td>
                    <td style={S.td}>{fmtDateTime(t.created_at)}</td>
                    <td style={S.td}>
                      <span
                        style={S.statusBadge(t.status)}
                        onClick={() => handleToggleTicketStatus(t)}
                        title={`Click to mark as ${t.status === 'open' ? 'resolved' : 'open'}`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 40, paddingBottom: 20 }}>
          Vow & Venue Admin — Internal Use Only
        </div>
      </div>
    </div>
  )
}
