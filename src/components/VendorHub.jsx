import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { parseCSVRaw, findColumn, toCSV, downloadCSV } from '../lib/csv'

const BLANK_VENDOR = { name: '', role: 'photographer', phone: '', email: '', notes: '', amount: '', dueDate: '', paid: false }

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

const fmt = (amount) =>
  Number(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const isOverdue = (v) => {
  if (v.paid) return false
  if (!v.dueDate) return false
  return new Date(v.dueDate + 'T00:00:00') < new Date()
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const VENDOR_CSV_COLUMNS = [
  { key: 'name',    label: 'Name' },
  { key: 'role',    label: 'Category' },
  { key: 'phone',   label: 'Phone' },
  { key: 'email',   label: 'Email' },
  { key: 'notes',   label: 'Notes' },
  { key: 'amount',  label: 'Amount' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'paid',    label: 'Paid' },
]

function parseVendorCSV(text) {
  const { headers, rows } = parseCSVRaw(text)
  if (!headers.length) return []

  return rows.map(row => {
    const rawRole = findColumn(headers, row, 'category', 'role', 'type', 'service').toLowerCase()
    const role = ROLES.find(r =>
      r.value === rawRole || r.label.toLowerCase() === rawRole || r.label.toLowerCase().includes(rawRole)
    )?.value ?? 'other'

    const rawPaid = findColumn(headers, row, 'paid', 'payment status', 'status').toLowerCase()
    const paid = ['yes', 'true', 'paid', '1'].includes(rawPaid)

    return {
      name:    findColumn(headers, row, 'name', 'vendor', 'company', 'business'),
      role,
      phone:   findColumn(headers, row, 'phone', 'telephone', 'tel', 'mobile', 'cell'),
      email:   findColumn(headers, row, 'email', 'e-mail', 'email address'),
      notes:   findColumn(headers, row, 'notes', 'note', 'details', 'description', 'comments'),
      amount:  Number(findColumn(headers, row, 'amount', 'price', 'cost', 'total', 'invoice').replace(/[^0-9.]/g, '')) || 0,
      dueDate: findColumn(headers, row, 'due date', 'due', 'payment date', 'date'),
      paid,
    }
  }).filter(v => v.name)
}

export default function VendorHub({ vendors, onAddVendor, onUpdateVendor, onDeleteVendor, onImportVendors, budget, onSetBudget }) {
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [form, setForm]                   = useState(BLANK_VENDOR)
  const [activeRole, setActiveRole]       = useState('all')
  const [importPreview, setImportPreview] = useState(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput]     = useState('')
  const fileInputRef                      = useRef(null)

  useEffect(() => {
    setForm(editingVendor ? { ...editingVendor, amount: editingVendor.amount || '' } : BLANK_VENDOR)
  }, [editingVendor, modalOpen])

  const openAdd  = () => { setEditingVendor(null); setModalOpen(true) }
  const openEdit = (v) => { setEditingVendor(v); setModalOpen(true) }
  const close    = () => { setModalOpen(false); setEditingVendor(null) }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, amount: Number(form.amount) || 0 }
    if (editingVendor) {
      onUpdateVendor(editingVendor.id, data)
    } else {
      onAddVendor(data)
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
    const data = vendors.map(v => ({ ...v, role: roleLabel(v.role), paid: v.paid ? 'Yes' : 'No' }))
    downloadCSV('vendors.csv', toCSV(VENDOR_CSV_COLUMNS, data))
  }

  // ── Budget summary calcs ──────────────────────────────────────────────────
  const totalCommitted = vendors.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
  const totalPaid      = vendors.filter(v => v.paid).reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
  const totalUnpaid    = totalCommitted - totalPaid
  const remaining      = budget - totalPaid
  const paidPct        = budget > 0 ? Math.min((totalPaid / budget) * 100, 100) : 0
  const committedPct   = budget > 0 ? Math.min((totalCommitted / budget) * 100, 100) : 0

  const handleSaveBudget = () => {
    const val = Number(budgetInput.replace(/[^0-9.]/g, '')) || 0
    onSetBudget(val)
    setEditingBudget(false)
  }

  // Count per role
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

      {/* ── Budget Summary ─────────────────────────────────────────────────── */}
      <div className="vendor-budget-card">
        <div className="vendor-budget-header">
          <div>
            <div className="vendor-budget-label">WEDDING BUDGET</div>
            {editingBudget ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: 'var(--muted)' }}>$</span>
                <input
                  type="text"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()}
                  placeholder="25,000"
                  autoFocus
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, border: 'none', borderBottom: '2px solid var(--gold)', outline: 'none', background: 'transparent', width: 120, padding: '2px 0' }}
                />
                <button className="btn btn-primary" style={{ fontSize: 10, padding: '4px 12px' }} onClick={handleSaveBudget}>SET</button>
                <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => setEditingBudget(false)}>CANCEL</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="vendor-budget-amount">{budget > 0 ? fmt(budget) : 'Not set'}</span>
                <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setBudgetInput(budget > 0 ? budget.toString() : ''); setEditingBudget(true) }}>
                  {budget > 0 ? 'EDIT' : 'SET BUDGET'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {budget > 0 && (
          <div className="vendor-budget-progress-wrap">
            <div className="vendor-budget-progress-bar">
              <div className="vendor-budget-progress-paid" style={{ width: `${paidPct}%` }} />
              <div className="vendor-budget-progress-committed" style={{ width: `${Math.max(committedPct - paidPct, 0)}%` }} />
            </div>
            <div className="vendor-budget-progress-labels">
              <span>{Math.round(paidPct)}% paid</span>
              <span>{Math.round(committedPct)}% committed</span>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="vendor-budget-stats">
          <div className="vendor-budget-stat">
            <div className="vendor-budget-stat-value" style={{ color: '#2e7d32' }}>{fmt(totalPaid)}</div>
            <div className="vendor-budget-stat-label">PAID</div>
          </div>
          <div className="vendor-budget-stat">
            <div className="vendor-budget-stat-value" style={{ color: 'var(--rose)' }}>{fmt(totalUnpaid)}</div>
            <div className="vendor-budget-stat-label">OUTSTANDING</div>
          </div>
          <div className="vendor-budget-stat">
            <div className="vendor-budget-stat-value">{fmt(totalCommitted)}</div>
            <div className="vendor-budget-stat-label">TOTAL COMMITTED</div>
          </div>
          {budget > 0 && (
            <div className="vendor-budget-stat">
              <div className="vendor-budget-stat-value" style={{ color: remaining >= 0 ? '#2e7d32' : '#c62828' }}>
                {remaining >= 0 ? fmt(remaining) : `-${fmt(Math.abs(remaining))}`}
              </div>
              <div className="vendor-budget-stat-label">{remaining >= 0 ? 'REMAINING' : 'OVER BUDGET'}</div>
            </div>
          )}
        </div>
      </div>

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
          {filtered.map(v => {
            const overdue = isOverdue(v)
            return (
              <div className={`vendor-card ${v.paid ? 'vendor-card-paid' : ''} ${overdue ? 'vendor-card-overdue' : ''}`} key={v.id}>
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

                {/* Payment info */}
                {(Number(v.amount) > 0 || v.dueDate) && (
                  <div className="vendor-payment">
                    {Number(v.amount) > 0 && (
                      <div className="vendor-amount">{fmt(v.amount)}</div>
                    )}
                    {v.dueDate && (
                      <div className={`vendor-due ${overdue ? 'vendor-due-overdue' : ''}`}>
                        {overdue ? 'OVERDUE — ' : 'Due '}
                        {formatDate(v.dueDate)}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="vendor-card-actions">
                  <button
                    className={`vendor-paid-toggle ${v.paid ? 'vendor-paid-active' : ''}`}
                    onClick={() => onUpdateVendor(v.id, { paid: !v.paid })}
                    title={v.paid ? 'Mark as unpaid' : 'Mark as paid'}
                  >
                    {v.paid ? 'PAID' : 'MARK PAID'}
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-ghost" onClick={() => openEdit(v)}>EDIT</button>
                  <button className="btn-danger" onClick={() => onDeleteVendor(v.id)}>×</button>
                </div>
              </div>
            )
          })}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>AMOUNT ($)</label>
              <input name="amount" type="number" min="0" step="1" value={form.amount} onChange={handleChange} placeholder="0" />
            </div>
            <div className="form-group">
              <label>PAYMENT DUE DATE</label>
              <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input name="paid" type="checkbox" checked={form.paid} onChange={handleChange} id="vendor-paid-check" style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
            <label htmlFor="vendor-paid-check" style={{ margin: 0, cursor: 'pointer' }}>MARK AS PAID</label>
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
                  Other supported columns: Category, Phone, Email, Notes, Amount, Due Date, Paid.
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
                      {v.amount > 0 && <span style={{ color: 'var(--deep)', fontSize: 11, fontWeight: 500 }}>{fmt(v.amount)}</span>}
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
                  <strong>CSV column headers recognised:</strong> Name, Category/Role, Phone, Email, Notes, Amount, Due Date, Paid.
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
