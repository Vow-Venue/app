import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { parseCSVRaw, findColumn, toCSV, downloadCSV } from '../lib/csv'

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

const VENDOR_CSV_COLUMNS = [
  { key: 'name',  label: 'Name' },
  { key: 'role',  label: 'Category' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes' },
]

function parseVendorCSV(text) {
  const { headers, rows } = parseCSVRaw(text)
  if (!headers.length) return []

  return rows.map(row => {
    const rawRole = findColumn(headers, row, 'category', 'role', 'type', 'service').toLowerCase()
    // fuzzy-match to known role values
    const role = ROLES.find(r =>
      r.value === rawRole || r.label.toLowerCase() === rawRole || r.label.toLowerCase().includes(rawRole)
    )?.value ?? 'other'

    return {
      name:  findColumn(headers, row, 'name', 'vendor', 'company', 'business'),
      role,
      phone: findColumn(headers, row, 'phone', 'telephone', 'tel', 'mobile', 'cell'),
      email: findColumn(headers, row, 'email', 'e-mail', 'email address'),
      notes: findColumn(headers, row, 'notes', 'note', 'details', 'description', 'comments'),
    }
  }).filter(v => v.name)
}

export default function VendorHub({ vendors, onAddVendor, onUpdateVendor, onDeleteVendor, onImportVendors }) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [form, setForm]                 = useState(BLANK_VENDOR)
  const [activeRole, setActiveRole]     = useState('all')
  const [importPreview, setImportPreview] = useState(null)
  const fileInputRef                      = useRef(null)

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

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportPreview({ vendors: parseVendorCSV(ev.target.result) })
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importPreview?.vendors?.length) return
    if (onImportVendors) await onImportVendors(importPreview.vendors)
    setImportPreview(null)
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = vendors.map(v => ({ ...v, role: roleLabel(v.role) }))
    downloadCSV('vendors.csv', toCSV(VENDOR_CSV_COLUMNS, data))
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

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handleExport}>
          ↓ EXPORT CSV
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => fileInputRef.current?.click()}>
          ↑ IMPORT CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
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

      {/* CSV Import Preview Modal */}
      <Modal isOpen={!!importPreview} onClose={() => setImportPreview(null)} title="Import Vendors from CSV">
        {importPreview && (
          <div>
            {importPreview.vendors.length === 0 ? (
              <div>
                <p style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0 8px' }}>
                  No valid vendors found in this file.
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
                  Make sure your CSV has a <strong>Name</strong> column in the first row.<br />
                  Other supported columns: Category, Phone, Email, Notes.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Found <strong>{importPreview.vendors.length} vendor{importPreview.vendors.length !== 1 ? 's' : ''}</strong> ready to import:
                </p>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  {importPreview.vendors.slice(0, 6).map((v, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderBottom: i < Math.min(5, importPreview.vendors.length - 1) ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'center', fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 500, flex: 1 }}>{v.name}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{roleLabel(v.role)}</span>
                      {v.email && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{v.email}</span>}
                    </div>
                  ))}
                  {importPreview.vendors.length > 6 && (
                    <div style={{ padding: '7px 12px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
                      + {importPreview.vendors.length - 6} more...
                    </div>
                  )}
                </div>
                <div style={{
                  background: 'rgba(184,151,90,0.07)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px', fontSize: 11,
                  color: 'var(--muted)', lineHeight: 1.6, marginBottom: 4,
                }}>
                  <strong>CSV column headers recognised:</strong> Name, Category/Role, Phone, Email, Notes.
                </div>
              </>
            )}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>CANCEL</button>
              {importPreview.vendors.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  IMPORT {importPreview.vendors.length} VENDOR{importPreview.vendors.length !== 1 ? 'S' : ''}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
