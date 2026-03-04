import { useState } from 'react'
import Modal from './Modal'

const BLANK_COLLAB = { name: '', role: '', access: 'view' }

const initials = (name) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export default function Collaborators({ collaborators, onAddCollaborator, onDeleteCollaborator }) {
  const [formOpen, setFormOpen]         = useState(false)
  const [upgradeOpen, setUpgradeOpen]   = useState(false)
  const [form, setForm]                 = useState(BLANK_COLLAB)

  const FREE_PLAN_LIMIT = 2

  const handleAddClick = () => {
    if (collaborators.length >= FREE_PLAN_LIMIT) {
      setUpgradeOpen(true)
    } else {
      setForm(BLANK_COLLAB)
      setFormOpen(true)
    }
  }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onAddCollaborator({ ...form })
    setFormOpen(false)
    setForm(BLANK_COLLAB)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="section-title">Your Team</div>
        <div style={{
          background: 'rgba(184,151,90,0.12)',
          border: '1px solid var(--border)',
          color: 'var(--gold)',
          padding: '5px 14px',
          borderRadius: 20,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: 500,
          marginTop: 8,
        }}>
          FREE PLAN
        </div>
      </div>
      <div className="section-subtitle">
        {collaborators.length}/{FREE_PLAN_LIMIT} COLLABORATORS · FREE PLAN
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {collaborators.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: '16px 0' }}>
            No collaborators yet. Add your first team member.
          </div>
        )}

        {collaborators.map(c => (
          <div className="collab-item" key={c.id}>
            <div className="avatar">{initials(c.name)}</div>
            <div className="collab-info">
              <div className="collab-name">{c.name}</div>
              <div className="collab-role">{c.role}</div>
            </div>
            <span className={`badge access-${c.access}`}>
              {c.access === 'full' ? 'FULL ACCESS' : 'VIEW ONLY'}
            </span>
            <button className="btn-danger" onClick={() => onDeleteCollaborator(c.id)}>×</button>
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleAddClick}>
            + INVITE COLLABORATOR
          </button>
        </div>
      </div>

      {/* Paywall card — always visible */}
      <div className="paywall-card">
        <h3>Invite Your Whole Wedding Village</h3>
        <p>
          Upgrade to Pro to add unlimited collaborators — your wedding planner,<br />
          photographer, both families, and anyone else who needs access.
        </p>
        <button className="btn-gold">UPGRADE TO PRO · $19/MO</button>
      </div>

      {/* Add Collaborator Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Invite Collaborator">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>FULL NAME *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Jessica Moore" />
          </div>
          <div className="form-group">
            <label>ROLE</label>
            <input name="role" type="text" value={form.role} onChange={handleChange} placeholder="e.g. Maid of Honor, Planner" />
          </div>
          <div className="form-group">
            <label>ACCESS LEVEL</label>
            <select name="access" value={form.access} onChange={handleChange}>
              <option value="full">Full Access</option>
              <option value="view">View Only</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>CANCEL</button>
            <button type="submit" className="btn btn-primary">SEND INVITE</button>
          </div>
        </form>
      </Modal>

      {/* Upgrade Modal */}
      <Modal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Free Plan Limit Reached">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontStyle: 'italic',
            color: 'var(--deep)',
            marginBottom: 12,
          }}>
            You've reached your Free Plan limit
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
            Your free plan includes up to 2 collaborators.<br />
            Upgrade to Pro to invite your whole team — unlimited access for everyone.
          </div>
          <button className="btn-gold" style={{ marginBottom: 12 }}>
            UPGRADE TO PRO · $19/MO
          </button>
          <div>
            <button
              className="btn btn-ghost"
              onClick={() => setUpgradeOpen(false)}
              style={{ fontSize: 11 }}
            >
              MAYBE LATER
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
