import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
const isAdmin = (email) => ADMIN_EMAILS.includes(email?.toLowerCase())
const MONTHLY_COSTS = 7 // Google Workspace $7/mo — Supabase is free tier for now

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
  page: { minHeight: '100vh', background: '#f8f9fa', color: '#1a1a2e', fontFamily: "'Jost', sans-serif", padding: '0 24px 32px' },
  container: { maxWidth: 1100, margin: '0 auto' },
  // Top nav
  topNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 32 },
  topNavLeft: { display: 'flex', alignItems: 'center', gap: 24 },
  topNavBrand: { fontSize: 16, fontWeight: 300, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1, marginRight: 8 },
  topNavLink: (active) => ({ fontSize: 14, fontWeight: active ? 700 : 500, letterSpacing: 1.5, textTransform: 'uppercase', color: active ? '#1a1a2e' : '#777', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', borderBottom: active ? '2px solid #b8975a' : '2px solid transparent', fontFamily: "'Jost', sans-serif" }),
  refreshBtn: { background: '#fff', border: '1px solid #ddd', color: '#666', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  // Content
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 300, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 },
  subtitle: { fontSize: 11, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 13, color: '#777', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, marginTop: 32, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #eee' },
  cardLabel: { fontSize: 11, color: '#888', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 },
  cardValue: { fontSize: 32, fontWeight: 700, color: '#1a1a2e', fontFamily: "'Jost', sans-serif" },
  cardSub: { fontSize: 11, color: '#aaa', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #eee', color: '#999', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', color: '#444' },
  badge: (plan) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: plan === 'pro' ? 'rgba(184,151,90,0.12)' : 'rgba(0,0,0,0.05)', color: plan === 'pro' ? '#b8975a' : '#999' }),
  statusBadge: (status) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: status === 'open' ? 'rgba(198,40,40,0.1)' : 'rgba(46,125,50,0.1)', color: status === 'open' ? '#c62828' : '#2e7d32', cursor: 'pointer' }),
  priorityBadge: (p) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, background: p === 'urgent' ? 'rgba(198,40,40,0.1)' : 'rgba(0,0,0,0.04)', color: p === 'urgent' ? '#c62828' : '#999', cursor: 'pointer' }),
  // Detail modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  detailBox: { background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 560, width: '100%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailSubject: { fontSize: 20, fontWeight: 300, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif" },
  detailClose: { background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  detailMeta: { fontSize: 12, color: '#999', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' },
  detailMessage: { fontSize: 15, lineHeight: 1.7, color: '#333', padding: '16px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 20, whiteSpace: 'pre-wrap' },
  detailActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  detailBtn: (bg, color) => ({ padding: '8px 18px', borderRadius: 6, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }),
  dot: (ok) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? '#2e7d32' : '#c62828', marginRight: 8 }),
  healthRow: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  healthLabel: { flex: 1, color: '#444' },
  healthValue: { color: '#999', fontSize: 12 },
  placeholder: { background: '#fff', borderRadius: 10, padding: 24, border: '1px dashed #ddd', textAlign: 'center', color: '#bbb', fontSize: 13, fontStyle: 'italic' },
  tabBar: { display: 'flex', gap: 8, marginBottom: 12 },
  tabBtn: (active) => ({ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', fontSize: 13, fontWeight: 600, letterSpacing: 1, cursor: 'pointer', fontFamily: "'Jost', sans-serif" }),
  // Auth gate
  gate: { minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gateBox: { background: '#fff', borderRadius: 12, padding: '40px 36px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 380, width: '100%' },
  gateTitle: { fontSize: 20, color: '#1a1a2e', fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 },
  gateSubtitle: { fontSize: 11, color: '#999', marginBottom: 24, letterSpacing: 1 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', background: '#fffaf3', border: '1px solid #b8975a', borderRadius: 8, color: '#3c2415', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' },
  gateError: { color: '#c62828', fontSize: 12, marginTop: 14, lineHeight: 1.5 },
  loading: { textAlign: 'center', color: '#999', padding: 60, fontSize: 14 },
  // User detail modal
  userDetailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 },
  userDetailLabel: { color: '#999', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  userDetailValue: { color: '#333', fontWeight: 500 },
  userWeddingCard: { background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', marginBottom: 8, border: '1px solid #eee' },
  userWeddingName: { fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 },
  userWeddingSub: { fontSize: 11, color: '#999' },
}

// ── User Detail Modal ───────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }) {
  const [weddings, setWeddings] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoadingDetail(true)
      const { data } = await supabase.rpc('get_user_detail', { target_user_id: user.id })
      if (data) setWeddings(data)
      setLoadingDetail(false)
    }
    load()
  }, [user])

  if (!user) return null

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.detailBox} onClick={e => e.stopPropagation()}>
        <div style={S.detailHeader}>
          <div style={S.detailSubject}>{user.email}</div>
          <button style={S.detailClose} onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          <div style={S.userDetailRow}>
            <span style={S.userDetailLabel}>Plan</span>
            <span style={S.badge(user.plan)}>{user.plan.toUpperCase()}</span>
          </div>
          <div style={S.userDetailRow}>
            <span style={S.userDetailLabel}>Joined</span>
            <span style={S.userDetailValue}>{fmtDate(user.created_at)}</span>
          </div>
          <div style={S.userDetailRow}>
            <span style={S.userDetailLabel}>Last Active</span>
            <span style={S.userDetailValue}>{fmtDateTime(user.last_sign_in_at)}</span>
          </div>
          <div style={S.userDetailRow}>
            <span style={S.userDetailLabel}>Weddings</span>
            <span style={S.userDetailValue}>{user.wedding_count}</span>
          </div>
        </div>

        <div style={{ ...S.sectionTitle, marginTop: 0 }}>Weddings</div>
        {loadingDetail ? (
          <div style={{ color: '#999', fontSize: 13, padding: '12px 0' }}>Loading...</div>
        ) : weddings.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, fontStyle: 'italic' }}>No weddings created</div>
        ) : (
          weddings.map(w => (
            <div key={w.id} style={S.userWeddingCard}>
              <div style={S.userWeddingName}>
                {w.partner1 || 'Partner 1'} & {w.partner2 || 'Partner 2'}
              </div>
              <div style={S.userWeddingSub}>
                {fmtDate(w.wedding_date)} · {w.guest_count} guests · {w.task_count} tasks · {w.vendor_count} vendors
              </div>
            </div>
          ))
        )}

        <div style={{ ...S.detailActions, marginTop: 20 }}>
          <a
            href={`mailto:${user.email}`}
            style={{ ...S.detailBtn('#1a1a2e', '#fff'), textDecoration: 'none' }}
          >
            EMAIL USER
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Support Tickets sub-page ────────────────────────────────────────────────
function TicketsPage({ tickets, onToggleStatus, onTogglePriority, onDelete }) {
  const [filter, setFilter] = useState('open')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filtered = tickets.filter(t => t.status === filter)

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortKey], bVal = b[sortKey]
    if (sortKey === 'created_at') {
      aVal = aVal ? new Date(aVal).getTime() : 0
      bVal = bVal ? new Date(bVal).getTime() : 0
    }
    if (sortKey === 'priority') {
      aVal = aVal === 'urgent' ? 0 : 1
      bVal = bVal === 'urgent' ? 0 : 1
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const handleResolveFromDetail = () => {
    if (!selected) return
    if (selected.status !== 'resolved') onToggleStatus(selected)
    setSelected(null)
  }

  const handleDeleteFromDetail = () => {
    if (!selected) return
    onDelete(selected.id)
    setSelected(null)
    setConfirmDelete(false)
  }

  const activeTicket = selected ? tickets.find(t => t.id === selected.id) || selected : null

  return (
    <>
      <div style={S.header}>
        <div>
          <div style={S.title}>Support Tickets</div>
          <div style={S.subtitle}>{tickets.length} total tickets</div>
        </div>
      </div>

      <div style={S.tabBar}>
        <button style={S.tabBtn(filter === 'open')} onClick={() => setFilter('open')}>
          OPEN ({tickets.filter(t => t.status === 'open').length})
        </button>
        <button style={S.tabBtn(filter === 'resolved')} onClick={() => setFilter('resolved')}>
          RESOLVED ({tickets.filter(t => t.status === 'resolved').length})
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={S.placeholder}>No {filter} tickets.</div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th} onClick={() => toggleSort('email')}>Email{sortArrow('email')}</th>
                <th style={S.th} onClick={() => toggleSort('subject')}>Subject{sortArrow('subject')}</th>
                <th style={S.th}>Message</th>
                <th style={S.th} onClick={() => toggleSort('priority')}>Priority{sortArrow('priority')}</th>
                <th style={S.th} onClick={() => toggleSort('created_at')}>Submitted{sortArrow('created_at')}</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr key={t.id} onClick={() => setSelected(t)} style={{ cursor: 'pointer' }}>
                  <td style={S.td}>{t.email}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{t.subject}</td>
                  <td style={{ ...S.td, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</td>
                  <td style={S.td}>
                    <span
                      style={S.priorityBadge(t.priority)}
                      onClick={(e) => { e.stopPropagation(); onTogglePriority(t) }}
                      title={`Click to set ${t.priority === 'urgent' ? 'normal' : 'urgent'}`}
                    >
                      {(t.priority || 'normal').toUpperCase()}
                    </span>
                  </td>
                  <td style={S.td}>{fmtDateTime(t.created_at)}</td>
                  <td style={S.td}>
                    <span
                      style={S.statusBadge(t.status)}
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(t) }}
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

      {activeTicket && (
        <div style={S.overlay} onClick={() => { setSelected(null); setConfirmDelete(false) }}>
          <div style={S.detailBox} onClick={e => e.stopPropagation()}>
            <div style={S.detailHeader}>
              <div style={S.detailSubject}>{activeTicket.subject}</div>
              <button style={S.detailClose} onClick={() => { setSelected(null); setConfirmDelete(false) }}>×</button>
            </div>

            <div style={S.detailMeta}>
              <span>{activeTicket.email}</span>
              <span>{fmtDateTime(activeTicket.created_at)}</span>
              <span style={S.statusBadge(activeTicket.status)}>{activeTicket.status.toUpperCase()}</span>
              <span
                style={S.priorityBadge(activeTicket.priority)}
                onClick={() => onTogglePriority(activeTicket)}
                title={`Click to set ${activeTicket.priority === 'urgent' ? 'normal' : 'urgent'}`}
              >
                {(activeTicket.priority || 'normal').toUpperCase()}
              </span>
            </div>

            <div style={S.detailMessage}>{activeTicket.message}</div>

            <div style={S.detailActions}>
              <a
                href={`mailto:${activeTicket.email}?subject=${encodeURIComponent('Re: ' + activeTicket.subject)}`}
                style={{ ...S.detailBtn('#1a1a2e', '#fff'), textDecoration: 'none' }}
              >
                REPLY VIA EMAIL
              </a>
              {activeTicket.status === 'open' && (
                <button style={S.detailBtn('#2e7d32', '#fff')} onClick={handleResolveFromDetail}>
                  MARK RESOLVED
                </button>
              )}
              {!confirmDelete ? (
                <button style={S.detailBtn('#fff', '#c62828')} onClick={() => setConfirmDelete(true)}>
                  DELETE
                </button>
              ) : (
                <button style={S.detailBtn('#c62828', '#fff')} onClick={handleDeleteFromDetail}>
                  CONFIRM DELETE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 40, paddingBottom: 20 }}>
        Amorí Admin — Internal Use Only
      </div>
    </>
  )
}

// ── Main Dashboard sub-page ─────────────────────────────────────────────────
function DashboardPage({ stats, signups, storage, health }) {
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedUser, setSelectedUser] = useState(null)

  const profit = stats.mrr - MONTHLY_COSTS
  const conversionRate = stats.total_users > 0 ? ((stats.pro_seats / stats.total_users) * 100).toFixed(1) : '0.0'
  const revenuePerUser = stats.total_users > 0 ? (stats.mrr / stats.total_users) : 0
  const revenuePerPro = stats.pro_seats > 0 ? (stats.mrr / stats.pro_seats) : 0

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
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <>
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
          <div style={{ ...S.cardValue, color: '#b8975a' }}>{conversionRate}%</div>
          <div style={S.cardSub}>free → pro</div>
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
          <div style={{ ...S.cardValue, color: '#c62828' }}>{fmt(MONTHLY_COSTS)}</div>
          <div style={{ ...S.cardSub, textAlign: 'left', lineHeight: 1.6 }}>
            Google Workspace · $7/mo<br/>
            Supabase · Free tier
          </div>
          <div style={{ marginTop: 8, padding: '6px 10px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, fontSize: 11, color: '#8d6e00', lineHeight: 1.5 }}>
            Upgrade Supabase to Pro ($25/mo) before beta launch
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Est. Profit</div>
          <div style={{ ...S.cardValue, color: profit >= 0 ? '#2e7d32' : '#c62828' }}>{fmt(profit)}</div>
          <div style={S.cardSub}>MRR − costs</div>
        </div>
      </div>

      {/* ── Revenue Metrics ────────────────────────────────────────── */}
      <div style={S.sectionTitle}>Revenue Metrics</div>
      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardLabel}>Revenue / User</div>
          <div style={{ ...S.cardValue, color: '#2e7d32' }}>{fmt(revenuePerUser)}</div>
          <div style={S.cardSub}>MRR ÷ all users</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Revenue / Pro Seat</div>
          <div style={{ ...S.cardValue, color: '#2e7d32' }}>{fmt(revenuePerPro)}</div>
          <div style={S.cardSub}>MRR ÷ paying users</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Est. Annual LTV</div>
          <div style={{ ...S.cardValue, color: '#2e7d32' }}>{fmt(revenuePerPro * 12)}</div>
          <div style={S.cardSub}>per pro seat × 12 months</div>
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
          <span style={S.dot(!!health?.last_stripe_webhook)} />
          <span style={S.healthLabel}>Stripe Webhook</span>
          <span style={S.healthValue}>{health?.last_stripe_webhook ? timeAgo(health.last_stripe_webhook) : 'no events yet'}</span>
        </div>
        <div style={S.healthRow}>
          <span style={S.dot(!!health?.last_resend_email)} />
          <span style={S.healthLabel}>Resend Last Email</span>
          <span style={S.healthValue}>{health?.last_resend_email ? timeAgo(health.last_resend_email) : 'no events yet'}</span>
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
              <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer' }}>
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

      {/* User detail modal */}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 40, paddingBottom: 20 }}>
        Amorí Admin — Internal Use Only
      </div>
    </>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authState, setAuthState] = useState('checking') // checking | denied | authed
  const [page, setPage] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [signups, setSignups] = useState([])
  const [storage, setStorage] = useState(null)
  const [health, setHealth] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)

  const [authError, setAuthError] = useState('')

  // Check Supabase auth session — only allow admin emails, sign out anyone else
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setAuthState('denied')
      } else if (isAdmin(session.user.email)) {
        setAuthState('authed')
      } else {
        await supabase.auth.signOut()
        setAuthError(`${session.user.email} is not an authorized admin account.`)
        setAuthState('denied')
      }
    }
    checkAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAuthState('denied')
      } else if (isAdmin(session.user.email)) {
        setAuthState('authed')
      } else {
        await supabase.auth.signOut()
        setAuthError(`${session.user.email} is not an authorized admin account.`)
        setAuthState('denied')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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
    if (authState === 'authed') loadData()
  }, [authState])

  const handleGoogleSignIn = async () => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/admin-x7k2p` },
    })
  }

  const handleToggleTicketStatus = async (ticket) => {
    const newStatus = ticket.status === 'open' ? 'resolved' : 'open'
    await supabase.rpc('update_ticket_status', { ticket_id: ticket.id, new_status: newStatus })
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t))
  }

  const handleTogglePriority = async (ticket) => {
    const newPriority = ticket.priority === 'urgent' ? 'normal' : 'urgent'
    await supabase.rpc('update_ticket_priority', { ticket_id: ticket.id, new_priority: newPriority })
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, priority: newPriority } : t))
  }

  const handleDeleteTicket = async (ticketId) => {
    await supabase.rpc('delete_ticket', { ticket_id: ticketId })
    setTickets(prev => prev.filter(t => t.id !== ticketId))
  }

  // ── Checking auth state ──────────────────────────────────────────────────
  if (authState === 'checking') {
    return <div style={S.page}><div style={S.loading}>Verifying access...</div></div>
  }

  // ── Access denied / login gate ───────────────────────────────────────────
  if (authState === 'denied') {
    return <AdminGate onGoogleSignIn={handleGoogleSignIn} error={authError} />
  }

  if (loading || !stats) {
    return <div style={S.page}><div style={S.loading}>Loading dashboard...</div></div>
  }

  const openCount = tickets.filter(t => t.status === 'open').length

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.topNav}>
          <div style={S.topNavLeft}>
            <span style={S.topNavBrand}>✦ Admin</span>
            <button style={S.topNavLink(page === 'dashboard')} onClick={() => setPage('dashboard')}>Dashboard</button>
            <button style={S.topNavLink(page === 'tickets')} onClick={() => setPage('tickets')}>
              Support Tickets{openCount > 0 ? ` (${openCount})` : ''}
            </button>
          </div>
          <button style={S.refreshBtn} onClick={loadData}>REFRESH</button>
        </div>
      </div>

      <div style={S.container}>
        {page === 'dashboard' ? (
          <DashboardPage stats={stats} signups={signups} storage={storage} health={health} />
        ) : (
          <TicketsPage tickets={tickets} onToggleStatus={handleToggleTicketStatus} onTogglePriority={handleTogglePriority} onDelete={handleDeleteTicket} />
        )}
      </div>
    </div>
  )
}

// ── Admin login gate ────────────────────────────────────────────────────────
function AdminGate({ onGoogleSignIn, error }) {
  return (
    <div style={S.gate}>
      <div style={S.gateBox}>
        <div style={S.gateTitle}>Admin Dashboard</div>
        <div style={S.gateSubtitle}>AMORÍ INTERNAL</div>

        <button onClick={onGoogleSignIn} style={S.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          SIGN IN WITH GOOGLE
        </button>
        {error && <div style={S.gateError}>{error}</div>}
      </div>
    </div>
  )
}
