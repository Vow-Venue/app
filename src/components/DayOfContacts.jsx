const ROLE_LABELS = {
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

export default function DayOfContacts({ collaborators, vendors }) {
  const vendorsWithPhone = vendors.filter(v => v.phone && v.phone.trim())
  const vendorsNoPhone   = vendors.filter(v => !v.phone || !v.phone.trim())

  return (
    <div>
      <div className="section-title">Day-of Contacts</div>
      <div className="section-subtitle">EVERYONE YOU NEED ON THE BIG DAY</div>

      <div style={{
        background: 'rgba(184,151,90,0.08)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 20px',
        marginBottom: 28,
        fontSize: 13,
        color: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span>This is a read-only reference view. Update contacts in the Vendors and Team tabs.</span>
      </div>

      {/* ── Your Team ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26,
          fontStyle: 'italic',
          color: 'var(--deep)',
          marginBottom: 16,
        }}>
          Your Team
        </div>

        {collaborators.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 32 }}>
            No collaborators yet. Add team members in the Team tab.
          </div>
        ) : (
          <div className="card-grid">
            {collaborators.map(c => (
              <div key={c.id} style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${avatarColor(c.name)}, var(--blush))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: 1, fontWeight: 600, marginTop: 2 }}>
                    {c.role.toUpperCase()}
                  </div>
                  <span className={`badge access-${c.access}`} style={{ marginTop: 6, display: 'inline-block' }}>
                    {c.access === 'full' ? 'FULL ACCESS' : 'VIEW ONLY'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vendors ── */}
      <div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26,
          fontStyle: 'italic',
          color: 'var(--deep)',
          marginBottom: 16,
        }}>
          Vendors &amp; Suppliers
        </div>

        {vendorsWithPhone.length === 0 && vendors.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 32 }}>
            No vendors yet. Add vendors in the Vendors tab.
          </div>
        )}

        {vendorsWithPhone.length === 0 && vendors.length > 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 32 }}>
            Add phone numbers to your vendors to see them here.
          </div>
        )}

        {vendorsWithPhone.length > 0 && (
          <div className="card-grid" style={{ marginBottom: 16 }}>
            {vendorsWithPhone.map(v => (
              <div key={v.id} style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '22px',
              }}>
                <div className="vendor-role">{(ROLE_LABELS[v.role] ?? v.role).toUpperCase()}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 600,
                  marginBottom: 12,
                }}>
                  {v.name}
                </div>
                {/* Phone — large for easy tapping on day-of */}
                <a
                  href={`tel:${v.phone.replace(/\D/g, '')}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 22,
                    color: 'var(--deep)',
                    textDecoration: 'none',
                    marginBottom: 6,
                    fontWeight: 300,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📞</span>
                  {v.phone}
                </a>
                {v.email && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    <a href={`mailto:${v.email}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                      {v.email}
                    </a>
                  </div>
                )}
                {v.notes && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic', lineHeight: 1.5 }}>
                    {v.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {vendorsNoPhone.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>
              VENDORS WITHOUT PHONE NUMBERS
            </div>
            <div className="card" style={{ padding: 0 }}>
              {vendorsNoPhone.map(v => (
                <div key={v.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(184,151,90,0.1)',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 1 }}>
                      {(ROLE_LABELS[v.role] ?? v.role).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No phone on file</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
