import { useState, useEffect } from 'react'

const calcTimeLeft = (target) => {
  if (!target) return null
  const diff = target - new Date()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
}

const fmt = (amount) =>
  Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

const gcalUrl = (title, dateStr) => {
  if (!dateStr) return null
  const d = dateStr.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${d}/${d}`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

const CountdownUnit = ({ value, label }) => (
  <div className="overview-countdown-unit">
    <div className="overview-countdown-num">
      {String(value).padStart(2, '0')}
    </div>
    <div className="overview-countdown-label">{label}</div>
  </div>
)

export default function Overview({ guests, tasks, vendors, invoices, onNavigate, weddingDate, partner1, partner2, budget, messages }) {
  const target = weddingDate ? new Date(weddingDate + 'T00:00:00') : null
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(target))

  useEffect(() => {
    if (!target) { setTimeLeft(null); return }
    setTimeLeft(calcTimeLeft(target))
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000)
    return () => clearInterval(interval)
  }, [weddingDate])

  const confirmed = guests.filter(g => g.rsvp === 'yes').length
  const responded = guests.filter(g => g.rsvp !== 'pending').length
  const doneTasks = tasks.filter(t => t.completed).length
  const outstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)

  const upcomingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3)

  const nextTask = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null

  const recentGuests = guests.slice(-3).reverse()

  const weddingPassed = target && target <= new Date()

  // Budget calculations
  const budgetTotal = Number(budget) || 0
  const amountSpent = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)
  const budgetPct = budgetTotal > 0 ? Math.min((amountSpent / budgetTotal) * 100, 100) : 0

  // RSVP progress
  const rsvpPct = guests.length > 0 ? Math.round((responded / guests.length) * 100) : 0

  // Couple title
  const coupleTitle = (partner1 && partner2)
    ? `${partner1} & ${partner2}`
    : (partner1 || partner2 || 'Your Wedding')

  // Message count
  const messageCount = messages?.length ?? 0

  return (
    <div>
      {/* ── Couple names as page title ── */}
      <div className="overview-couple-title">{coupleTitle}</div>
      <div className="section-subtitle">
        {weddingDate
          ? new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
          : 'SET YOUR WEDDING DATE TO GET STARTED'}
      </div>

      {/* ── Countdown Clock ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        {!weddingDate ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: 14 }}>
            Add your wedding date in setup to see the countdown.
          </div>
        ) : weddingPassed ? (
          <div style={{ textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: 'var(--gold)', fontStyle: 'italic' }}>
            The Big Day Has Arrived!
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                <a
                  className="btn-gcal"
                  href={gcalUrl('Wedding Day', weddingDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Add to Google Calendar"
                >
                  +Cal
                </a>
              </div>
            </div>
            <div className="overview-countdown-row">
              <CountdownUnit value={timeLeft?.days ?? 0}    label="DAYS" />
              <CountdownUnit value={timeLeft?.hours ?? 0}   label="HOURS" />
              <CountdownUnit value={timeLeft?.minutes ?? 0} label="MINUTES" />
            </div>
          </>
        )}
      </div>

      {/* ── Stats grid ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{guests.length}</div>
          <div className="stat-label">GUESTS</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{confirmed}</div>
          <div className="stat-label">CONFIRMED</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{doneTasks}/{tasks.length}</div>
          <div className="stat-label">TASKS DONE</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{vendors.length}</div>
          <div className="stat-label">VENDORS</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: 26 }}>{fmt(outstanding)}</div>
          <div className="stat-label">OUTSTANDING</div>
        </div>
      </div>

      {/* ── Quick info cards ── */}
      <div className="overview-quick-row">
        {/* RSVP Progress */}
        <div className="overview-quick-card">
          <div className="overview-quick-label">RSVP PROGRESS</div>
          <div className="overview-quick-value">{responded} of {guests.length} responded</div>
          <div className="overview-progress-track">
            <div className="overview-progress-fill" style={{ width: `${rsvpPct}%` }} />
          </div>
        </div>

        {/* Next Task Due */}
        {nextTask && (
          <div className="overview-quick-card overview-quick-clickable" onClick={() => onNavigate('tasks')}>
            <div className="overview-quick-label">NEXT TASK DUE</div>
            <div className="overview-quick-value">{nextTask.title}</div>
            <div className="overview-quick-meta">{nextTask.dueDate ? fmtDate(nextTask.dueDate) : 'No date set'}</div>
          </div>
        )}

        {/* Budget Overview */}
        {budgetTotal > 0 && (
          <div className="overview-quick-card">
            <div className="overview-quick-label">BUDGET OVERVIEW</div>
            <div className="overview-quick-value">{fmt(amountSpent)} of {fmt(budgetTotal)}</div>
            <div className="overview-progress-track">
              <div className="overview-progress-fill" style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? 'var(--rose)' : 'var(--gold)' }} />
            </div>
          </div>
        )}

        {/* Unread Messages indicator */}
        {messageCount > 0 && (
          <div className="overview-quick-card overview-quick-clickable" onClick={() => onNavigate('messaging')}>
            <div className="overview-quick-label">MESSAGES</div>
            <div className="overview-quick-value">{messageCount} message{messageCount !== 1 ? 's' : ''}</div>
            <div className="overview-quick-meta">View conversation</div>
          </div>
        )}
      </div>

      <div className="card-grid">
        {/* Upcoming Tasks */}
        <div className="card">
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 16, fontStyle: 'italic' }}>
            Upcoming Tasks
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>All caught up!</div>
          ) : (
            upcomingTasks.map(t => (
              <div key={t.id} className="task-item">
                <div className="task-check" style={{ cursor: 'default' }}>&#9702;</div>
                <div className="task-label">{t.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {t.dueDate && (
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(t.dueDate)}</div>
                  )}
                  <div className="task-assignee">{t.assignedTo}</div>
                  {t.dueDate && (
                    <a
                      className="btn-gcal"
                      href={gcalUrl(t.title, t.dueDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Add to Google Calendar"
                    >
                      +Cal
                    </a>
                  )}
                </div>
              </div>
            ))
          )}

          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => onNavigate('tasks')}>
            VIEW ALL TASKS
          </button>
        </div>

        {/* Recent RSVPs */}
        <div className="card">
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 16, fontStyle: 'italic' }}>
            Recent RSVPs
          </div>

          {recentGuests.map(g => (
            <div key={g.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid rgba(184,151,90,0.1)',
            }}>
              <div>
                <div style={{ fontSize: 14 }}>{g.name}</div>
                {g.guestRole && (
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.guestRole}</div>
                )}
              </div>
              <span className={`badge rsvp-${g.rsvp}`}>{g.rsvp.toUpperCase()}</span>
            </div>
          ))}

          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => onNavigate('guests')}>
            VIEW ALL GUESTS
          </button>
        </div>

        {/* Invoice Summary — hidden if empty */}
        {invoices.length > 0 && (
          <div className="card">
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 16, fontStyle: 'italic' }}>
              Recent Invoices
            </div>

            {invoices.slice(0, 3).map(inv => (
              <div key={inv.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid rgba(184,151,90,0.1)',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{inv.vendorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>{inv.invoiceNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontFamily: "'Cormorant Garamond', serif" }}>{fmt(inv.amount)}</div>
                  <span className={`badge status-${inv.status}`}>{inv.status.toUpperCase()}</span>
                </div>
              </div>
            ))}

            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => onNavigate('billing')}>
              VIEW ALL INVOICES
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
