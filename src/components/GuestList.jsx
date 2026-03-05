import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import SeatingChart from './SeatingChart'

const BLANK_GUEST = { name: '', email: '', rsvp: 'pending', dietary: '', tableId: '', guestRole: '' }

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const parseLine = (line) => {
    const result = []
    let cell = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        result.push(cell.trim()); cell = ''
      } else {
        cell += ch
      }
    }
    result.push(cell.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim())

  const find = (row, ...names) => {
    for (const name of names) {
      const i = headers.findIndex(h => h === name || h.includes(name))
      if (i !== -1 && row[i] != null) return row[i].replace(/^"|"$/g, '').trim()
    }
    return ''
  }

  return lines.slice(1).map(line => {
    const row = parseLine(line)
    const rsvpRaw = find(row, 'rsvp', 'status', 'response', 'attending').toLowerCase()
    const rsvp = ['yes', 'confirmed', 'accepted', 'attending', 'y'].includes(rsvpRaw) ? 'yes'
               : ['no', 'declined', 'not attending', 'regrets', 'n'].includes(rsvpRaw) ? 'no'
               : 'pending'
    return {
      name:      find(row, 'name', 'full name', 'guest name', 'guest'),
      email:     find(row, 'email', 'e-mail', 'email address'),
      rsvp,
      dietary:   find(row, 'dietary', 'diet', 'food', 'restrictions', 'meal preference'),
      guestRole: find(row, 'role', 'title', 'relationship', 'type', 'party'),
    }
  }).filter(g => g.name)
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GuestList({
  guests, tables,
  onAddGuest, onUpdateGuest, onDeleteGuest,
  onAddTable, onDeleteTable, onUpdateTable,
  onImportGuests,
}) {
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingGuest, setEditingGuest]   = useState(null)
  const [form, setForm]                   = useState(BLANK_GUEST)
  const [rsvpFilter, setRsvpFilter]       = useState('all')
  const [view, setView]                   = useState('list')
  const [importPreview, setImportPreview] = useState(null) // { guests: [] } | null
  const fileInputRef                      = useRef(null)

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

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      setImportPreview({ guests: parsed })
      e.target.value = '' // reset so same file can be re-selected
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importPreview?.guests?.length) return
    if (onImportGuests) await onImportGuests(importPreview.guests)
    setImportPreview(null)
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const confirmed = guests.filter(g => g.rsvp === 'yes').length
  const pending   = guests.filter(g => g.rsvp === 'pending').length
  const declined  = guests.filter(g => g.rsvp === 'no').length

  const filtered = rsvpFilter === 'all'
    ? guests
    : guests.filter(g => g.rsvp === rsvpFilter)

  // ── Seating view ────────────────────────────────────────────────────────────
  if (view === 'seating') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>Seating Chart</div>
            <div className="section-subtitle">
              {guests.length} GUESTS · {guests.filter(g => g.tableId).length} SEATED · {guests.filter(g => !g.tableId).length} UNASSIGNED
            </div>
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

  // ── Guest list view ─────────────────────────────────────────────────────────
  return (
    <div>
      <div className="section-title">Guest List</div>
      <div className="section-subtitle">
        {guests.length} GUESTS · {confirmed} CONFIRMED · {pending} PENDING · {declined} DECLINED
      </div>

      {/* Filter + Actions */}
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setView('seating')}>
            ⬡ SEATING CHART
          </button>
          <button
            className="btn btn-ghost no-print"
            style={{ fontSize: 11 }}
            onClick={() => window.print()}
            title="Print or save as PDF"
          >
            ↓ PRINT LIST
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => fileInputRef.current?.click()}
            title="Import guests from a CSV file"
          >
            ↑ IMPORT CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
      <Modal isOpen={modalOpen} onClose={close} title={editingGuest ? 'Edit Guest' : 'Add Guest'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>FULL NAME *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Emma Wilson" autoFocus />
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

      {/* CSV Import Preview Modal */}
      <Modal isOpen={!!importPreview} onClose={() => setImportPreview(null)} title="Import Guests from CSV">
        {importPreview && (
          <div>
            {importPreview.guests.length === 0 ? (
              <div>
                <p style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0 8px' }}>
                  No valid guests found in this file.
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
                  Make sure your CSV has a <strong>Name</strong> column in the first row.<br />
                  Other supported columns: Email, RSVP, Dietary, Role.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Found <strong>{importPreview.guests.length} guest{importPreview.guests.length !== 1 ? 's' : ''}</strong> ready to import:
                </p>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  {importPreview.guests.slice(0, 6).map((g, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderBottom: i < Math.min(5, importPreview.guests.length - 1) ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'center', fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 500, flex: 1 }}>{g.name}</span>
                      {g.email && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{g.email}</span>}
                      {g.dietary && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{g.dietary}</span>}
                      <span className={`badge rsvp-${g.rsvp}`} style={{ fontSize: 10 }}>
                        {g.rsvp === 'yes' ? 'CONFIRMED' : g.rsvp === 'no' ? 'DECLINED' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                  {importPreview.guests.length > 6 && (
                    <div style={{ padding: '7px 12px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
                      + {importPreview.guests.length - 6} more...
                    </div>
                  )}
                </div>
                <div style={{
                  background: 'rgba(184,151,90,0.07)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 11,
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}>
                  <strong>CSV column headers recognised:</strong> Name, Email, RSVP (yes / no / pending), Dietary, Role.<br />
                  Duplicate names will be added as separate entries.
                </div>
              </>
            )}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>CANCEL</button>
              {importPreview.guests.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  IMPORT {importPreview.guests.length} GUEST{importPreview.guests.length !== 1 ? 'S' : ''}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
