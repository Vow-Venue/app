import { useState, useEffect } from 'react'
import Modal from './Modal'

const BLANK_INVOICE = {
  invoiceNumber: '', vendorName: '', amount: '', dueDate: '',
  status: 'unpaid', notes: '', fileName: null, fileUrl: null,
}

const fmt = (amount) =>
  Number(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const fmtDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const isOverdue = (invoice) => {
  if (invoice.status === 'paid') return false
  if (!invoice.dueDate) return false
  return new Date(invoice.dueDate + 'T00:00:00') < new Date()
}

export default function Billing({ invoices, onAddInvoice, onUpdateInvoice, onDeleteInvoice }) {
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [form, setForm]                   = useState(BLANK_INVOICE)
  const [filter, setFilter]               = useState('all')

  useEffect(() => {
    setForm(editingInvoice ?? BLANK_INVOICE)
  }, [editingInvoice, modalOpen])

  const openAdd  = () => { setEditingInvoice(null); setModalOpen(true) }
  const openEdit = (inv) => { setEditingInvoice(inv); setModalOpen(true) }
  const close    = () => { setModalOpen(false); setEditingInvoice(null) }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm(prev => ({ ...prev, fileName: file.name, fileUrl: url }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, amount: Number(form.amount) || 0 }
    if (editingInvoice) {
      onUpdateInvoice(editingInvoice.id, data)
    } else {
      onAddInvoice(data)
    }
    close()
  }

  const markPaid = (inv) =>
    onUpdateInvoice(inv.id, { status: 'paid' })

  // Computed totals
  const outstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)
  const totalAll = invoices.reduce((s, i) => s + Number(i.amount), 0)

  // Auto-flag overdue on render (read-only flag, doesn't mutate state)
  const enriched = invoices.map(inv => ({
    ...inv,
    displayStatus: isOverdue(inv) ? 'overdue' : inv.status,
  }))

  const filtered = enriched.filter(inv => {
    if (filter === 'all') return true
    return inv.displayStatus === filter
  })

  return (
    <div>
      <div className="section-title">Billing &amp; Invoices</div>
      <div className="section-subtitle">{invoices.length} INVOICES · {fmt(totalAll)} TOTAL</div>

      {/* Summary */}
      <div className="billing-summary">
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: 26, color: 'var(--rose)' }}>{fmt(outstanding)}</div>
          <div className="stat-label">OUTSTANDING</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: 26, color: '#2e7d32' }}>{fmt(totalPaid)}</div>
          <div className="stat-label">PAID</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: 26 }}>{fmt(totalAll)}</div>
          <div className="stat-label">TOTAL BUDGET</div>
        </div>
      </div>

      {/* Filters + Add */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="chip-row" style={{ margin: 0 }}>
          {['all', 'unpaid', 'paid', 'overdue'].map(f => (
            <button
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
          + UPLOAD INVOICE
        </button>
      </div>

      {/* Invoice list */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 40 }}>
            No invoices found.
          </div>
        ) : filtered.map(inv => (
          <div key={inv.id} className="invoice-row">
            <div className="invoice-main">
              <div className="invoice-number">{inv.invoiceNumber}</div>
              <div className="invoice-vendor">{inv.vendorName}</div>
              {inv.notes && <div className="invoice-notes">{inv.notes}</div>}
              {inv.fileName && (
                <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>📎</span>
                  <span>{inv.fileName}</span>
                </div>
              )}
            </div>

            <div className="invoice-right">
              <div className="invoice-amount">{fmt(inv.amount)}</div>
              <div className="invoice-due">Due {fmtDate(inv.dueDate)}</div>
              <span className={`badge status-${inv.displayStatus}`}>
                {inv.displayStatus.toUpperCase()}
              </span>
              <div className="invoice-actions">
                {inv.fileUrl && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => window.open(inv.fileUrl, '_blank')}
                    style={{ fontSize: 10, padding: '6px 12px' }}
                  >
                    VIEW
                  </button>
                )}
                {inv.displayStatus !== 'paid' && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => markPaid(inv)}
                    style={{ fontSize: 10, padding: '6px 12px', borderColor: '#2e7d32', color: '#2e7d32' }}
                  >
                    MARK PAID
                  </button>
                )}
                <button
                  className="btn-icon"
                  onClick={() => openEdit(inv)}
                  style={{ fontSize: 10 }}
                >
                  Edit
                </button>
                <button className="btn-danger" onClick={() => onDeleteInvoice(inv.id)}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note about file persistence */}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center' }}>
        Note: Uploaded files are stored in your browser session only. They will not persist after a page refresh until cloud storage is connected.
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={close} title={editingInvoice ? 'Edit Invoice' : 'Add Invoice'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>INVOICE # *</label>
              <input name="invoiceNumber" type="text" value={form.invoiceNumber} onChange={handleChange} required placeholder="INV-006" />
            </div>
            <div className="form-group">
              <label>VENDOR NAME *</label>
              <input name="vendorName" type="text" value={form.vendorName} onChange={handleChange} required placeholder="e.g. Blossom Florals" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>AMOUNT ($)</label>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>DUE DATE</label>
              <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>STATUS</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="form-group">
            <label>NOTES</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Invoice details, payment reference..." />
          </div>
          <div className="form-group">
            <label>ATTACH INVOICE (PDF or image)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ background: 'none', border: 'none', padding: '6px 0', fontSize: 13, color: 'var(--muted)', flex: 'none' }}
            />
            {form.fileName && (
              <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                ✓ {form.fileName}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>CANCEL</button>
            <button type="submit" className="btn btn-primary">
              {editingInvoice ? 'SAVE CHANGES' : 'ADD INVOICE'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
