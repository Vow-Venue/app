import { useState, useEffect } from 'react'
import Modal from './Modal'

const BLANK_VENDOR = { name: '', role: 'photographer', phone: '', email: '', notes: '' }

const ROLES = [
  { value: 'photographer', label: 'Photographer' },
  { value: 'florist',      label: 'Florist' },
  { value: 'caterer',      label: 'Caterer' },
  { value: 'dj',           label: 'DJ / Entertainment' },
  { value: 'venue',        label: 'Venue' },
  { value: 'hair_makeup',  label: 'Hair & Makeup' },
  { value: 'transport',    label: 'Transportation' },
  { value: 'cake',         label: 'Cake / Bakery' },
  { value: 'other',        label: 'Other' },
]

const roleLabel = (val) => ROLES.find(r => r.value === val)?.label ?? val

export default function VendorHub({ vendors, onAddVendor, onUpdateVendor, onDeleteVendor }) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [form, setForm]                 = useState(BLANK_VENDOR)
  const [activeRole, setActiveRole]     = useState('all')

  useEffect(() => {
    setForm(editingVendor ?? BLANK_VENDOR)
  }, [editingVendor, modalOpen])

  const openAdd  = () => { setEditingVendor(null); setModalOpen(true) }
  const openEdit = (v) => { setEditingVendor(v); setModalOpen(true) }
  const close    = () => { setModalOpen(false); setEditingVendor(null) }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingVendor) {
      onUpdateVendor(editingVendor.id, form)
    } else {
      onAddVendor(form)
    }
    close()
  }

  // Count per role (only roles that have at least one vendor)
  const roleCounts = vendors.reduce((acc, v) => {
    acc[v.role] = (acc[v.role] || 0) + 1
    return acc
  }, {})

  const filtered = activeRole === 'all'
    ? vendors
    : vendors.filter(v => v.role === activeRole)

  return (
    <div>
      <div className="section-title">Vendor Hub</div>
      <div className="section-subtitle">{vendors.length} VENDORS HIRED</div>

      {/* Category chips */}
      <div className="chip-row">
        <button
          className={`chip ${activeRole === 'all' ? 'active' : ''}`}
          onClick={() => setActiveRole('all')}
          style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
        >
          ALL
        </button>
        {Object.entries(roleCounts).map(([role, count]) => (
          <button
            key={role}
            className={`chip ${activeRole === role ? 'active' : ''}`}
            onClick={() => setActiveRole(role)}
            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
          >
            {roleLabel(role).toUpperCase()} · {count}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openAdd}>+ ADD VENDOR</button>
      </div>

      {/* Vendor grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 40 }}>
          No vendors yet. Add your first vendor above.
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(v => (
            <div className="vendor-card" key={v.id}>
              <div className="vendor-role">{roleLabel(v.role).toUpperCase()}</div>
              <div className="vendor-name">{v.name}</div>
              <div className="vendor-contact">
                {v.phone && <div>{v.phone}</div>}
                {v.email && <div>{v.email}</div>}
                {v.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', color: 'var(--muted)' }}>
                    {v.notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => openEdit(v)}>EDIT</button>
                <button className="btn-danger" onClick={() => onDeleteVendor(v.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={close} title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>VENDOR NAME *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Blossom Florals" />
          </div>
          <div className="form-group">
            <label>CATEGORY</label>
            <select name="role" value={form.role} onChange={handleChange}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>PHONE</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="555-0101" />
            </div>
            <div className="form-group">
              <label>EMAIL</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="vendor@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label>NOTES</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Contract details, special requests..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>CANCEL</button>
            <button type="submit" className="btn btn-primary">
              {editingVendor ? 'SAVE CHANGES' : 'ADD VENDOR'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
