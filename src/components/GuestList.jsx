import { useState, useEffect } from 'react'
import Modal from './Modal'
import SeatingChart from './SeatingChart'

const BLANK_GUEST = { name: '', email: '', rsvp: 'pending', dietary: '', tableId: '', guestRole: '' }

export default function GuestList({
  guests, tables,
  onAddGuest, onUpdateGuest, onDeleteGuest,
  onAddTable, onDeleteTable, onUpdateTable,
}) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [form, setForm]                 = useState(BLANK_GUEST)
  const [rsvpFilter, setRsvpFilter]     = useState('all')
  const [newTableName, setNewTableName] = useState('')
  const [view, setView]                 = useState('list') // 'list' | 'seating'

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

  if (view === 'seating') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>Seating Chart</div>
            <div className="section-subtitle">{guests.length} GUESTS · {guests.filter(g => g.tableId).length} SEATED · {guests.filter(g => !g.tableId).length} UNASSIGNED</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setView('list')}>← GUEST LIST</button>
        </div>
        <SeatingChart
          guests={guests}
          tables={tables}
          onUpdateGuest={onUpdateGuest}
          onUpdateTable={onUpdateTable}
          onAddTable={onAddTable}
          onDeleteTable={onDeleteTable}
        />
      </div>
    )
  }

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setView('seating')}>
            ⬡ SEATING CHART
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + ADD GUEST
          </button>
        </div>
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
