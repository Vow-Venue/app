import { useState, useRef, useCallback } from 'react'

const fmtDate = (d) => {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

const fmtTime12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

const googleCalUrl = (event, day, wedding) => {
  const couple = [wedding?.partner1, wedding?.partner2].filter(Boolean).join(' & ')
  const dateStr = day?.date || wedding?.wedding_date || ''
  if (!dateStr || !event.time) return null
  const [h, m] = event.time.split(':').map(Number)
  const start = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // 1hr default
  const pad = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Wedding Event',
    dates: `${pad(start)}/${pad(end)}`,
    details: [event.notes, couple ? `Wedding: ${couple}` : ''].filter(Boolean).join('\n'),
    location: event.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function DayOfTimeline({
  days, events, wedding, vendors, collaborators,
  onAddDay, onUpdateDay, onDeleteDay,
  onAddEvent, onUpdateEvent, onDeleteEvent, onReorderEvents,
  canEdit = true,
}) {
  const [activeDay, setActiveDay] = useState(null)
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [dayForm, setDayForm] = useState({ label: '', date: '' })
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState({ time: '12:00', title: '', location: '', assigned_to: '', notes: '' })
  const [editingDayId, setEditingDayId] = useState(null)
  const [editDayForm, setEditDayForm] = useState({ label: '', date: '' })
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  // Auto-select first day
  const activeDayId = activeDay || (days.length > 0 ? days[0].id : null)
  const currentDay = days.find(d => d.id === activeDayId)
  const dayEvents = events
    .filter(e => e.day_id === activeDayId)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Assignable people list
  const assignOptions = [
    ...collaborators.map(c => c.name),
    ...vendors.map(v => v.name),
  ].filter(Boolean)

  // ── Day CRUD ──
  const handleAddDay = async (e) => {
    e.preventDefault()
    if (!dayForm.label.trim()) return
    const created = await onAddDay({ label: dayForm.label.trim(), date: dayForm.date || null })
    if (created) setActiveDay(created.id)
    setDayForm({ label: '', date: '' })
    setAddDayOpen(false)
  }

  const handleSaveDayEdit = async () => {
    if (!editDayForm.label.trim()) return
    await onUpdateDay(editingDayId, { label: editDayForm.label.trim(), date: editDayForm.date || null })
    setEditingDayId(null)
  }

  const handleDeleteDay = async (id) => {
    if (!confirm('Delete this day and all its events?')) return
    await onDeleteDay(id)
    if (activeDayId === id) setActiveDay(null)
  }

  // ── Event CRUD ──
  const openAddEvent = () => {
    setEditingEvent(null)
    setEventForm({ time: '12:00', title: '', location: '', assigned_to: '', notes: '' })
    setAddEventOpen(true)
  }

  const openEditEvent = (ev) => {
    setEditingEvent(ev)
    setEventForm({
      time: ev.time || '12:00', title: ev.title || '', location: ev.location || '',
      assigned_to: ev.assigned_to || '', notes: ev.notes || '',
    })
    setAddEventOpen(true)
  }

  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!eventForm.title.trim()) return
    if (editingEvent) {
      await onUpdateEvent(editingEvent.id, { ...eventForm })
    } else {
      await onAddEvent({ day_id: activeDayId, ...eventForm })
    }
    setAddEventOpen(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (id) => {
    await onDeleteEvent(id)
  }

  // ── Drag reorder ──
  const handleDragStart = useCallback((idx) => { dragItem.current = idx }, [])
  const handleDragEnter = useCallback((idx) => { dragOver.current = idx }, [])
  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null
      dragOver.current = null
      return
    }
    const items = [...dayEvents]
    const dragged = items.splice(dragItem.current, 1)[0]
    items.splice(dragOver.current, 0, dragged)
    onReorderEvents(activeDayId, items.map(e => e.id))
    dragItem.current = null
    dragOver.current = null
  }, [dayEvents, activeDayId, onReorderEvents])

  // ── Print ──
  const handlePrint = () => window.print()

  return (
    <div>
      <div className="section-title">Day-of Timeline</div>
      <div className="section-subtitle">PLAN EVERY MOMENT OF YOUR CELEBRATION</div>

      {/* ── Day Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {days.map(d => (
          <button
            key={d.id}
            className={`chip ${d.id === activeDayId ? 'active' : ''}`}
            onClick={() => setActiveDay(d.id)}
            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', position: 'relative' }}
          >
            {d.label}
            {d.date && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>{fmtDate(d.date)}</span>}
          </button>
        ))}
        {canEdit && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '6px 12px' }}
            onClick={() => setAddDayOpen(true)}
          >
            + ADD DAY
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost no-print" style={{ fontSize: 11 }} onClick={handlePrint}>
            ↓ PRINT TIMELINE
          </button>
        </div>
      </div>

      {/* ── Add Day Modal ── */}
      {addDayOpen && (
        <div className="modal-backdrop" onClick={() => setAddDayOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Add Day</div>
              <button className="modal-close" onClick={() => setAddDayOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddDay} style={{ padding: '16px 24px 24px' }}>
              <div className="form-group">
                <label>DAY LABEL *</label>
                <input
                  type="text" value={dayForm.label}
                  onChange={e => setDayForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Rehearsal Dinner, Wedding Day, Farewell Brunch"
                  autoFocus required
                />
              </div>
              <div className="form-group">
                <label>DATE</label>
                <input
                  type="date" value={dayForm.date}
                  onChange={e => setDayForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAddDayOpen(false)}>CANCEL</button>
                <button type="submit" className="btn btn-primary">ADD DAY</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── No days state ── */}
      {days.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: 'italic', color: 'var(--deep)', marginBottom: 8 }}>
            No timeline yet
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 360, margin: '0 auto 20px' }}>
            Create your first day to start building your wedding timeline.
          </p>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setAddDayOpen(true)}>+ ADD YOUR FIRST DAY</button>
          )}
        </div>
      )}

      {/* ── Day content ── */}
      {currentDay && (
        <div>
          {/* Day header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {editingDayId === currentDay.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                <input
                  type="text" value={editDayForm.label}
                  onChange={e => setEditDayForm(p => ({ ...p, label: e.target.value }))}
                  style={{ flex: 1, fontSize: 14 }}
                  autoFocus
                />
                <input
                  type="date" value={editDayForm.date}
                  onChange={e => setEditDayForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: 160 }}
                />
                <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleSaveDayEdit}>SAVE</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingDayId(null)}>CANCEL</button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontStyle: 'italic', color: 'var(--deep)',
                  }}>
                    {currentDay.label}
                  </div>
                  {currentDay.date && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginTop: 2 }}>
                      {fmtDate(currentDay.date)}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={() => { setEditingDayId(currentDay.id); setEditDayForm({ label: currentDay.label, date: currentDay.date || '' }) }}
                    >
                      EDIT DAY
                    </button>
                    <button
                      className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => handleDeleteDay(currentDay.id)}
                    >
                      DELETE DAY
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Events list */}
          {dayEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 32 }}>
              No events yet. Add your first event to this day.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {dayEvents.map((ev, idx) => (
                <div
                  key={ev.id}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '16px 20px',
                    borderBottom: idx < dayEvents.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: canEdit ? 'grab' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,151,90,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* Time column */}
                  <div style={{
                    width: 80, flexShrink: 0, textAlign: 'right', paddingTop: 2,
                  }}>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600,
                      color: 'var(--deep)',
                    }}>
                      {fmtTime12(ev.time)}
                    </div>
                  </div>

                  {/* Timeline dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, flexShrink: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--gold)', border: '2px solid var(--white)',
                      boxShadow: '0 0 0 2px var(--gold)',
                    }} />
                    {idx < dayEvents.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'rgba(184,151,90,0.2)', marginTop: 4 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--deep)', marginBottom: 2 }}>
                      {ev.title}
                    </div>
                    {ev.location && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                        📍 {ev.location}
                      </div>
                    )}
                    {ev.assigned_to && (
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500, marginBottom: 2 }}>
                        → {ev.assigned_to}
                      </div>
                    )}
                    {ev.notes && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.5 }}>
                        {ev.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'flex-start' }}>
                    {googleCalUrl(ev, currentDay, wedding) && (
                      <a
                        href={googleCalUrl(ev, currentDay, wedding)}
                        target="_blank" rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{ fontSize: 10, padding: '4px 8px', textDecoration: 'none' }}
                        title="Add to Google Calendar"
                      >
                        📅
                      </a>
                    )}
                    {canEdit && (
                      <>
                        <button className="btn-icon" style={{ fontSize: 11 }} onClick={() => openEditEvent(ev)}>Edit</button>
                        <button className="btn-danger" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => handleDeleteEvent(ev.id)}>×</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add event button */}
          {canEdit && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={openAddEvent}>+ ADD EVENT</button>
            </div>
          )}
        </div>
      )}

      {/* ── Add/Edit Event Modal ── */}
      {addEventOpen && (
        <div className="modal-backdrop" onClick={() => { setAddEventOpen(false); setEditingEvent(null) }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">{editingEvent ? 'Edit Event' : 'Add Event'}</div>
              <button className="modal-close" onClick={() => { setAddEventOpen(false); setEditingEvent(null) }}>×</button>
            </div>
            <form onSubmit={handleSaveEvent} style={{ padding: '16px 24px 24px' }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>TIME *</label>
                  <input
                    type="time" value={eventForm.time}
                    onChange={e => setEventForm(p => ({ ...p, time: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>EVENT NAME *</label>
                  <input
                    type="text" value={eventForm.title}
                    onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Ceremony begins"
                    required autoFocus
                  />
                </div>
              </div>
              <div className="form-group">
                <label>LOCATION</label>
                <input
                  type="text" value={eventForm.location}
                  onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Garden Terrace"
                />
              </div>
              <div className="form-group">
                <label>ASSIGNED TO</label>
                <input
                  type="text" value={eventForm.assigned_to}
                  onChange={e => setEventForm(p => ({ ...p, assigned_to: e.target.value }))}
                  placeholder="Vendor or team member"
                  list="assign-options"
                />
                <datalist id="assign-options">
                  {assignOptions.map((name, i) => <option key={i} value={name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>NOTES</label>
                <textarea
                  value={eventForm.notes}
                  onChange={e => setEventForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  style={{ minHeight: 60 }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setAddEventOpen(false); setEditingEvent(null) }}>CANCEL</button>
                <button type="submit" className="btn btn-primary">
                  {editingEvent ? 'SAVE CHANGES' : 'ADD EVENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
