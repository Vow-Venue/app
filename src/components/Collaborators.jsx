import { useState } from 'react'
import Modal from './Modal'

const appUrl = import.meta.env.VITE_APP_URL || window.location.origin

const BLANK_COLLAB = { name: '', email: '', role: '', access: 'view' }

const VENDOR_ROLES = {
  photographer: 'Photographer',
  florist:      'Florist',
  caterer:      'Caterer',
  dj:           'DJ / Entertainment',
  venue:        'Venue',
  hair_makeup:  'Hair & Makeup',
  transport:    'Transportation',
  cake:         'Cake / Bakery',
  other:        'Other',
}

const initials = (name) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

const AVATAR_COLORS = ['#c9847a', '#b8975a', '#7a9cb8', '#7ab88a', '#9a7ab8']
const avatarColor = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function Collaborators({
  collaborators, vendors = [], onAddCollaborator, onDeleteCollaborator,
  isAuthenticated, canInvite = true, canEdit = true,
  isPro = false, onUpgrade,
  rsvpSlug = null,
}) {
  const [formOpen, setFormOpen]         = useState(false)
  const [upgradeOpen, setUpgradeOpen]   = useState(false)
  const [form, setForm]                 = useState(BLANK_COLLAB)
  const [inviteUrl, setInviteUrl]       = useState(null)
  const [emailSent, setEmailSent]       = useState(false)
  const [emailError, setEmailError]     = useState(null)
  const [copied, setCopied]             = useState(false)
  const [upgrading, setUpgrading]       = useState(false)
  const [submitError, setSubmitError]   = useState(null)
  const [submitting, setSubmitting]     = useState(false)

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url || appUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const FREE_PLAN_LIMIT = 2

  const handleAddClick = () => {
    if (!isPro && collaborators.length >= FREE_PLAN_LIMIT) {
      setUpgradeOpen(true)
    } else {
      setForm(BLANK_COLLAB)
      setFormOpen(true)
    }
  }

  const handleUpgradeClick = async () => {
    setUpgrading(true)
    try {
      await onUpgrade?.()
    } finally {
      setUpgrading(false)
    }
  }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const result = await onAddCollaborator({ ...form })
      if (result?.error === 'already_exists') {
        setSubmitError(`${form.email} is already on your team. Delete them first to re-add.`)
        return
      }
      if (result?.error) {
        setSubmitError('Something went wrong: ' + result.error)
        return
      }
      if (result?.token) {
        setInviteUrl(`${appUrl}?invite=${result.token}`)
        setEmailSent(!!result.emailSent)
        setEmailError(result.emailError || null)
      }
      setFormOpen(false)
      setForm(BLANK_COLLAB)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="section-title">Your Team</div>
        <div style={{
          background: isPro ? 'rgba(46,125,50,0.1)' : 'rgba(184,151,90,0.12)',
          border: `1px solid ${isPro ? '#2e7d32' : 'var(--border)'}`,
          color: isPro ? '#2e7d32' : 'var(--gold)',
          padding: '5px 14px',
          borderRadius: 20,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: 500,
          marginTop: 8,
        }}>
          {isPro ? '★ PRO PLAN' : 'FREE PLAN'}
        </div>
      </div>
      <div className="section-subtitle">
        {isPro
          ? `${collaborators.length} COLLABORATOR${collaborators.length !== 1 ? 'S' : ''} · PRO PLAN`
          : `${collaborators.length}/${FREE_PLAN_LIMIT} COLLABORATORS · FREE PLAN`}
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
            {canEdit && <button className="btn-danger" onClick={() => onDeleteCollaborator(c.id)}>×</button>}
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

      {/* RSVP link — shown when slug is available */}
      {rsvpSlug && (
        <div style={{
          marginBottom: 24,
          background: 'rgba(184,151,90,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontStyle: 'italic', marginBottom: 6 }}>
            ✦ Public RSVP Link
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Share this link with your guests so they can RSVP online. No sign-in required for them.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, fontSize: 12, color: 'var(--deep)',
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {appUrl}?rsvp={rsvpSlug}
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: 11, flexShrink: 0 }}
              onClick={() => handleCopyLink(`${appUrl}?rsvp=${rsvpSlug}`)}
            >
              {copied ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {/* Paywall card — only shown on free plan */}
      {!isPro && (
        <div className="paywall-card">
          <h3>Invite Your Whole Wedding Village</h3>
          <p>
            Upgrade to Pro to add unlimited collaborators — your wedding planner,<br />
            photographer, both families, and anyone else who needs access.
          </p>
          <button className="btn-gold" onClick={handleUpgradeClick} disabled={upgrading}>
            {upgrading ? 'REDIRECTING...' : 'UPGRADE TO PRO · $39/MO'}
          </button>
        </div>
      )}

      {/* Invite URL card — shown after successfully adding a collaborator */}
      {inviteUrl && (
        <div style={{
          marginBottom: 24,
          background: emailSent ? 'rgba(46,125,50,0.06)' : 'rgba(184,151,90,0.08)',
          border: `1px solid ${emailSent ? '#2e7d32' : 'var(--gold)'}`,
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>
            {emailSent ? 'Invite email sent!' : 'Invite link ready'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            {emailSent
              ? 'We sent an invite email with the link below. You can also copy it to share directly.'
              : 'Copy this link and send it to your collaborator via text or email. It works once.'}
          </div>
          {emailError && (
            <div style={{
              fontSize: 12, color: '#b43c3c', background: 'rgba(180,60,60,0.06)',
              border: '1px solid rgba(180,60,60,0.15)', borderRadius: 8,
              padding: '8px 12px', marginBottom: 12, lineHeight: 1.5,
            }}>
              Email delivery failed — please copy the link and send it manually.
            </div>
          )}
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
            onClick={() => { setInviteUrl(null); setEmailSent(false); setEmailError(null) }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Add Collaborator Modal */}
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); setSubmitError(null) }} title="Add Collaborator">
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Add them to your team, then share the link below so they can sign in.
          </p>
          <div className="form-grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label>FULL NAME *</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="e.g. Jessica Moore" autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>EMAIL</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jessica@example.com" />
            </div>
          </div>
          <div className="form-grid-2" style={{ marginTop: 16 }}>
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

          {submitError && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'rgba(180,60,60,0.08)',
              border: '1px solid rgba(180,60,60,0.3)',
              borderRadius: 8,
              fontSize: 13,
              color: '#b43c3c',
              lineHeight: 1.5,
            }}>
              {submitError}
            </div>
          )}
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setFormOpen(false); setSubmitError(null) }}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'ADDING...' : 'ADD TO TEAM'}
            </button>
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
          <button className="btn-gold" style={{ marginBottom: 12 }} onClick={handleUpgradeClick} disabled={upgrading}>
            {upgrading ? 'REDIRECTING TO STRIPE...' : 'UPGRADE TO PRO · $39/MO'}
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

      {/* ── Team Directory ────────────────────────────────────────────────────── */}
      {(collaborators.length > 0 || vendors.length > 0) && (
        <div style={{ marginTop: 40 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontStyle: 'italic',
            color: 'var(--deep)',
            marginBottom: 6,
          }}>
            Team Directory
          </div>
          <div className="section-subtitle" style={{ marginBottom: 20 }}>
            MASTER CONTACT SHEET — {collaborators.length + vendors.length} CONTACTS
          </div>

          {/* Team Members */}
          {collaborators.length > 0 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>
                TEAM MEMBERS
              </div>
              <div className="card-grid" style={{ marginBottom: 28 }}>
                {collaborators.map(c => (
                  <div className="directory-card" key={c.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${avatarColor(c.name)}, var(--blush))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600, fontSize: 15, flexShrink: 0,
                      }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</div>
                        <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--gold)', fontWeight: 600, marginTop: 2 }}>
                          {(c.role || 'Team Member').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="directory-details">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="directory-link">
                          <span className="directory-icon">✉</span>
                          {c.email}
                        </a>
                      )}
                      {!c.email && (
                        <span className="directory-empty">No email on file</span>
                      )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className={`badge access-${c.access}`}>
                        {c.access === 'full' ? 'FULL ACCESS' : 'VIEW ONLY'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Vendors */}
          {vendors.length > 0 && (
            <>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>
                VENDORS &amp; SUPPLIERS
              </div>
              <div className="card-grid">
                {vendors.map(v => (
                  <div className="directory-card" key={v.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${avatarColor(v.name)}, var(--cream))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--deep)', fontWeight: 600, fontSize: 15, flexShrink: 0,
                        border: '1px solid var(--border)',
                      }}>
                        {initials(v.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{v.name}</div>
                        <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--gold)', fontWeight: 600, marginTop: 2 }}>
                          {(VENDOR_ROLES[v.role] ?? v.role ?? 'Vendor').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="directory-details">
                      {v.phone && (
                        <a href={`tel:${v.phone.replace(/\D/g, '')}`} className="directory-link">
                          <span className="directory-icon">✆</span>
                          {v.phone}
                        </a>
                      )}
                      {v.email && (
                        <a href={`mailto:${v.email}`} className="directory-link">
                          <span className="directory-icon">✉</span>
                          {v.email}
                        </a>
                      )}
                      {!v.phone && !v.email && (
                        <span className="directory-empty">No contact info on file</span>
                      )}
                    </div>
                    {v.notes && (
                      <div style={{
                        marginTop: 10, fontSize: 12, color: 'var(--muted)',
                        fontStyle: 'italic', lineHeight: 1.5,
                        borderTop: '1px solid var(--border)', paddingTop: 10,
                      }}>
                        {v.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
