import { useState, useEffect } from 'react'

const calcTimeLeft = (target) => {
  if (!target) return null
  const diff = target - new Date()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
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
  <div style={{
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 12px',
    textAlign: 'center',
    minWidth: 70,
    flex: 1,
  }}>
    <div style={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 40,
      fontWeight: 300,
      color: 'var(--gold)',
      lineHeight: 1,
      marginBottom: 6,
    }}>
      {String(value).padStart(2, '0')}
    </div>
    <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 500 }}>
      {label}
    </div>
  </div>
)

export default function Overview({ guests, tasks, vendors, invoices, onNavigate, weddingDate, canViewBilling = true }) {
  const target = weddingDate ? new Date(weddingDate + 'T00:00:00') : null
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(target))

  useEffect(() => {
    if (!target) { setTimeLeft(null); return }
    setTimeLeft(calcTimeLeft(target))
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000)
    return () => clearInterval(interval)
  }, [weddingDate])

  const confirmed = guests.filter(g => g.rsvp === 'yes').length
  const doneTasks = tasks.filter(t => t.completed).length
  const outstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)

  const upcomingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3)

  const recentGuests = guests.slice(-3).reverse()

  const weddingPassed = target && target <= new Date()

  return (
    <div>
      <div className="section-title">Your Wedding at a Glance</div>
      <div className="section-subtitle">
        {weddingDate
          ? new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
          : 'SET YOUR WEDDING DATE TO GET STARTED'}
      </div>

      {/* ── Countdown Clock ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontStyle: 'italic',
            color: 'var(--deep)',
            marginBottom: 4,
          }}>
            {weddingPassed ? 'The Big Day Has Arrived!' : 'Countdown'}
          </div>
          {weddingDate && (
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
          )}
        </div>
        {!weddingDate ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: 14 }}>
            Add your wedding date in setup to see the countdown.
          </div>
        ) : weddingPassed ? (
          <div style={{ textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: 'var(--gold)', fontStyle: 'italic' }}>
            Congratulations! 🌸
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CountdownUnit value={timeLeft?.days ?? 0}    label="DAYS" />
            <CountdownUnit value={timeLeft?.hours ?? 0}   label="HOURS" />
            <CountdownUnit value={timeLeft?.minutes ?? 0} label="MINUTES" />
            <CountdownUnit value={timeLeft?.seconds ?? 0} label="SECONDS" />
          </div>
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
                <div className="task-check" style={{ cursor: 'default' }}>◦</div>
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

        {/* Invoice Summary — editors only */}
        {canViewBilling && (
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
