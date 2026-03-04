import { useState, useEffect } from 'react'
import Modal from './Modal'

const BLANK_GUEST = { name: '', email: '', rsvp: 'pending', dietary: '', tableId: '', guestRole: '' }

export default function GuestList({
  guests, tables,
  onAddGuest, onUpdateGuest, onDeleteGuest,
  onAddTable, onDeleteTable,
}) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [form, setForm]                 = useState(BLANK_GUEST)
  const [rsvpFilter, setRsvpFilter]     = useState('all')
  const [newTableName, setNewTableName] = useState('')

  useEffect(() => {
    setForm(editingGuest
      ? { ...editingGuest, tableId: editingGuest.tableId || '', guestRole: editingGuest.guestRole || '' }
      : BLANK_GUEST
    )
  }, [editingGuest, modalOpen])

  const openAdd  = () => { setEditingGuest(null); setModalOpen(true) }
  const openEdit = (g) => { setEditingGuest(g); setModalOpen(true) }
  const close    = () => { setModalOpen(false); setEditingGuest(null) }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, tableId: form.tableId || null }
    if (editingGuest) {
      onUpdateGuest(editingGuest.id, data)
    } else {
      onAddGuest(data)
    }
    close()
  }

  const handleAddTable = () => {
    const name = newTableName.trim()
    if (!name) return
    onAddTable({ name })
    setNewTableName('')
  }

  const confirmed = guests.filter(g => g.rsvp === 'yes').length
  const pending   = guests.filter(g => g.rsvp === 'pending').length
  const declined  = guests.filter(g => g.rsvp === 'no').length

  const filtered = rsvpFilter === 'all'
    ? guests
    : guests.filter(g => g.rsvp === rsvpFilter)

  const seatMap = tables.map(t => ({
    ...t,
    guests: guests.filter(g => g.tableId === t.id),
  }))
  const unassigned = guests.filter(g => !g.tableId)

  return (
    <div>
      <div className="section-title">Guest List</div>
      <div className="section-subtitle">
        {guests.length} GUESTS · {confirmed} CONFIRMED · {pending} PENDING · {declined} DECLINED
      </div>

      {/* Filter + Add */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="chip-row" style={{ margin: 0 }}>
          {['all', 'yes', 'pending', 'no'].map(f => (
            <button
              key={f}
              className={`chip ${rsvpFilter === f ? 'active' : ''}`}
              onClick={() => setRsvpFilter(f)}
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            >
              {f === 'all' ? 'ALL' : f === 'yes' ? 'CONFIRMED' : f === 'no' ? 'DECLINED' : 'PENDING'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
          + ADD GUEST
        </button>
      </div>

      {/* Guest table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="guest-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>ROLE / TITLE</th>
              <th>EMAIL</th>
              <th>TABLE</th>
              <th>DIETARY</th>
              <th>RSVP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 24 }}>
                  No guests found.
                </td>
              </tr>
            ) : filtered.map(g => {
              const table = tables.find(t => t.id === g.tableId)
              return (
                <tr key={g.id}>
                  <td style={{ fontWeight: 500 }}>{g.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{g.guestRole || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{g.email || '—'}</td>
                  <td>{table ? table.name : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                  <td style={{ color: 'var(--muted)' }}>{g.dietary || '—'}</td>
                  <td>
                    <span className={`badge rsvp-${g.rsvp}`}>
                      {g.rsvp === 'yes' ? 'CONFIRMED' : g.rsvp === 'no' ? 'DECLINED' : 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => openEdit(g)}>Edit</button>
                      <button className="btn-danger" onClick={() => onDeleteGuest(g.id)}>×</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Seating Overview */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontStyle: 'italic' }}>
            Seating Overview
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="New table name"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTable()}
              style={{ width: 180, flex: 'none' }}
            />
            <button className="btn btn-ghost" onClick={handleAddTable}>+ TABLE</button>
          </div>
        </div>

        <div className="seating-grid">
          {seatMap.map(t => (
            <div className="seating-table-card" key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="seating-table-name">{t.name.toUpperCase()}</div>
                <button
                  className="btn-danger"
                  style={{ fontSize: 14, padding: '0 4px' }}
                  onClick={() => onDeleteTable(t.id)}
                  title="Delete table"
                >×</button>
              </div>
              {t.guests.length === 0 ? (
                <div className="seating-empty">Empty</div>
              ) : (
                t.guests.map(g => (
                  <div key={g.id} className="seating-guest-name">
                    {g.name}
                    {g.guestRole && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>· {g.guestRole}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
          {unassigned.length > 0 && (
            <div className="seating-table-card" style={{ borderStyle: 'dashed' }}>
              <div className="seating-table-name" style={{ color: 'var(--muted)' }}>UNASSIGNED</div>
              {unassigned.map(g => (
                <div key={g.id} className="seating-guest-name" style={{ color: 'var(--muted)' }}>{g.name}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={close}
        title={editingGuest ? 'Edit Guest' : 'Add Guest'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>FULL NAME *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Emma Wilson" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>ROLE / TITLE</label>
              <input name="guestRole" type="text" value={form.guestRole} onChange={handleChange} placeholder="e.g. Groomsman, Maid of Honor" />
            </div>
            <div className="form-group">
              <label>EMAIL</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="guest@example.com" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>RSVP STATUS</label>
              <select name="rsvp" value={form.rsvp} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="yes">Confirmed</option>
                <option value="no">Declined</option>
              </select>
            </div>
            <div className="form-group">
              <label>TABLE ASSIGNMENT</label>
              <select name="tableId" value={form.tableId} onChange={handleChange}>
                <option value="">Unassigned</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>DIETARY REQUIREMENTS</label>
            <input name="dietary" type="text" value={form.dietary} onChange={handleChange} placeholder="e.g. Vegetarian, Gluten-free" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>CANCEL</button>
            <button type="submit" className="btn btn-primary">
              {editingGuest ? 'SAVE CHANGES' : 'ADD GUEST'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
