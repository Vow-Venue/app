import { useState } from 'react'
import Modal from './Modal'

export default function ProIntakeModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    studio_name: profile?.studio_name || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    website: profile?.website || '',
    bio: profile?.bio || '',
  })
  const [saving, setSaving] = useState(false)

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '28px 32px', maxWidth: 440 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 24,
          fontStyle: 'italic',
          color: 'var(--deep)',
          marginBottom: 4,
        }}>
          Welcome to Pro
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          Complete your planner profile so clients and collaborators know who you are.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="pro-intake-label">
            <span>Display Name</span>
            <input
              className="pro-intake-input"
              placeholder="Your name"
              value={form.display_name}
              onChange={e => update('display_name', e.target.value)}
            />
          </label>

          <label className="pro-intake-label">
            <span>Studio Name</span>
            <input
              className="pro-intake-input"
              placeholder="e.g. Rosewood Events"
              value={form.studio_name}
              onChange={e => update('studio_name', e.target.value)}
            />
          </label>

          <label className="pro-intake-label">
            <span>Phone</span>
            <input
              className="pro-intake-input"
              placeholder="(555) 123-4567"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
            />
          </label>

          <label className="pro-intake-label">
            <span>Location</span>
            <input
              className="pro-intake-input"
              placeholder="City, State"
              value={form.location}
              onChange={e => update('location', e.target.value)}
            />
          </label>

          <label className="pro-intake-label">
            <span>Website</span>
            <input
              className="pro-intake-input"
              placeholder="https://..."
              value={form.website}
              onChange={e => update('website', e.target.value)}
            />
          </label>

          <label className="pro-intake-label">
            <span>Bio</span>
            <textarea
              className="pro-intake-input"
              placeholder="A few words about you or your studio..."
              rows={3}
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            style={{ fontSize: 12, color: 'var(--muted)' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </Modal>
  )
}
