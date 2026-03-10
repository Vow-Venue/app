import { useState, useRef, useCallback } from 'react'

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const fmtDateFull = (d) => {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const month = dt.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  const day = ordinal(dt.getDate())
  const year = dt.getFullYear()
  return `${weekday}, ${month} ${day}, ${year}`
}

const fmtDateShort = (d) => {
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
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const pad = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Wedding Event',
    dates: `${pad(start)}/${pad(end)}`,
    details: [event.notes, couple ? `Wedding: ${couple}` : ''].filter(Boolean).join('\n'),
    location: [event.location, event.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function DayOfTimeline({
  days, events, wedding, vendors, collaborators, guests = [],
  onAddDay, onUpdateDay, onDeleteDay,
  onAddEvent, onUpdateEvent, onDeleteEvent, onReorderEvents,
  canEdit = true,
}) {
  const [activeDay, setActiveDay] = useState(null)
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [dayForm, setDayForm] = useState({ label: '', date: '', description: '' })
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState({ time: '12:00', title: '', location: '', address: '', assignees: [], notes: '' })
  const [editingDayId, setEditingDayId] = useState(null)
  const [editDayForm, setEditDayForm] = useState({ label: '', date: '', description: '' })
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  // Auto-select first day
  const activeDayId = activeDay || (days.length > 0 ? days[0].id : null)
  const currentDay = days.find(d => d.id === activeDayId)
  const dayEvents = events
    .filter(e => e.day_id === activeDayId)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Combined assignee pool from vendors, collaborators, and guests
  const assigneePool = [
    ...vendors.map(v => ({ type: 'vendor', id: v.id, name: v.name, label: v.role || 'Vendor' })),
    ...collaborators.map(c => ({ type: 'collaborator', id: c.id, name: c.name, label: 'Team' })),
    ...guests.filter(g => g.name).map(g => ({ type: 'guest', id: g.id, name: g.name, label: 'Guest' })),
  ]

  // Resolve assignee objects from stored array
  const resolveAssignees = (assignees) => {
    if (!assignees || !Array.isArray(assignees)) return []
    return assignees.map(a => {
      if (typeof a === 'object' && a.type && a.id) {
        const match = assigneePool.find(p => p.id === a.id && p.type === a.type)
        return match || a
      }
      // Backward compat: plain vendor ID string
      if (typeof a === 'string') {
        const match = vendors.find(v => v.id === a)
        if (match) return { type: 'vendor', id: match.id, name: match.name, label: match.role || 'Vendor' }
      }
      return null
    }).filter(Boolean)
  }

  // ── Day CRUD ──
  const handleAddDay = async (e) => {
    e.preventDefault()
    if (!dayForm.label.trim()) return
    const created = await onAddDay({ label: dayForm.label.trim(), date: dayForm.date || null, description: dayForm.description.trim() || null })
    if (created) setActiveDay(created.id)
    setDayForm({ label: '', date: '', description: '' })
    setAddDayOpen(false)
  }

  const handleSaveDayEdit = async () => {
    if (!editDayForm.label.trim()) return
    await onUpdateDay(editingDayId, { label: editDayForm.label.trim(), date: editDayForm.date || null, description: editDayForm.description?.trim() || null })
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
    setEventForm({ time: '12:00', title: '', location: '', address: '', assignees: [], notes: '' })
    setAddEventOpen(true)
  }

  const openEditEvent = (ev) => {
    setEditingEvent(ev)
    // Normalize assignees from DB (could be old vendor IDs or new {type, id} objects)
    const normalized = resolveAssignees(ev.assignees || [])
    // Also include vendor_id if set and not already in assignees (backward compat)
    if (ev.vendor_id && !normalized.some(a => a.id === ev.vendor_id)) {
      const v = vendors.find(v => v.id === ev.vendor_id)
      if (v) normalized.unshift({ type: 'vendor', id: v.id, name: v.name, label: v.role || 'Vendor' })
    }
    setEventForm({
      time: ev.time || '12:00', title: ev.title || '', location: ev.location || '',
      address: ev.address || '', assignees: normalized, notes: ev.notes || '',
    })
    setAddEventOpen(true)
  }

  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!eventForm.title.trim()) return
    const payload = {
      time: eventForm.time,
      title: eventForm.title,
      location: eventForm.location || null,
      address: eventForm.address || null,
      notes: eventForm.notes || null,
      assignees: eventForm.assignees.map(a => ({ type: a.type, id: a.id })),
      vendor_id: null,
    }
    if (editingEvent) {
      await onUpdateEvent(editingEvent.id, payload)
    } else {
      await onAddEvent({ day_id: activeDayId, ...payload })
    }
    setAddEventOpen(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (id) => {
    await onDeleteEvent(id)
  }

  const addAssignee = (poolItem) => {
    if (!poolItem) return
    setEventForm(p => ({
      ...p,
      assignees: [...p.assignees, poolItem],
    }))
  }

  const removeAssignee = (idx) => {
    setEventForm(p => ({
      ...p,
      assignees: p.assignees.filter((_, i) => i !== idx),
    }))
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

  const handlePrint = () => window.print()

  // IDs already assigned in the current form
  const assignedIds = new Set(eventForm.assignees.map(a => a.id))
  const availablePool = assigneePool.filter(p => !assignedIds.has(p.id))

  return (
    <div>
      <div className="section-title">Day-of Timeline</div>
      <div className="section-subtitle">PLAN EVERY MOMENT OF YOUR CELEBRATION</div>

      {/* ── Day Tabs ── */}
      <div className="chip-row no-print" style={{ marginBottom: 20, alignItems: 'center' }}>
        {days.map(d => (
          <button
            key={d.id}
            className={`chip ${d.id === activeDayId ? 'active' : ''}`}
            onClick={() => setActiveDay(d.id)}
          >
            {d.label}
            {d.date && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>{fmtDateShort(d.date)}</span>}
          </button>
        ))}
        {canEdit && (
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setAddDayOpen(true)}>
            + ADD DAY
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handlePrint}>
            PRINT TIMELINE
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
              <div className="form-group">
                <label>DESCRIPTION</label>
                <input
                  type="text" value={dayForm.description}
                  onChange={e => setDayForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Friday evening events"
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
          {editingDayId === currentDay.id ? (
            <div style={{ marginBottom: 24 }}>
              <div className="tl-edit-row" style={{ marginBottom: 8 }}>
                <input
                  type="text" value={editDayForm.label}
                  onChange={e => setEditDayForm(p => ({ ...p, label: e.target.value }))}
                  style={{ flex: 1, fontSize: 14 }}
                  placeholder="Day label"
                  autoFocus
                />
                <input
                  type="date" value={editDayForm.date}
                  onChange={e => setEditDayForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: 160 }}
                />
              </div>
              <div className="tl-edit-row">
                <input
                  type="text" value={editDayForm.description || ''}
                  onChange={e => setEditDayForm(p => ({ ...p, description: e.target.value }))}
                  style={{ flex: 1, fontSize: 13 }}
                  placeholder="Short description (e.g. Friday evening events)"
                />
                <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleSaveDayEdit}>SAVE</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingDayId(null)}>CANCEL</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                {currentDay.date && (
                  <div className="tl-date">{fmtDateFull(currentDay.date)}</div>
                )}
                <div className="tl-section-bar">{currentDay.label}</div>
                {currentDay.description && (
                  <div className="tl-section-desc">{currentDay.description}</div>
                )}
              </div>
              {canEdit && (
                <div className="tl-day-actions no-print">
                  <button
                    className="btn btn-ghost" style={{ fontSize: 11 }}
                    onClick={() => { setEditingDayId(currentDay.id); setEditDayForm({ label: currentDay.label, date: currentDay.date || '', description: currentDay.description || '' }) }}
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
            </div>
          )}

          {/* Events list */}
          {dayEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 32 }}>
              No events yet. Add your first event to this day.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {dayEvents.map((ev, idx) => {
                const resolved = resolveAssignees(ev.assignees)
                // Backward compat: include vendor_id if not in assignees
                if (ev.vendor_id && !resolved.some(a => a.id === ev.vendor_id)) {
                  const v = vendors.find(v => v.id === ev.vendor_id)
                  if (v) resolved.unshift({ type: 'vendor', id: v.id, name: v.name, label: v.role || 'Vendor' })
                }
                return (
                  <div
                    key={ev.id}
                    className={`tl-event-row ${canEdit ? '' : 'readonly'}`}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                  >
                    <div className="tl-event-time">{fmtTime12(ev.time)}</div>

                    <div className="tl-event-dot">
                      <div className="tl-dot-circle" />
                      {idx < dayEvents.length - 1 && <div className="tl-dot-line" />}
                    </div>

                    <div className="tl-event-body">
                      <div className="tl-event-title">{ev.title}</div>
                      {(ev.location || ev.address) && (
                        <div className="tl-event-address">
                          {ev.location && <>📍 {ev.location}</>}
                          {ev.location && ev.address && ' — '}
                          {ev.address}
                        </div>
                      )}
                      {ev.notes && <div className="tl-event-desc">{ev.notes}</div>}
                      {resolved.length > 0 && (
                        <div className="tl-event-pills">
                          {resolved.map((a, i) => (
                            <span key={i} className="tl-pill" data-type={a.type}>
                              {a.name}{a.label ? ` (${a.label})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {resolved.length === 0 && ev.assigned_to && (
                        <div className="tl-event-pills">
                          <span className="tl-pill">{ev.assigned_to}</span>
                        </div>
                      )}
                    </div>

                    <div className="tl-event-actions no-print">
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
                )
              })}
            </div>
          )}

          {/* Add event button */}
          {canEdit && (
            <div className="no-print" style={{ marginTop: 16 }}>
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
                <label>ADDRESS</label>
                <input
                  type="text" value={eventForm.address}
                  onChange={e => setEventForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. 123 Main St, Austin TX"
                />
              </div>
              <div className="form-group">
                <label>ASSIGNEES</label>
                {eventForm.assignees.length > 0 && (
                  <div className="tl-event-pills" style={{ marginBottom: 8 }}>
                    {eventForm.assignees.map((a, i) => (
                      <span key={i} className="tl-pill" data-type={a.type}>
                        {a.name}{a.label ? ` (${a.label})` : ''}
                        <button type="button" className="tl-pill-remove" onClick={() => removeAssignee(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {availablePool.length > 0 && (
                  <select
                    value=""
                    onChange={e => {
                      const selected = availablePool.find(p => `${p.type}:${p.id}` === e.target.value)
                      if (selected) addAssignee(selected)
                    }}
                  >
                    <option value="">+ Add vendor, team member, or guest...</option>
                    {vendors.length > 0 && availablePool.filter(p => p.type === 'vendor').length > 0 && (
                      <optgroup label="Vendors">
                        {availablePool.filter(p => p.type === 'vendor').map(p => (
                          <option key={p.id} value={`${p.type}:${p.id}`}>{p.name}{p.label ? ` — ${p.label}` : ''}</option>
                        ))}
                      </optgroup>
                    )}
                    {collaborators.length > 0 && availablePool.filter(p => p.type === 'collaborator').length > 0 && (
                      <optgroup label="Team">
                        {availablePool.filter(p => p.type === 'collaborator').map(p => (
                          <option key={p.id} value={`${p.type}:${p.id}`}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {guests.length > 0 && availablePool.filter(p => p.type === 'guest').length > 0 && (
                      <optgroup label="Guests">
                        {availablePool.filter(p => p.type === 'guest').map(p => (
                          <option key={p.id} value={`${p.type}:${p.id}`}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
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
