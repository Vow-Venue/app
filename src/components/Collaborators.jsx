import { useState } from 'react'
import Modal from './Modal'

const appUrl = window.location.origin

const BLANK_COLLAB = { name: '', email: '', role: '', access: 'view' }

const initials = (name) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export default function Collaborators({ collaborators, onAddCollaborator, onDeleteCollaborator, isAuthenticated, canInvite = true }) {
  const [formOpen, setFormOpen]         = useState(false)
  const [upgradeOpen, setUpgradeOpen]   = useState(false)
  const [form, setForm]                 = useState(BLANK_COLLAB)
  const [inviteUrl, setInviteUrl]       = useState(null)
  const [copied, setCopied]             = useState(false)

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url || appUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const token = await onAddCollaborator({ ...form })
    if (token) {
      setInviteUrl(`${appUrl}?invite=${token}`)
    }
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
              <div className="collab-role">{[c.role, c.email].filter(Boolean).join(' · ')}</div>
            </div>
            <span className={`badge access-${c.access}`}>
              {c.access === 'full' ? 'FULL ACCESS' : 'VIEW ONLY'}
            </span>
            <button className="btn-danger" onClick={() => onDeleteCollaborator(c.id)}>×</button>
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          {canInvite ? (
            <button className="btn btn-primary" onClick={handleAddClick}>
              + INVITE COLLABORATOR
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '4px 0' }}>
              Only the wedding owner or Planner role can invite team members.
            </div>
          )}
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

      {/* Invite URL card — shown after successfully adding a collaborator */}
      {inviteUrl && (
        <div style={{
          marginBottom: 24,
          background: 'rgba(184,151,90,0.08)',
          border: '1px solid var(--gold)',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>
            Invite link ready
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Copy this link and send it to your collaborator via text or email. It works once.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, fontSize: 12, color: 'var(--deep)',
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {inviteUrl}
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: 11, flexShrink: 0 }}
              onClick={() => handleCopyLink(inviteUrl)}
            >
              {copied ? 'COPIED ✓' : 'COPY LINK'}
            </button>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, marginTop: 10 }}
            onClick={() => setInviteUrl(null)}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Add Collaborator Modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add Collaborator">
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Add them to your team, then share the link below so they can sign in.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>FULL NAME *</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Jessica Moore" autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>EMAIL</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jessica@example.com" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>ROLE</label>
              <input name="role" type="text" value={form.role} onChange={handleChange} placeholder="e.g. Maid of Honor" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>ACCESS LEVEL</label>
              <select name="access" value={form.access} onChange={handleChange}>
                <option value="full">Full Access</option>
                <option value="view">View Only</option>
              </select>
            </div>
          </div>

          {/* Invite link — only show if authenticated (invite tokens require DB) */}
          {isAuthenticated && (
            <div style={{
              marginTop: 20,
              background: 'rgba(184,151,90,0.08)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
                HOW TO INVITE
              </div>
              <div style={{ fontSize: 12, color: 'var(--deep)', lineHeight: 1.6 }}>
                After clicking "Add to Team", an invite link will be generated. Copy it and send it to them via text or email. When they click it and sign in, they'll be added to your wedding automatically.
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>CANCEL</button>
            <button type="submit" className="btn btn-primary">ADD TO TEAM</button>
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
