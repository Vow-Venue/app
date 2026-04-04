import { useOutletContext } from 'react-router-dom'
import { Users, CreditCard, LayoutGrid, MessageSquare, UserPlus, CheckSquare, Phone, FileText, DollarSign, ClipboardList, FolderOpen } from 'lucide-react'

const ICON_PROPS = { size: 32, strokeWidth: 1.5 }

const FEATURES = [
  {
    icon: <Users {...ICON_PROPS} />,
    title: 'Guest Management',
    desc: 'The complete guest list solution for wedding professionals.',
    details: [
      'Track RSVPs in real time — yes, pending, and declined at a glance',
      'Record dietary restrictions, allergies, and special requests',
      'Assign guest roles (bride\'s family, groomsman, vendor, etc.)',
      'Link guests to seating assignments automatically',
      'Import hundreds of guests from CSV in seconds',
      'Export guest lists for venue, caterer, and rental companies',
      'Public RSVP page — send each guest a unique link to respond',
    ],
  },
  {
    icon: <CreditCard {...ICON_PROPS} />,
    title: 'Vendor Payment Tracking',
    desc: 'Keep every vendor payment organized and on schedule.',
    details: [
      'Store vendor contacts, phone numbers, and email addresses',
      'Track payment status — paid, unpaid, and overdue',
      'Upload and attach invoices to vendor records',
      'See total outstanding vs. paid at a glance',
      'Set due dates and get a clear view of upcoming payments',
      'Import vendor data and invoices from CSV',
    ],
  },
  {
    icon: <LayoutGrid {...ICON_PROPS} />,
    title: 'Interactive Seating Chart',
    desc: 'Design your floor plan visually with drag-and-drop.',
    details: [
      'Place round tables and long tables on an interactive canvas',
      'Drag and drop tables to perfect your layout',
      'Assign guests to tables from an unassigned guest sidebar',
      'See table capacity and current assignments in real time',
      'Rearrange tables instantly — no erasing, no sticky notes',
    ],
  },
  {
    icon: <MessageSquare {...ICON_PROPS} />,
    title: 'Team Messaging',
    desc: 'Slack-style messaging built for wedding teams.',
    details: [
      'Create channels for different topics (#vendors, #family, #timeline)',
      'Direct messages between team members',
      'System notifications keep everyone informed',
      'Search across all channels and conversations',
      'Keep your team aligned without switching to another app',
      'Real-time updates — no refresh needed',
    ],
  },
  {
    icon: <UserPlus {...ICON_PROPS} />,
    title: 'Collaborator Invites',
    desc: 'Give the right people the right level of access.',
    details: [
      'Role-based access: Planner, Family, Vendor, Viewer',
      'One-click magic link invites — no account creation friction',
      'Invite via email with automatic delivery',
      'Collaborators are added to the wedding instantly after sign-in',
      'Control who can edit, view, or manage each wedding',
      'Perfect for working with couples, families, and vendor teams',
    ],
  },
  {
    icon: <ClipboardList {...ICON_PROPS} />,
    title: 'BEO Generator',
    badge: 'COMING SOON',
    desc: 'Generate banquet event orders from your wedding data.',
    details: [
      'Auto-generate BEOs from guest counts and vendor selections',
      'Professional formatting ready for venue submissions',
      'Include dietary breakdowns, table counts, and vendor details',
      'Export as PDF for printing or email distribution',
    ],
  },
  {
    icon: <FolderOpen {...ICON_PROPS} />,
    title: 'CSV Import & Export',
    desc: 'Move data in and out without manual entry.',
    details: [
      'Bulk import guests, tasks, vendors, and invoices from CSV files',
      'Preview imported data before confirming',
      'Smart column mapping handles different file formats',
      'Export any dataset for sharing with venues and vendors',
      'Perfect for migrating from spreadsheets or other tools',
    ],
  },
]

export default function FeaturesPage() {
  const { onStartFree } = useOutletContext()

  return (
    <div className="marketing-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-hero-badge">FEATURES</div>
        <h1 className="marketing-hero-title">
          Everything you need to plan every wedding
        </h1>
        <p className="marketing-hero-subtitle">
          From first consultation to last dance, Amorí handles it all.
        </p>
      </section>

      {/* ── Feature Sections ─────────────────────────────── */}
      <div className="features-list">
        {FEATURES.map((feature, i) => (
          <section
            key={feature.title}
            className={`feature-section ${i % 2 === 1 ? 'feature-section-alt' : ''}`}
          >
            <div className="feature-section-inner">
              <div className="feature-section-icon">{feature.icon}</div>
              <div className="feature-section-content">
                <div className="feature-section-header">
                  <h2>{feature.title}</h2>
                  {feature.badge && (
                    <span className="feature-badge">{feature.badge}</span>
                  )}
                </div>
                <p className="feature-section-desc">{feature.desc}</p>
                <ul className="feature-details">
                  {feature.details.map((d, j) => (
                    <li key={j}>
                      <span className="pricing-check">✓</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="marketing-cta-banner">
        <h2>Ready to get started?</h2>
        <p>Create your free account and start planning in minutes.</p>
        <button className="btn-gold btn-gold-lg" onClick={onStartFree}>
          START PLANNING FREE &rarr;
        </button>
      </section>
    </div>
  )
}
