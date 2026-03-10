import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import usePermissions from './hooks/usePermissions'
import Header from './components/Header'
import NavTabs from './components/NavTabs'
import Overview from './components/Overview'
import GuestList from './components/GuestList'
import SeatingChart from './components/SeatingChart'
import TaskList from './components/TaskList'
import VendorHub from './components/VendorHub'
import Messaging from './components/Messaging'
import Billing from './components/Billing'
import Collaborators from './components/Collaborators'
import DayOfContacts from './components/DayOfContacts'
import Notes from './components/Notes'
import Guidance from './components/Guidance'
import DesignStudio from './components/DesignStudio'
import AuthModal from './components/AuthModal'
import WeddingSetup from './components/WeddingSetup'
import RSVPPage from './components/RSVPPage'
import OrgDashboard from './components/OrgDashboard'
import { TEMPLATES, PERIOD_OFFSETS } from './lib/taskTemplates'
import MarketingLayout from './layouts/MarketingLayout'
import HomePage from './pages/HomePage'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import AdminDashboard from './pages/AdminDashboard'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── DB → App mapping helpers ─────────────────────────────────────────────────

const mapGuest = r => ({
  id: r.id,
  name: r.name,
  email: r.email ?? '',
  rsvp: r.rsvp,
  dietary: r.dietary ?? '',
  guestRole: r.guest_role ?? '',
  tableId: r.table_id,
  seatNumber: r.seat_number ?? null,
})

const mapTask = r => ({
  id: r.id,
  title: r.title,
  completed: r.done,
  dueDate: r.due_date ?? '',
  assignedTo: r.assigned_to ?? '',
  priority: r.priority ?? 'medium',
})

const mapMessage = r => ({
  id: r.id,
  channelId: r.channel_id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  text: r.body,
  timestamp: r.created_at,
})

const mapInvoice = r => ({
  id: r.id,
  invoiceNumber: r.invoice_number ?? '',
  vendorName: r.vendor_name,
  amount: r.amount,
  dueDate: r.due_date ?? '',
  status: r.status,
  notes: r.notes ?? '',
  fileName: r.file_name,
  fileUrl: r.file_url,
})

const mapNote = r => ({
  id: r.id,
  title: r.title,
  body: r.body ?? '',
  visibility: r.visibility ?? 'shared',
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapGuidanceBlock = r => ({
  id: r.id,
  type: r.type,
  content: r.content ?? {},
  sortOrder: r.sort_order,
  createdAt: r.created_at,
})

const mapDesignBoard = r => ({
  id: r.id,
  weddingId: r.wedding_id,
  name: r.name,
  category: r.category ?? '',
  notes: r.notes ?? '',
  sortOrder: r.sort_order,
  isDefault: r.is_default,
  createdAt: r.created_at,
})

const mapDesignPhoto = r => ({
  id: r.id,
  boardId: r.board_id,
  weddingId: r.wedding_id,
  fileUrl: r.file_url,
  fileName: r.file_name ?? '',
  sortOrder: r.sort_order,
  createdAt: r.created_at,
})

const DEFAULT_DESIGN_BOARDS = [
  { name: 'Mood Board', category: 'Inspiration' },
  { name: 'Placesetting Options', category: 'Tablescapes' },
  { name: 'Venue Photos', category: 'Venue' },
  { name: 'Bouquets', category: 'Florals' },
  { name: 'Ceremony Design', category: 'Ceremony' },
  { name: 'Cake Design', category: 'Food & Beverage' },
  { name: 'Hair Styles', category: 'Beauty' },
  { name: 'Wedding Dress', category: 'Attire' },
  { name: 'Lighting Design', category: 'Lighting' },
]

// ─── Support Ticket Modal ────────────────────────────────────────────────────

function SupportTicketModal({ isOpen, onClose, onSubmit }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    await onSubmit(subject.trim(), message.trim())
    setSubject('')
    setMessage('')
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); onClose() }, 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Need Help?</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {submitted ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--deep)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600 }}>Ticket submitted!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>We'll get back to you soon.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '16px 24px 24px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }}
              autoFocus
            />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the issue or question..."
              rows={5}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', marginBottom: 16 }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>SUBMIT TICKET</button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Auth
  const [session, setSession]         = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authOpen, setAuthOpen]       = useState(false)

  // ── URL params
  const pendingInviteToken = searchParams.get('invite') || null
  const stripeSuccess = searchParams.get('stripe_success') === '1'

  // ── App view
  const [activeTab, setActiveTab] = useState('overview')
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  // ── Profile
  const [profile, setProfile] = useState(null)

  // ── Multi-wedding
  const [myWeddings, setMyWeddings]             = useState([])
  const [activeWeddingId, setActiveWeddingId]   = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [showProBanner, setShowProBanner]       = useState(false)
  const [dashboardTaskStats, setDashboardTaskStats] = useState({})
  const [sharedVendors, setSharedVendors]           = useState([])
  const [teamMembers, setTeamMembers]               = useState([])
  const [dashboardRevenue, setDashboardRevenue]     = useState(0)
  const [taskTemplates, setTaskTemplates]           = useState([])
  const [templateTasks, setTemplateTasks]           = useState({})

  // ── Wedding (currently selected)
  const [weddingId, setWeddingId] = useState(null)
  const [wedding, setWedding]     = useState(null)

  // ── Data
  const [guests, setGuests]             = useState([])
  const [tables, setTables]             = useState([])
  const [tasks, setTasks]               = useState([])
  const [vendors, setVendors]           = useState([])
  const [channels, setChannels]             = useState([])
  const [channelMembers, setChannelMembers] = useState([])
  const [messages, setMessages]             = useState([])
  const [invoices, setInvoices]             = useState([])
  const [collaborators, setCollaborators]   = useState([])
  const [notes, setNotes]                   = useState([])
  const [guidanceBlocks, setGuidanceBlocks] = useState([])
  const [timelineDays, setTimelineDays]     = useState([])
  const [timelineEvents, setTimelineEvents] = useState([])
  const [roomElements, setRoomElements]     = useState([])
  const [notifications, setNotifications]   = useState([])
  const [designBoards, setDesignBoards]     = useState([])
  const [designPhotos, setDesignPhotos]     = useState([])

  // ── Auth effect ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const isAdminPage = window.location.pathname.startsWith('/admin-')

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session && !isAdminPage) navigate('/app', { replace: true })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setAuthOpen(false)
        if (!window.location.pathname.startsWith('/admin-')) navigate('/app', { replace: true })
      } else {
        // Sign out — reset and return to home
        setMyWeddings([])
        setActiveWeddingId(null)
        setDashboardLoading(false)
        setGuests([])
        setTables([])
        setTasks([])
        setVendors([])
        setChannels([])
        setChannelMembers([])
        setMessages([])
        setInvoices([])
        setCollaborators([])
        setNotes([])
        setNotifications([])
        setWeddingId(null)
        setWedding(null)
        if (!window.location.pathname.startsWith('/admin-')) navigate('/', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Load weddings + profile when session arrives ─────────────────────────────
  useEffect(() => {
    if (!session) return
    loadMyWeddings(session.user.id)
    loadProfile(session.user.id)
    loadTaskTemplates(session.user.id)
    loadNotifications(session.user.id)
  }, [session?.user?.id])

  // ── Load task templates ────────────────────────────────────────────────────
  const loadTaskTemplates = async (userId) => {
    const { data: templates } = await supabase
      .from('task_templates').select('*').eq('user_id', userId).order('created_at')
    if (!templates) return
    setTaskTemplates(templates)
    if (templates.length > 0) {
      const tIds = templates.map(t => t.id)
      const { data: tasks } = await supabase
        .from('template_tasks').select('*').in('template_id', tIds).order('sort_order')
      if (tasks) {
        const grouped = {}
        tIds.forEach(id => { grouped[id] = [] })
        tasks.forEach(t => {
          if (!grouped[t.template_id]) grouped[t.template_id] = []
          grouped[t.template_id].push(t)
        })
        setTemplateTasks(grouped)
      }
    }
  }

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) setProfile(data)
    else setProfile({ id: userId, display_name: null, avatar_url: null })
  }

  // Helper: map invite/collab role to wedding_members role
  const mapMemberRole = (role) => {
    const r = (role || '').toLowerCase()
    if (r.includes('planner')) return 'planner'
    if (r === 'bride' || r === 'groom') return 'couple'
    if (r === 'family') return 'family'
    if (r.includes('vendor')) return 'vendor'
    return 'viewer'
  }

  const loadMyWeddings = async (userId) => {
    setDashboardLoading(true)

    try {
      // ── Step 1: Redeem invite token if present in URL ───────────────────────
      if (pendingInviteToken) {
        const { data: result, error: rpcError } = await supabase.rpc('redeem_invite', { token_value: pendingInviteToken })
        if (rpcError) {
          console.error('Invite redemption failed:', rpcError.message)
        } else if (result?.error) {
          console.warn('Invite token issue:', result.error)
        }
        window.history.replaceState({}, '', window.location.pathname)
      }

      // ── Step 2: Fetch all weddings this user is a member of ─────────────────
      let weddings = []

      const { data: memberships, error: wmError } = await supabase
        .from('wedding_members')
        .select('wedding_id, role, weddings(*)')
        .eq('user_id', userId)

      if (!wmError && memberships) {
        weddings = memberships
          .filter(m => m.weddings)
          .map(m => ({ ...m.weddings, myRole: m.role }))
      }

      // ── Fallback: wedding_members table missing or empty ────────────────────
      if (weddings.length === 0) {
        const { data: ownedRow } = await supabase
          .from('weddings').select('*').eq('user_id', userId).maybeSingle()
        if (ownedRow) {
          // Try to backfill wedding_members (safe — ignores if table missing)
          try {
            await supabase.from('wedding_members')
              .upsert({ wedding_id: ownedRow.id, user_id: userId, role: 'owner' }, { onConflict: 'wedding_id,user_id' })
          } catch { /* ignore */ }
          weddings = [{ ...ownedRow, myRole: 'owner' }]
        } else {
          const { data: collab } = await supabase
            .from('collaborators').select('wedding_id, role').eq('user_id', userId).maybeSingle()
          if (collab) {
            const { data: sharedWedding } = await supabase
              .from('weddings').select('*').eq('id', collab.wedding_id).single()
            if (sharedWedding) {
              const memberRole = mapMemberRole(collab.role)
              try {
                await supabase.from('wedding_members')
                  .upsert({ wedding_id: sharedWedding.id, user_id: userId, role: memberRole }, { onConflict: 'wedding_id,user_id' })
              } catch { /* ignore */ }
              weddings = [{ ...sharedWedding, myRole: memberRole }]
            }
          }
        }
      }

      // ── Step 3: No weddings at all — create a blank one ─────────────────────
      if (weddings.length === 0) {
        const { data: created } = await supabase
          .from('weddings').insert({ user_id: userId }).select('*').single()
        if (created) {
          try {
            await supabase.from('wedding_members')
              .insert({ wedding_id: created.id, user_id: userId, role: 'owner' })
          } catch { /* ignore */ }
          weddings = [{ ...created, myRole: 'owner' }]
        }
      }

      // ── Step 3b: Fetch guest counts per wedding ──────────────────────────────
      if (weddings.length > 0) {
        const weddingIds = weddings.map(w => w.id)
        const { data: guestRows } = await supabase
          .from('guests')
          .select('wedding_id')
          .in('wedding_id', weddingIds)
        if (guestRows) {
          const counts = {}
          guestRows.forEach(r => { counts[r.wedding_id] = (counts[r.wedding_id] || 0) + 1 })
          weddings = weddings.map(w => ({ ...w, guestCount: counts[w.id] || 0 }))
        }
      }

      // ── Step 3c: Fetch task stats per wedding ──────────────────────────────
      if (weddings.length > 0) {
        const weddingIds = weddings.map(w => w.id)
        const { data: taskRows } = await supabase
          .from('tasks')
          .select('wedding_id, done')
          .in('wedding_id', weddingIds)
        if (taskRows) {
          const stats = {}
          taskRows.forEach(r => {
            if (!stats[r.wedding_id]) stats[r.wedding_id] = { total: 0, done: 0 }
            stats[r.wedding_id].total++
            if (r.done) stats[r.wedding_id].done++
          })
          setDashboardTaskStats(stats)
        }
      }

      // ── Step 3d: Fetch all vendor contacts (Vendor Black Book) ─────────────
      {
        const weddingIds = weddings.map(w => w.id)
        const weddingNameMap = {}
        weddings.forEach(w => { weddingNameMap[w.id] = w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Untitled' })
        const { data: allVendors } = await supabase
          .from('vendors')
          .select('name, role, phone, email, website, wedding_id')
          .in('wedding_id', weddingIds)
        if (allVendors) {
          const vendorMap = {}
          allVendors.forEach(v => {
            const key = `${(v.name || '').toLowerCase()}|${(v.email || '').toLowerCase()}`
            if (!vendorMap[key]) vendorMap[key] = { name: v.name, role: v.role, phone: v.phone, email: v.email, website: v.website, weddingIds: new Set() }
            vendorMap[key].weddingIds.add(v.wedding_id)
            if (v.phone && !vendorMap[key].phone) vendorMap[key].phone = v.phone
            if (v.website && !vendorMap[key].website) vendorMap[key].website = v.website
          })
          setSharedVendors(
            Object.values(vendorMap)
              .map(v => ({
                name: v.name, role: v.role, phone: v.phone, email: v.email, website: v.website,
                weddingCount: v.weddingIds.size,
                weddingNames: [...v.weddingIds].map(id => weddingNameMap[id] || 'Untitled'),
              }))
              .sort((a, b) => b.weddingCount - a.weddingCount || a.name.localeCompare(b.name))
          )
        }
      }

      // ── Step 3e: Fetch team members (owners + planners across weddings) ──────
      if (weddings.length > 0) {
        const weddingIds = weddings.map(w => w.id)
        const { data: memberRows } = await supabase
          .from('wedding_members')
          .select('user_id, role, wedding_id')
          .in('wedding_id', weddingIds)
          .in('role', ['owner', 'planner'])
        if (memberRows) {
          const memberMap = {}
          memberRows.forEach(m => {
            if (!memberMap[m.user_id]) memberMap[m.user_id] = { userId: m.user_id, role: m.role, weddingCount: 0 }
            memberMap[m.user_id].weddingCount++
            if (m.role === 'owner') memberMap[m.user_id].role = 'owner'
          })
          const memberUserIds = Object.keys(memberMap)
          if (memberUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', memberUserIds)
            if (profiles) {
              profiles.forEach(p => {
                if (memberMap[p.id]) {
                  memberMap[p.id].displayName = p.display_name
                  memberMap[p.id].avatarUrl = p.avatar_url
                }
              })
            }
          }
          setTeamMembers(Object.values(memberMap))
        }
      }

      // ── Step 3f: Calculate revenue (sum of paid vendor amounts) ──────────────
      if (weddings.length > 0) {
        const weddingIds = weddings.map(w => w.id)
        const { data: paidVendors } = await supabase
          .from('vendors')
          .select('amount')
          .in('wedding_id', weddingIds)
          .eq('paid', true)
        if (paidVendors) {
          const total = paidVendors.reduce((s, v) => s + (v.amount || 0), 0)
          setDashboardRevenue(total)
        }
      }

      setMyWeddings(weddings)

      // Check wedding date reminders (30/7/1 days away)
      checkWeddingReminders(weddings, userId)

      // ── Step 4: Auto-routing ────────────────────────────────────────────────
      // Collaborators (couple/family/vendor) with 1 wedding: auto-jump
      // Planners/owners: always land on org dashboard
      if (weddings.length === 1 && !['owner', 'planner'].includes(weddings[0].myRole)) {
        setActiveWeddingId(weddings[0].id)
        await loadWeddingData(weddings[0].id, userId)
      }
      // else: show org dashboard (activeWeddingId stays null)

    } catch (err) {
      console.error('loadMyWeddings failed:', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  // ── Load all data for a single wedding ──────────────────────────────────────
  const loadWeddingData = async (wId, userId) => {
    try {
      const { data: weddingRow } = await supabase
        .from('weddings').select('*').eq('id', wId).single()
      if (!weddingRow) return

      setWedding(weddingRow)
      setWeddingId(weddingRow.id)

      const [gRes, tRes, tkRes, vRes, chRes, invRes, collRes, notesRes, gbRes, tdRes, teRes, reRes, dbRes, dpRes] = await Promise.all([
        supabase.from('guests').select('*').eq('wedding_id', wId),
        supabase.from('seating_tables').select('*').eq('wedding_id', wId),
        supabase.from('tasks').select('*').eq('wedding_id', wId).order('created_at'),
        supabase.from('vendors').select('*').eq('wedding_id', wId),
        supabase.from('channels').select('*').eq('wedding_id', wId),
        supabase.from('invoices').select('*').eq('wedding_id', wId),
        supabase.from('collaborators').select('*').eq('wedding_id', wId),
        supabase.from('notes').select('*').eq('wedding_id', wId).order('updated_at', { ascending: false }),
        supabase.from('guidance_blocks').select('*').eq('wedding_id', wId).order('sort_order'),
        supabase.from('timeline_days').select('*').eq('wedding_id', wId).order('sort_order'),
        supabase.from('timeline_events').select('*').eq('wedding_id', wId).order('sort_order'),
        supabase.from('room_elements').select('*').eq('wedding_id', wId),
        supabase.from('design_boards').select('*').eq('wedding_id', wId).order('sort_order'),
        supabase.from('design_photos').select('*').eq('wedding_id', wId).order('sort_order'),
      ])

      const mappedTasks = (tkRes.data ?? []).map(mapTask)
      const mappedInvoices = (invRes.data ?? []).map(mapInvoice)
      setGuests((gRes.data ?? []).map(mapGuest))
      setTables(tRes.data ?? [])
      setTasks(mappedTasks)
      setVendors(vRes.data ?? [])
      setInvoices(mappedInvoices)
      setCollaborators(collRes.data ?? [])
      setNotes((notesRes.data ?? []).map(mapNote))
      setGuidanceBlocks((gbRes.data ?? []).map(mapGuidanceBlock))
      setTimelineDays(tdRes.data ?? [])
      setTimelineEvents(teRes.data ?? [])
      setRoomElements(reRes.data ?? [])
      setDesignBoards((dbRes.data ?? []).map(mapDesignBoard))
      setDesignPhotos((dpRes.data ?? []).map(mapDesignPhoto))

      const fetchedChannels = chRes.data ?? []
      setChannels(fetchedChannels)

      if (fetchedChannels.length > 0) {
        const chIds = fetchedChannels.map(c => c.id)
        const [msgsRes, cmRes] = await Promise.all([
          supabase.from('messages').select('*').in('channel_id', chIds).order('created_at'),
          supabase.from('channel_members').select('*').in('channel_id', chIds),
        ])
        setMessages((msgsRes.data ?? []).map(mapMessage))
        setChannelMembers((cmRes.data ?? []).map(r => ({ channelId: r.channel_id, userId: r.user_id })))
      } else {
        setMessages([])
        setChannelMembers([])
      }

      // Check for overdue tasks/invoices
      const uid = userId || session?.user?.id
      if (uid) checkOverdueNotifications(wId, mappedTasks, mappedInvoices, uid)
    } catch (err) {
      console.error('loadWeddingData failed:', err)
    }
  }

  // ── Select a wedding from the dashboard ─────────────────────────────────────
  const selectWedding = async (wId) => {
    setActiveWeddingId(wId)
    setActiveTab('overview')
    await loadWeddingData(wId)
  }

  // ── Back to org dashboard ───────────────────────────────────────────────────
  const handleBackToDashboard = () => {
    setActiveWeddingId(null)
    setWeddingId(null)
    setWedding(null)
    setGuests([])
    setTables([])
    setTasks([])
    setVendors([])
    setChannels([])
    setChannelMembers([])
    setMessages([])
    setInvoices([])
    setCollaborators([])
    setNotes([])
    setDesignBoards([])
    setDesignPhotos([])
    setActiveTab('overview')
    // Re-fetch dashboard data so stats are fresh
    if (session) loadMyWeddings(session.user.id)
  }

  // ── Archive / unarchive a wedding ──────────────────────────────────────────
  const handleArchiveWedding = async (wId, archived) => {
    if (!session) return
    await supabase.from('weddings').update({ archived }).eq('id', wId)
    setMyWeddings(prev => prev.map(w => w.id === wId ? { ...w, archived } : w))
  }

  // ── Create a new wedding ────────────────────────────────────────────────────
  const handleCreateWedding = async (fields = {}) => {
    if (!session) return
    const userId = session.user.id
    const ownedCount = myWeddings.filter(w => w.myRole === 'owner').length
    const isPro = myWeddings.some(w => w.myRole === 'owner' && w.plan === 'pro')
    if (!isPro && ownedCount >= 2) return

    const insertRow = {
      user_id: userId,
      setup_complete: !!(fields.partner1 && fields.partner2),
    }
    if (fields.partner1) insertRow.partner1 = fields.partner1
    if (fields.partner2) insertRow.partner2 = fields.partner2
    if (fields.weddingDate) insertRow.wedding_date = fields.weddingDate

    const { data: created, error } = await supabase
      .from('weddings').insert(insertRow).select('*').single()

    if (error || !created) {
      console.error('Failed to create wedding:', error?.message)
      alert('Failed to create wedding. Please try again.')
      return
    }

    await supabase.from('wedding_members')
      .insert({ wedding_id: created.id, user_id: userId, role: 'owner' })

    // Auto-create #general channel with welcome message
    const { data: genCh } = await supabase.from('channels').insert({
      wedding_id: created.id, name: 'general', type: 'channel', created_by: userId,
    }).select().single()
    if (genCh) {
      await supabase.from('channel_members').insert({ channel_id: genCh.id, user_id: userId })
      await supabase.from('messages').insert({
        channel_id: genCh.id, sender_id: 'system', sender_name: 'System',
        body: 'Welcome to your wedding workspace! This is the #general channel where your whole team can communicate.',
      })
    }

    const newW = { ...created, myRole: 'owner', guestCount: 0 }
    setMyWeddings(prev => [...prev, newW])
    setActiveWeddingId(created.id)
    await loadWeddingData(created.id, userId)
  }

  // ── Cover photo upload ────────────────────────────────────────────────────
  const handleUploadCover = async (wId, file) => {
    if (!session || !file) return
    console.log('[cover] upload starting for wedding:', wId, 'file:', file.name, 'size:', file.size)
    const ext = file.name.split('.').pop()
    const path = `${wId}/cover.${ext}`

    // Upload to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from('wedding-covers')
      .upload(path, file, { upsert: true })
    if (upErr) { console.error('[cover] storage upload failed:', upErr.message); return }
    console.log('[cover] storage upload complete')

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wedding-covers')
      .getPublicUrl(path)

    // Bust cache with timestamp
    const url = `${publicUrl}?t=${Date.now()}`
    console.log('[cover] public URL:', url)

    // Update wedding record
    const { error: dbErr } = await supabase.from('weddings').update({ cover_url: url }).eq('id', wId)
    if (dbErr) { console.error('[cover] DB update failed:', dbErr.message); return }
    console.log('[cover] DB updated, refreshing state')
    setMyWeddings(prev => prev.map(w => w.id === wId ? { ...w, cover_url: url } : w))
    if (wedding?.id === wId) setWedding(prev => ({ ...prev, cover_url: url }))
  }

  // ── Studio name ─────────────────────────────────────────────────────────────
  const handleUpdateStudioName = async (name) => {
    if (!session?.user) return
    const userId = session.user.id
    const { data, error } = await supabase.from('profiles').upsert({
      id: userId, studio_name: name, updated_at: new Date().toISOString(),
    }).select().single()
    if (error) { console.error('Studio name update failed:', error.message); return }
    if (data) setProfile(data)
  }

  // ── Task template handlers ────────────────────────────────────────────────
  const handleCreateTemplate = async (name) => {
    if (!session?.user) return
    const { data, error } = await supabase.from('task_templates').insert({
      user_id: session.user.id, name,
    }).select().single()
    if (error) { console.error('Create template failed:', error.message); return }
    if (data) {
      setTaskTemplates(prev => [...prev, data])
      setTemplateTasks(prev => ({ ...prev, [data.id]: [] }))
    }
    return data
  }

  const handleUpdateTemplate = async (id, updates) => {
    const { error } = await supabase.from('task_templates').update(updates).eq('id', id)
    if (error) { console.error('Update template failed:', error.message); return }
    setTaskTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const handleDeleteTemplate = async (id) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id)
    if (error) { console.error('Delete template failed:', error.message); return }
    setTaskTemplates(prev => prev.filter(t => t.id !== id))
    setTemplateTasks(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleAddTemplateTask = async (templateId, task) => {
    const existing = templateTasks[templateId] || []
    const maxSort = existing.reduce((m, t) => Math.max(m, t.sort_order), -1)
    const { data, error } = await supabase.from('template_tasks').insert({
      template_id: templateId,
      title: task.title,
      assignee_role: task.assignee_role || 'planner',
      offset_days: task.offset_days ?? 0,
      priority: task.priority || 'medium',
      sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Add template task failed:', error.message); return }
    if (data) {
      setTemplateTasks(prev => ({
        ...prev,
        [templateId]: [...(prev[templateId] || []), data],
      }))
    }
  }

  const handleUpdateTemplateTask = async (taskId, updates) => {
    const { error } = await supabase.from('template_tasks').update(updates).eq('id', taskId)
    if (error) { console.error('Update template task failed:', error.message); return }
    setTemplateTasks(prev => {
      const next = {}
      for (const [tid, tasks] of Object.entries(prev)) {
        next[tid] = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      }
      return next
    })
  }

  const handleDeleteTemplateTask = async (taskId, templateId) => {
    const { error } = await supabase.from('template_tasks').delete().eq('id', taskId)
    if (error) { console.error('Delete template task failed:', error.message); return }
    setTemplateTasks(prev => ({
      ...prev,
      [templateId]: (prev[templateId] || []).filter(t => t.id !== taskId),
    }))
  }

  const handleImportTemplateToWedding = async (templateId, weddingId) => {
    if (!session) return
    const tasks = templateTasks[templateId] || []
    if (tasks.length === 0) return 0
    const targetWedding = myWeddings.find(w => w.id === weddingId)
    const weddingDate = targetWedding?.wedding_date

    const rows = tasks.map(t => {
      let dueDate = null
      if (weddingDate && t.offset_days) {
        const d = new Date(weddingDate + 'T00:00:00')
        d.setDate(d.getDate() + t.offset_days)
        dueDate = d.toISOString().split('T')[0]
      }
      return {
        wedding_id: weddingId,
        title: t.title,
        done: false,
        due_date: dueDate,
        assigned_to: t.assignee_role || null,
        priority: t.priority || 'medium',
      }
    })

    const { data, error } = await supabase.from('tasks').insert(rows).select()
    if (error) { console.error('Import template failed:', error.message); return 0 }
    // If importing into the currently-viewed wedding, update local tasks
    if (weddingId === activeWeddingId && data) {
      setTasks(prev => [...prev, ...data.map(mapTask)])
    }
    return data?.length || 0
  }

  const handleSeedStarterTemplates = async () => {
    if (!session?.user) return
    const tmpl = await handleCreateTemplate('Wedding Checklist')
    if (!tmpl) return
    const rows = []
    for (const period of TEMPLATES) {
      const offset = PERIOD_OFFSETS[period.period] || 0
      for (const task of period.tasks) {
        rows.push({
          template_id: tmpl.id,
          title: task.title,
          assignee_role: 'planner',
          offset_days: offset,
          priority: task.priority || 'medium',
          sort_order: rows.length,
        })
      }
    }
    const { data, error } = await supabase.from('template_tasks').insert(rows).select()
    if (error) { console.error('Seed templates failed:', error.message); return }
    if (data) {
      setTemplateTasks(prev => ({ ...prev, [tmpl.id]: data }))
    }
  }

  const handleCopyVendorToWedding = async (vendor, targetWeddingId) => {
    if (!session) return
    const { error } = await supabase.from('vendors').insert({
      wedding_id: targetWeddingId,
      name: vendor.name,
      role: vendor.role || 'other',
      phone: vendor.phone || null,
      email: vendor.email || null,
      website: vendor.website || null,
      amount: 0,
      paid: false,
    })
    if (error) { console.error('Copy vendor failed:', error.message); return false }
    return true
  }

  // ── Realtime: new messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!weddingId || !session) return
    const myUserId = session.user.id
    const myChannelIds = new Set(
      channelMembers.filter(m => m.userId === myUserId).map(m => m.channelId)
    )
    if (myChannelIds.size === 0) return

    const sub = supabase
      .channel('rt-messages-' + weddingId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (myChannelIds.has(payload.new.channel_id)) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, mapMessage(payload.new)]
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [weddingId, channelMembers, session])

  // ── Notifications ──────────────────────────────────────────────────────────
  const loadNotifications = async (userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) { console.error('loadNotifications failed:', error.message); return }
    setNotifications(data ?? [])
  }

  // Realtime: new notifications
  useEffect(() => {
    if (!session) return
    const userId = session.user.id
    const sub = supabase
      .channel('rt-notifications-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          setNotifications(prev => {
            if (prev.some(n => n.id === payload.new.id)) return prev
            return [payload.new, ...prev]
          })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [session])

  const handleMarkNotificationRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) console.error('markNotificationRead failed:', error.message)
  }

  const handleMarkAllNotificationsRead = async (weddingIdFilter) => {
    setNotifications(prev => prev.map(n => {
      if (weddingIdFilter && n.wedding_id !== weddingIdFilter) return n
      return { ...n, read: true }
    }))
    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
    if (weddingIdFilter) query = query.eq('wedding_id', weddingIdFilter)
    const { error } = await query
    if (error) console.error('markAllNotificationsRead failed:', error.message)
  }

  // Check for overdue tasks/invoices and wedding date reminders
  const checkOverdueNotifications = async (wId, loadedTasks, loadedInvoices, userId) => {
    if (!session || !wId) return
    const today = new Date().toISOString().split('T')[0]
    const rows = []

    for (const task of loadedTasks) {
      if (!task.dueDate || task.completed) continue
      if (task.dueDate < today) {
        rows.push({
          user_id: userId, wedding_id: wId, type: 'task_overdue',
          message: `Task overdue: "${task.title}"`,
          link_tab: 'tasks', ref_id: 'task-overdue-' + task.id,
        })
      }
    }

    for (const inv of loadedInvoices) {
      if (!inv.dueDate || inv.status === 'paid') continue
      if (inv.dueDate < today) {
        rows.push({
          user_id: userId, wedding_id: wId, type: 'payment_due',
          message: `Payment overdue: ${inv.vendorName}`,
          link_tab: 'billing', ref_id: 'invoice-overdue-' + inv.id,
        })
      }
    }

    if (rows.length === 0) return
    const { error } = await supabase
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,ref_id', ignoreDuplicates: true })
    if (error) console.error('checkOverdueNotifications failed:', error.message)
    await loadNotifications(userId)
  }

  const checkWeddingReminders = async (weddings, userId) => {
    if (!session || !weddings.length) return
    const now = new Date()
    const rows = []
    for (const w of weddings) {
      if (!w.wedding_date) continue
      const wDate = new Date(w.wedding_date + 'T00:00:00')
      const daysLeft = Math.ceil((wDate - now) / 86400000)
      const label = w.partner1 && w.partner2 ? `${w.partner1} & ${w.partner2}` : 'Wedding'
      for (const milestone of [30, 7, 1]) {
        if (daysLeft <= milestone && daysLeft > (milestone === 1 ? -1 : milestone - 1)) {
          rows.push({
            user_id: userId, wedding_id: w.id, type: 'wedding_reminder',
            message: `${label}: ${milestone === 1 ? 'Tomorrow!' : milestone + ' days away'}`,
            link_tab: 'overview', ref_id: `reminder-${w.id}-${milestone}d`,
          })
        }
      }
    }
    if (rows.length === 0) return
    const { error } = await supabase
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,ref_id', ignoreDuplicates: true })
    if (error) console.error('checkWeddingReminders failed:', error.message)
    await loadNotifications(userId)
  }

  // Helper: create a notification for specific users
  const createNotification = async (targetUserIds, notif) => {
    if (!session || !targetUserIds.length) return
    const rows = targetUserIds.map(uid => ({ ...notif, user_id: uid }))
    const { error } = await supabase
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,ref_id', ignoreDuplicates: true })
    if (error) console.error('createNotification failed:', error.message)
  }

  // ── Guest handlers ───────────────────────────────────────────────────────────
  const handleAddGuest = async (guest) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data } = await supabase.from('guests').insert({
        wedding_id: weddingId,
        name: guest.name,
        email: guest.email || null,
        rsvp: guest.rsvp,
        dietary: guest.dietary || null,
        guest_role: guest.guestRole || null,
        table_id: guest.tableId || null,
      }).select().single()
      if (data) setGuests(prev => [...prev, mapGuest(data)])
    }
  }

  const handleUpdateGuest = async (id, updates) => {
    if (!requireEdit()) return
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    if (session) {
      const current = guests.find(g => g.id === id)
      const m = { ...current, ...updates }
      await supabase.from('guests').update({
        name: m.name,
        email: m.email || null,
        rsvp: m.rsvp,
        dietary: m.dietary || null,
        guest_role: m.guestRole || null,
        table_id: m.tableId || null,
        seat_number: m.seatNumber ?? null,
      }).eq('id', id)
    }
  }

  const handleDeleteGuest = async (id) => {
    if (!requireEdit()) return
    setGuests(prev => prev.filter(g => g.id !== id))
    if (session) await supabase.from('guests').delete().eq('id', id)
  }

  const handleImportGuests = async (guestList) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const rows = guestList.map(g => ({
        wedding_id: weddingId,
        name: g.name,
        email: g.email || null,
        rsvp: g.rsvp || 'pending',
        dietary: g.dietary || null,
        guest_role: g.guestRole || null,
        table_id: null,
      }))
      const { data } = await supabase.from('guests').insert(rows).select()
      if (data) setGuests(prev => [...prev, ...data.map(mapGuest)])
    }
  }

  // ── Table handlers ───────────────────────────────────────────────────────────
  const handleAddTable = async (table) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data, error } = await supabase
        .from('seating_tables')
        .insert({
          wedding_id: weddingId,
          name: table.name,
          shape: table.shape ?? 'round',
          x: table.x ?? 100,
          y: table.y ?? 100,
          capacity: table.capacity ?? 8,
        })
        .select()
        .single()
      if (data) {
        setTables(prev => [...prev, data])
      } else {
        // Columns may not exist yet — add locally so the UI still works
        console.warn('seating_tables insert failed (run SQL migration):', error?.message)
        setTables(prev => [...prev, { ...table, id: genId() }])
      }
    }
  }

  const handleUpdateTable = async (id, updates) => {
    if (!requireEdit()) return
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (session) await supabase.from('seating_tables').update(updates).eq('id', id)
  }

  const handleDeleteTable = async (id) => {
    if (!requireEdit()) return
    setTables(prev => prev.filter(t => t.id !== id))
    setGuests(prev => prev.map(g => g.tableId === id ? { ...g, tableId: null } : g))
    if (session) await supabase.from('seating_tables').delete().eq('id', id)
    // DB on delete set null handles guest.table_id automatically
  }

  // ── Room element handlers ──────────────────────────────────────────────────
  const handleAddRoomElement = async (element) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data, error } = await supabase.from('room_elements')
        .insert({ wedding_id: weddingId, ...element }).select().single()
      if (error) { console.error('Add room element failed:', error.message); return }
      if (data) setRoomElements(prev => [...prev, data])
    }
  }

  const handleUpdateRoomElement = async (id, updates) => {
    if (!requireEdit()) return
    setRoomElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    if (session) {
      const { error } = await supabase.from('room_elements').update(updates).eq('id', id)
      if (error) console.error('Update room element failed:', error.message)
    }
  }

  const handleDeleteRoomElement = async (id) => {
    if (!requireEdit()) return
    setRoomElements(prev => prev.filter(e => e.id !== id))
    if (session) {
      const { error } = await supabase.from('room_elements').delete().eq('id', id)
      if (error) console.error('Delete room element failed:', error.message)
    }
  }

  // ── Bulk import: Tasks ──────────────────────────────────────────────────────
  const handleImportTasks = async (taskList) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const rows = taskList.map(t => ({
        wedding_id: weddingId,
        title: t.title,
        done: t.completed ?? false,
        due_date: t.dueDate || null,
        assigned_to: t.assignedTo || null,
        priority: t.priority || 'medium',
      }))
      const { data } = await supabase.from('tasks').insert(rows).select()
      if (data) setTasks(prev => [...prev, ...data.map(mapTask)])
    }
  }

  // ── Task handlers ────────────────────────────────────────────────────────────
  const handleAddTask = async (task) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data } = await supabase.from('tasks').insert({
        wedding_id: weddingId,
        title: task.title,
        done: task.completed,
        due_date: task.dueDate || null,
        assigned_to: task.assignedTo || null,
        priority: task.priority,
      }).select().single()
      if (data) setTasks(prev => [...prev, mapTask(data)])
    }
  }

  const handleUpdateTask = async (id, updates) => {
    if (!requireEdit()) return
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (session) {
      const current = tasks.find(t => t.id === id)
      const m = { ...current, ...updates }
      await supabase.from('tasks').update({
        title: m.title,
        done: m.completed,
        due_date: m.dueDate || null,
        assigned_to: m.assignedTo || null,
        priority: m.priority,
      }).eq('id', id)
    }
  }

  const handleDeleteTask = async (id) => {
    if (!requireEdit()) return
    setTasks(prev => prev.filter(t => t.id !== id))
    if (session) await supabase.from('tasks').delete().eq('id', id)
  }

  // ── Bulk import: Vendors ────────────────────────────────────────────────────
  const handleImportVendors = async (vendorList) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const rows = vendorList.map(v => ({
        wedding_id: weddingId,
        name: v.name,
        role: v.role || 'other',
        phone: v.phone || null,
        email: v.email || null,
        notes: v.notes || null,
        amount: Number(v.amount) || 0,
        due_date: v.dueDate || null,
        paid: !!v.paid,
      }))
      const { data } = await supabase.from('vendors').insert(rows).select()
      if (data) setVendors(prev => [...prev, ...data])
    }
  }

  // ── Vendor handlers ──────────────────────────────────────────────────────────
  const handleAddVendor = async (vendor) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data, error } = await supabase.from('vendors').insert({
        wedding_id: weddingId,
        name: vendor.name, role: vendor.role, phone: vendor.phone || null,
        email: vendor.email || null, notes: vendor.notes || null,
        amount: Number(vendor.amount) || 0, due_date: vendor.dueDate || null, paid: !!vendor.paid,
      }).select().single()
      if (error) { console.error('Add vendor failed:', error.message); return }
      if (data) setVendors(prev => [...prev, data])
    }
  }

  const handleUpdateVendor = async (id, updates) => {
    if (!requireEdit()) return
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    if (session) {
      const current = vendors.find(v => v.id === id)
      const m = { ...current, ...updates }
      await supabase.from('vendors').update({
        name: m.name, role: m.role, phone: m.phone || null,
        email: m.email || null, notes: m.notes || null,
        amount: Number(m.amount) || 0, due_date: m.dueDate || null, paid: !!m.paid,
      }).eq('id', id)
    }
  }

  const handleDeleteVendor = async (id) => {
    if (!requireEdit()) return
    setVendors(prev => prev.filter(v => v.id !== id))
    if (session) await supabase.from('vendors').delete().eq('id', id)
  }

  // ── Notes handlers ─────────────────────────────────────────────────────────
  const handleAddNote = async (note) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data } = await supabase.from('notes').insert({
        wedding_id: weddingId,
        title: note.title,
        body: note.body || '',
        visibility: note.visibility || 'shared',
        created_by: session.user.id,
      }).select().single()
      if (data) setNotes(prev => [mapNote(data), ...prev])
    }
  }

  const handleUpdateNote = async (id, updates) => {
    if (!requireEdit()) return
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (session) {
      const current = notes.find(n => n.id === id)
      const m = { ...current, ...updates }
      await supabase.from('notes').update({
        title: m.title,
        body: m.body,
        visibility: m.visibility,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }
  }

  const handleDeleteNote = async (id) => {
    if (!requireEdit()) return
    setNotes(prev => prev.filter(n => n.id !== id))
    if (session) await supabase.from('notes').delete().eq('id', id)
  }

  // ── Guidance block handlers ────────────────────────────────────────────────
  const handleAddGuidanceBlock = async (type, content) => {
    if (!requireEdit() || !session || !weddingId) return
    const maxSort = guidanceBlocks.reduce((m, b) => Math.max(m, b.sortOrder), -1)
    const { data, error } = await supabase.from('guidance_blocks').insert({
      wedding_id: weddingId, type, content, sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Add guidance block failed:', error.message); return }
    if (data) {
      setGuidanceBlocks(prev => [...prev, mapGuidanceBlock(data)])
      // Notify couple collaborators about new guidance content
      const { data: coupleMembers } = await supabase
        .from('wedding_members')
        .select('user_id')
        .eq('wedding_id', weddingId)
        .eq('role', 'couple')
      if (coupleMembers?.length) {
        const title = type === 'header' ? content.title : type === 'text' ? 'text block' : type === 'file' ? content.file_name : 'image'
        createNotification(
          coupleMembers.map(m => m.user_id),
          { wedding_id: weddingId, type: 'guidance_upload', message: `New guidance added: ${title}`, link_tab: 'guidance', ref_id: 'guidance-' + data.id }
        )
      }
    }
  }

  const handleUpdateGuidanceBlock = async (id, updates) => {
    if (!requireEdit()) return
    setGuidanceBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    if (session) {
      const dbUpdates = {}
      if (updates.content !== undefined) dbUpdates.content = updates.content
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder
      await supabase.from('guidance_blocks').update(dbUpdates).eq('id', id)
    }
  }

  const handleDeleteGuidanceBlock = async (id) => {
    if (!requireEdit()) return
    const block = guidanceBlocks.find(b => b.id === id)
    setGuidanceBlocks(prev => prev.filter(b => b.id !== id))
    if (session) {
      // Clean up storage file if file/image block
      if (block && (block.type === 'file' || block.type === 'image')) {
        const url = block.content?.file_url || block.content?.image_url
        if (url) {
          const path = url.split('/guidance-files/')[1]?.split('?')[0]
          if (path) await supabase.storage.from('guidance-files').remove([decodeURIComponent(path)])
        }
      }
      await supabase.from('guidance_blocks').delete().eq('id', id)
    }
  }

  const handleReorderGuidanceBlock = async (id, direction) => {
    if (!requireEdit()) return
    const sorted = [...guidanceBlocks].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(b => b.id === id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx], b = sorted[swapIdx]
    const aOrder = a.sortOrder, bOrder = b.sortOrder
    setGuidanceBlocks(prev => prev.map(bl => {
      if (bl.id === a.id) return { ...bl, sortOrder: bOrder }
      if (bl.id === b.id) return { ...bl, sortOrder: aOrder }
      return bl
    }))
    if (session) {
      await Promise.all([
        supabase.from('guidance_blocks').update({ sort_order: bOrder }).eq('id', a.id),
        supabase.from('guidance_blocks').update({ sort_order: aOrder }).eq('id', b.id),
      ])
    }
  }

  const handleUploadGuidanceFile = async (file) => {
    if (!session || !weddingId) return null
    const ext = file.name.split('.').pop()
    const path = `${weddingId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('guidance-files').upload(path, file)
    if (upErr) { console.error('Guidance file upload failed:', upErr.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('guidance-files').getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  // ── Design Studio handlers ─────────────────────────────────────────────────
  const handleInitDesignBoards = async () => {
    if (!session || !weddingId || designBoards.length > 0) return
    const rows = DEFAULT_DESIGN_BOARDS.map((b, i) => ({
      wedding_id: weddingId, name: b.name, category: b.category, sort_order: i, is_default: true,
    }))
    const { data, error } = await supabase.from('design_boards').insert(rows).select()
    if (error) { console.error('Init design boards failed:', error.message); return }
    if (data) setDesignBoards(data.map(mapDesignBoard))
  }

  const handleAddDesignBoard = async (name, category) => {
    if (!requireEdit() || !session || !weddingId) return
    const maxSort = designBoards.reduce((m, b) => Math.max(m, b.sortOrder), -1)
    const { data, error } = await supabase.from('design_boards').insert({
      wedding_id: weddingId, name, category: category || '', sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Add design board failed:', error.message); return }
    if (data) setDesignBoards(prev => [...prev, mapDesignBoard(data)])
  }

  const handleUpdateDesignBoard = async (id, updates) => {
    if (!requireEdit()) return
    setDesignBoards(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    if (session) {
      const dbUpdates = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.category !== undefined) dbUpdates.category = updates.category
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder
      await supabase.from('design_boards').update(dbUpdates).eq('id', id)
    }
  }

  const handleDeleteDesignBoard = async (id) => {
    if (!requireEdit()) return
    const boardPhotos = designPhotos.filter(p => p.boardId === id)
    setDesignBoards(prev => prev.filter(b => b.id !== id))
    setDesignPhotos(prev => prev.filter(p => p.boardId !== id))
    if (session) {
      if (boardPhotos.length > 0) {
        const paths = boardPhotos
          .map(p => p.fileUrl.split('/design-boards/')[1]?.split('?')[0])
          .filter(Boolean)
          .map(p => decodeURIComponent(p))
        if (paths.length > 0) await supabase.storage.from('design-boards').remove(paths)
      }
      await supabase.from('design_boards').delete().eq('id', id)
    }
  }

  const handleUploadDesignPhoto = async (boardId, file) => {
    if (!session || !weddingId) return null
    const ext = file.name.split('.').pop()
    const path = `${weddingId}/${boardId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('design-boards').upload(path, file)
    if (upErr) { console.error('Design photo upload failed:', upErr.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('design-boards').getPublicUrl(path)
    const maxSort = designPhotos.filter(p => p.boardId === boardId).reduce((m, p) => Math.max(m, p.sortOrder), -1)
    const { data, error } = await supabase.from('design_photos').insert({
      board_id: boardId, wedding_id: weddingId, file_url: `${publicUrl}?t=${Date.now()}`, file_name: file.name, sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Insert design photo failed:', error.message); return null }
    if (data) setDesignPhotos(prev => [...prev, mapDesignPhoto(data)])
    return data
  }

  const handleDeleteDesignPhoto = async (photoId) => {
    if (!requireEdit()) return
    const photo = designPhotos.find(p => p.id === photoId)
    setDesignPhotos(prev => prev.filter(p => p.id !== photoId))
    if (session && photo) {
      const path = photo.fileUrl.split('/design-boards/')[1]?.split('?')[0]
      if (path) await supabase.storage.from('design-boards').remove([decodeURIComponent(path)])
      await supabase.from('design_photos').delete().eq('id', photoId)
    }
  }

  // ── Timeline handlers ──────────────────────────────────────────────────────
  const handleAddTimelineDay = async (day) => {
    if (!session || !weddingId) return
    const maxSort = timelineDays.reduce((m, d) => Math.max(m, d.sort_order), -1)
    const { data, error } = await supabase.from('timeline_days').insert({
      wedding_id: weddingId, label: day.label, date: day.date || null, description: day.description || null, sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Add timeline day failed:', error.message); return }
    if (data) setTimelineDays(prev => [...prev, data])
    return data
  }

  const handleUpdateTimelineDay = async (id, updates) => {
    if (!session) return
    const { data, error } = await supabase.from('timeline_days').update(updates).eq('id', id).select().single()
    if (error) { console.error('Update timeline day failed:', error.message); return }
    if (data) setTimelineDays(prev => prev.map(d => d.id === id ? data : d))
  }

  const handleDeleteTimelineDay = async (id) => {
    if (!session) return
    const { error } = await supabase.from('timeline_days').delete().eq('id', id)
    if (error) { console.error('Delete timeline day failed:', error.message); return }
    setTimelineDays(prev => prev.filter(d => d.id !== id))
    setTimelineEvents(prev => prev.filter(e => e.day_id !== id))
  }

  const handleUploadDayFile = async (dayId, file) => {
    if (!session || !weddingId) return
    const ext = file.name.split('.').pop()
    const path = `${weddingId}/${dayId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('timeline-files').upload(path, file)
    if (upErr) { console.error('File upload failed:', upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('timeline-files').getPublicUrl(path)
    const { data, error } = await supabase.from('timeline_days').update({ file_url: publicUrl, file_name: file.name }).eq('id', dayId).select().single()
    if (error) { console.error('Update day file failed:', error.message); return }
    if (data) setTimelineDays(prev => prev.map(d => d.id === dayId ? data : d))
  }

  const handleRemoveDayFile = async (dayId) => {
    if (!session) return
    const { data, error } = await supabase.from('timeline_days').update({ file_url: null, file_name: null }).eq('id', dayId).select().single()
    if (error) { console.error('Remove day file failed:', error.message); return }
    if (data) setTimelineDays(prev => prev.map(d => d.id === dayId ? data : d))
  }

  const handleAddTimelineEvent = async (event) => {
    if (!session || !weddingId) return
    const dayEvents = timelineEvents.filter(e => e.day_id === event.day_id)
    const maxSort = dayEvents.reduce((m, e) => Math.max(m, e.sort_order), -1)
    const { data, error } = await supabase.from('timeline_events').insert({
      wedding_id: weddingId, day_id: event.day_id,
      time: event.time, title: event.title,
      location: event.location || null, address: event.address || null,
      assigned_to: event.assigned_to || null,
      vendor_id: event.vendor_id || null, assignees: event.assignees || [],
      notes: event.notes || null, sort_order: maxSort + 1,
    }).select().single()
    if (error) { console.error('Add timeline event failed:', error.message); return }
    if (data) {
      setTimelineEvents(prev => [...prev, data])
      // Notify assigned vendor
      if (event.vendor_id) {
        const vendor = vendors.find(v => v.id === event.vendor_id)
        if (vendor) {
          const { data: vendorMembers } = await supabase
            .from('wedding_members')
            .select('user_id')
            .eq('wedding_id', weddingId)
            .eq('role', 'vendor')
          if (vendorMembers?.length) {
            createNotification(
              vendorMembers.map(m => m.user_id),
              { wedding_id: weddingId, type: 'timeline_assigned', message: `Timeline event assigned: ${event.title}`, link_tab: 'dayofcontacts', ref_id: 'timeline-' + data.id }
            )
          }
        }
      }
    }
  }

  const handleUpdateTimelineEvent = async (id, updates) => {
    if (!session) return
    const { data, error } = await supabase.from('timeline_events').update(updates).eq('id', id).select().single()
    if (error) { console.error('Update timeline event failed:', error.message); return }
    if (data) setTimelineEvents(prev => prev.map(e => e.id === id ? data : e))
  }

  const handleDeleteTimelineEvent = async (id) => {
    if (!session) return
    const { error } = await supabase.from('timeline_events').delete().eq('id', id)
    if (error) { console.error('Delete timeline event failed:', error.message); return }
    setTimelineEvents(prev => prev.filter(e => e.id !== id))
  }

  const handleReorderTimelineEvents = async (dayId, orderedIds) => {
    if (!session) return
    const updates = orderedIds.map((id, i) => ({ id, sort_order: i }))
    // Optimistic update
    setTimelineEvents(prev => prev.map(e => {
      const u = updates.find(u => u.id === e.id)
      return u ? { ...e, sort_order: u.sort_order } : e
    }))
    for (const u of updates) {
      const { error } = await supabase.from('timeline_events').update({ sort_order: u.sort_order }).eq('id', u.id)
      if (error) console.error('Reorder event failed:', error.message)
    }
  }

  // ── Messaging handlers ───────────────────────────────────────────────────────
  const handleAddMessage = async (msg) => {
    if (session && weddingId) {
      const isRealChannel = channels.some(c => c.id === msg.channelId && c.type !== 'dm')
      if (isRealChannel) {
        const senderName =
          collaborators.find(c => c.id === session.user.id)?.name || session.user.email
        await supabase.from('messages').insert({
          channel_id: msg.channelId,
          sender_id: session.user.id,
          sender_name: senderName,
          body: msg.text,
        })
        // Realtime subscription adds to local state — no manual push needed
        return
      }
    }
    // DM: local only
    setMessages(prev => [...prev, { ...msg, id: genId(), timestamp: new Date().toISOString() }])
  }

  const handleAddChannel = async (channel) => {
    const creatorId = session?.user?.id

    if (session && weddingId && channel.type !== 'dm') {
      const { data } = await supabase.from('channels').insert({
        wedding_id: weddingId,
        name: channel.name,
        type: 'channel',
        created_by: creatorId,
      }).select().single()
      if (!data) return

      setChannels(prev => [...prev, data])

      // Add creator + selected members
      const memberIds = [...new Set([creatorId, ...(channel.members || [])])]
      const memberRows = memberIds.map(uid => ({ channel_id: data.id, user_id: uid }))
      await supabase.from('channel_members').insert(memberRows)
      setChannelMembers(prev => [...prev, ...memberIds.map(uid => ({ channelId: data.id, userId: uid }))])

      // System message
      await supabase.from('messages').insert({
        channel_id: data.id, sender_id: 'system', sender_name: 'System',
        body: `Channel #${channel.name} was created.`,
      })
    } else {
      // DM channels: local only
      const newId = genId()
      setChannels(prev => [...prev, { ...channel, id: newId, type: channel.type || 'channel' }])
      const memberIds = [...new Set([creatorId, ...(channel.members || [])])]
      setChannelMembers(prev => [...prev, ...memberIds.map(uid => ({ channelId: newId, userId: uid }))])
    }
  }

  const handleAddChannelMembers = async (channelId, userIds) => {
    const existing = new Set(channelMembers.filter(m => m.channelId === channelId).map(m => m.userId))
    const newIds = userIds.filter(uid => !existing.has(uid))
    if (newIds.length === 0) return

    if (session && weddingId) {
      await supabase.from('channel_members').insert(newIds.map(uid => ({ channel_id: channelId, user_id: uid })))
    }
    setChannelMembers(prev => [...prev, ...newIds.map(uid => ({ channelId, userId: uid }))])

    // System message
    const names = newIds.map(uid => {
      const c = collaborators.find(co => co.id === uid || co.user_id === uid)
      return c?.name || 'Someone'
    }).join(', ')
    const sysMsg = { channelId, senderId: 'system', senderName: 'System', text: `${names} joined the channel.` }
    if (session && weddingId) {
      await supabase.from('messages').insert({ channel_id: channelId, sender_id: 'system', sender_name: 'System', body: sysMsg.text })
    }
  }

  const handleRemoveChannelMember = async (channelId, userId) => {
    setChannelMembers(prev => prev.filter(m => !(m.channelId === channelId && m.userId === userId)))
    if (session && weddingId) {
      await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', userId)
    }
  }

  // ── Bulk import: Invoices ───────────────────────────────────────────────────
  const handleImportInvoices = async (invoiceList) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const rows = invoiceList.map(inv => ({
        wedding_id: weddingId,
        invoice_number: inv.invoiceNumber || null,
        vendor_name: inv.vendorName,
        amount: Number(inv.amount) || 0,
        due_date: inv.dueDate || null,
        status: inv.status || 'unpaid',
        notes: inv.notes || null,
        file_url: null,
        file_name: null,
      }))
      const { data } = await supabase.from('invoices').insert(rows).select()
      if (data) setInvoices(prev => [...prev, ...data.map(mapInvoice)])
    }
  }

  // ── Invoice handlers ─────────────────────────────────────────────────────────
  const handleAddInvoice = async (invoice) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      const { data } = await supabase.from('invoices').insert({
        wedding_id: weddingId,
        invoice_number: invoice.invoiceNumber || null,
        vendor_name: invoice.vendorName,
        amount: Number(invoice.amount) || 0,
        due_date: invoice.dueDate || null,
        status: invoice.status,
        notes: invoice.notes || null,
        file_url: invoice.fileUrl,
        file_name: invoice.fileName,
      }).select().single()
      if (data) setInvoices(prev => [...prev, mapInvoice(data)])
    }
  }

  const handleUpdateInvoice = async (id, updates) => {
    if (!requireEdit()) return
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    if (session) {
      const current = invoices.find(i => i.id === id)
      const m = { ...current, ...updates }
      await supabase.from('invoices').update({
        invoice_number: m.invoiceNumber || null,
        vendor_name: m.vendorName,
        amount: Number(m.amount) || 0,
        due_date: m.dueDate || null,
        status: m.status,
        notes: m.notes || null,
        file_url: m.fileUrl,
        file_name: m.fileName,
      }).eq('id', id)
    }
  }

  const handleDeleteInvoice = async (id) => {
    if (!requireEdit()) return
    setInvoices(prev => prev.filter(i => i.id !== id))
    if (session) await supabase.from('invoices').delete().eq('id', id)
  }

  // ── Collaborator handlers ────────────────────────────────────────────────────
  const handleAddCollaborator = async (collab) => {
    if (!requireEdit()) return
    if (session && weddingId) {
      // Enforce unique email — query DB directly so it works even if local state is stale
      if (collab.email) {
        const { data: existing } = await supabase
          .from('collaborators')
          .select('id')
          .eq('wedding_id', weddingId)
          .ilike('email', collab.email)
          .maybeSingle()
        if (existing) return { error: 'already_exists' }
      }

      const { data, error: insertError } = await supabase.from('collaborators').insert({
        wedding_id: weddingId,
        name: collab.name,
        email: collab.email || null,
        role: collab.role,
        access: collab.access,
      }).select().single()
      if (insertError) return { error: insertError.message }
      if (data) {
        setCollaborators(prev => [...prev, data])
        // Auto-add to #general channel
        const generalCh = channels.find(c => c.name === 'general' && c.type !== 'dm')
        if (generalCh) {
          const memberId = data.user_id || data.id
          handleAddChannelMembers(generalCh.id, [memberId])
        }
      }

      // Create invite token so they can actually join
      if (collab.email) {
        const { data: tokenRow, error: tokenError } = await supabase.from('invite_tokens').insert({
          wedding_id: weddingId,
          email: collab.email,
          name: collab.name,
          role: collab.role,
          access: collab.access,
        }).select('token').single()

        if (tokenError) return { error: 'token_failed: ' + tokenError.message }

        const token = tokenRow?.token ?? null
        if (!token) return { error: 'no_token_returned' }

        // Send invite email via Edge Function
        const appBase = import.meta.env.VITE_APP_URL || window.location.origin
        const inviteUrl = `${appBase}?invite=${token}`
        const weddingTitle = wedding?.partner1 && wedding?.partner2
          ? `${wedding.partner1} & ${wedding.partner2}'s Wedding`
          : 'a wedding'
        const inviterName = session.user.user_metadata?.full_name || session.user.email

        try {
          const { error: fnError } = await supabase.functions.invoke('send-invite', {
            body: {
              to: collab.email,
              recipientName: collab.name,
              inviterName,
              weddingTitle,
              inviteUrl,
              role: collab.role,
              access: collab.access,
            },
          })
          return { token, emailSent: !fnError, emailError: fnError?.message ?? null }
        } catch (err) {
          return { token, emailSent: false, emailError: err.message }
        }
      }
    }
    return null
  }

  const handleDeleteCollaborator = async (id) => {
    if (!requireEdit()) return
    const collab = collaborators.find(c => c.id === id)
    setCollaborators(prev => prev.filter(c => c.id !== id))
    if (session) {
      await supabase.from('collaborators').delete().eq('id', id)
      // Also revoke any unused invite tokens for this email
      if (collab?.email) {
        await supabase.from('invite_tokens')
          .delete()
          .eq('wedding_id', weddingId)
          .eq('email', collab.email)
          .eq('used', false)
      }
      // Also remove from wedding_members
      if (collab?.user_id) {
        await supabase.from('wedding_members')
          .delete()
          .eq('wedding_id', weddingId)
          .eq('user_id', collab.user_id)
      }
    }
  }

  // ── Wedding setup (onboarding) ───────────────────────────────────────────────
  const handleWeddingSetup = async ({ partner1, partner2, weddingDate }) => {
    await supabase.from('weddings').update({
      partner1,
      partner2,
      wedding_date: weddingDate,
      setup_complete: true,
    }).eq('id', weddingId)
    const updated = { partner1, partner2, wedding_date: weddingDate, setup_complete: true }
    setWedding(prev => ({ ...prev, ...updated }))
    setMyWeddings(prev => prev.map(w => w.id === weddingId ? { ...w, ...updated } : w))
  }

  // ── Budget ───────────────────────────────────────────────────────────────────
  const handleSetBudget = async (budget) => {
    if (!requireEdit()) return
    setWedding(prev => ({ ...prev, budget }))
    if (session && weddingId) await supabase.from('weddings').update({ budget }).eq('id', weddingId)
  }

  // ── Stripe upgrade ───────────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    if (!session) { setAuthOpen(true); return }
    const upgradeWeddingId = weddingId || myWeddings.find(w => w.myRole === 'owner')?.id
    if (!upgradeWeddingId) return
    try {
      const origin = import.meta.env.VITE_APP_URL || window.location.origin
      // Get fresh token (session in state may be stale/expired)
      const { data: { session: fresh } } = await supabase.auth.getSession()
      if (!fresh) { setAuthOpen(true); return }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fresh.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          weddingId: upgradeWeddingId,
          successUrl: `${origin}/app?stripe_success=1`,
          cancelUrl: `${origin}/app`,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.url) {
        alert(`Checkout error: ${body.error || 'Could not start checkout. Please try again.'}`)
        return
      }
      window.location.href = body.url
    } catch {
      alert('Stripe checkout unavailable. Please try again.')
    }
  }

  // Mark pro after successful Stripe payment return (upgrade all owned weddings)
  useEffect(() => {
    if (!stripeSuccess || !session) return
    const ownedIds = myWeddings.filter(w => w.myRole === 'owner').map(w => w.id)
    if (ownedIds.length === 0 && weddingId) {
      // Fallback: at least upgrade the current wedding
      ownedIds.push(weddingId)
    }
    if (ownedIds.length === 0) return
    supabase.from('weddings').update({ plan: 'pro' }).in('id', ownedIds).then(() => {
      setWedding(prev => prev ? { ...prev, plan: 'pro' } : prev)
      setMyWeddings(prev => prev.map(w => w.myRole === 'owner' ? { ...w, plan: 'pro' } : w))
      setShowProBanner(true)
      setTimeout(() => setShowProBanner(false), 8000)
      navigate('/app', { replace: true })
    })
  }, [stripeSuccess, session, myWeddings.length])

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = () => supabase.auth.signOut()

  // ── Profile handlers ────────────────────────────────────────────────────────
  const handleUpdateProfile = async (displayName) => {
    if (!session?.user) return
    const userId = session.user.id
    const { data, error } = await supabase.from('profiles').upsert({
      id: userId, display_name: displayName, updated_at: new Date().toISOString(),
    }).select().single()
    if (error) { console.error('Profile update failed:', error.message); return }
    if (data) setProfile(data)
  }

  const handleUploadAvatar = async (file) => {
    if (!session?.user || !file) return
    const userId = session.user.id
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { console.error('Avatar upload failed:', upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = publicUrl + '?t=' + Date.now()
    const { data, error } = await supabase.from('profiles').upsert({
      id: userId, avatar_url: url, updated_at: new Date().toISOString(),
    }).select().single()
    if (error) { console.error('Avatar URL save failed:', error.message); return }
    if (data) setProfile(data)
  }

  const handleDeleteAccount = async () => {
    if (!session?.user) return
    const { error } = await supabase.rpc('delete_own_account')
    if (error) { console.error('Delete account failed:', error.message); return }
    await supabase.auth.signOut()
  }

  const handleSubmitTicket = async (subject, message) => {
    if (!session?.user) return
    const { error } = await supabase.from('support_tickets').insert({
      user_id: session.user.id,
      email: session.user.email,
      subject,
      message,
    })
    if (error) console.error('Ticket submit failed:', error.message)
    setHelpOpen(false)
  }

  // ── Permissions ──────────────────────────────────────────────────────────────
  const activeWedObj = myWeddings.find(w => w.id === activeWeddingId)
  const myRole = activeWedObj?.myRole || 'viewer'
  const permissions = usePermissions(myRole)

  const hiddenTabs = useMemo(() => {
    const h = new Set()
    if (!permissions.canViewBilling) h.add('billing')
    if (!permissions.canViewCollaborators) h.add('collaborators')
    if (permissions.isVendor) {
      h.add('guests')
      h.add('seating')
      h.add('tasks')
      h.add('notes')
      h.add('guidance')
      h.add('design')
      h.add('dayofcontacts')
    }
    if (!permissions.canViewGuidance) h.add('guidance')
    if (!permissions.canViewDesign) h.add('design')
    return h
  }, [myRole])

  const requireEdit = () => {
    if (!permissions.canEdit) {
      console.warn('Permission denied: requires owner or planner role')
      return false
    }
    return true
  }

  // ── Tab renderer ─────────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            guests={guests}
            tasks={tasks}
            vendors={vendors}
            invoices={invoices}
            onNavigate={setActiveTab}
            weddingDate={wedding?.wedding_date ?? null}
            isPro={wedding?.plan === 'pro'}
            onUpgrade={permissions.isOwner ? handleUpgrade : undefined}
            isOwner={permissions.isOwner}
            canEdit={permissions.canEdit}
          />
        )
      case 'guests':
        return (
          <GuestList
            guests={guests}
            tables={tables}
            onAddGuest={handleAddGuest}
            onUpdateGuest={handleUpdateGuest}
            onDeleteGuest={handleDeleteGuest}
            onImportGuests={handleImportGuests}
            canEdit={permissions.canEditGuests}
            rsvpSlug={wedding?.rsvp_slug ?? null}
          />
        )
      case 'seating':
        return (
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>Seating Chart</div>
            <div className="section-subtitle" style={{ marginBottom: 20 }}>
              {guests.length} GUESTS · {guests.filter(g => g.tableId).length} SEATED · {guests.filter(g => !g.tableId).length} UNASSIGNED
            </div>
            <SeatingChart
              guests={guests}
              tables={tables}
              onUpdateGuest={handleUpdateGuest}
              onUpdateTable={handleUpdateTable}
              onAddTable={handleAddTable}
              onDeleteTable={handleDeleteTable}
              canEdit={permissions.canEditGuests}
              roomElements={roomElements}
              onAddRoomElement={handleAddRoomElement}
              onUpdateRoomElement={handleUpdateRoomElement}
              onDeleteRoomElement={handleDeleteRoomElement}
            />
          </div>
        )
      case 'tasks':
        return (
          <TaskList
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onImportTasks={handleImportTasks}
            canEdit={permissions.canEditTasks}
          />
        )
      case 'vendors':
        return (
          <VendorHub
            vendors={vendors}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
            onImportVendors={handleImportVendors}
            budget={wedding?.budget ?? 0}
            onSetBudget={handleSetBudget}
            canEdit={permissions.canEditVendors}
            vendorFilterEmail={permissions.isVendor ? session?.user?.email : null}
          />
        )
      case 'messaging': {
        const me = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'You',
          email: session.user.email,
        }
        return (
          <Messaging
            channels={channels}
            channelMembers={channelMembers}
            messages={messages}
            collaborators={collaborators}
            me={me}
            tasks={tasks}
            onAddMessage={handleAddMessage}
            onAddChannel={handleAddChannel}
            onAddChannelMembers={handleAddChannelMembers}
            onRemoveChannelMember={handleRemoveChannelMember}
            onNavigate={setActiveTab}
            canCreateChannel={permissions.canCreateChannel}
          />
        )
      }
      case 'billing':
        return (
          <Billing
            invoices={invoices}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onImportInvoices={handleImportInvoices}
            budget={wedding?.budget ?? 0}
            onSetBudget={handleSetBudget}
            canEdit={permissions.canEditBilling}
          />
        )
      case 'collaborators':
        return (
          <Collaborators
            collaborators={collaborators}
            vendors={vendors}
            onAddCollaborator={handleAddCollaborator}
            onDeleteCollaborator={handleDeleteCollaborator}
            isAuthenticated={!!session}
            canInvite={permissions.canInvite}
            canEdit={permissions.canEdit}
            isPro={wedding?.plan === 'pro'}
            onUpgrade={handleUpgrade}
            rsvpSlug={wedding?.rsvp_slug ?? null}
          />
        )
      case 'dayofcontacts':
        return (
          <DayOfContacts
            days={timelineDays}
            events={timelineEvents}
            wedding={wedding}
            vendors={vendors}
            collaborators={collaborators}
            guests={guests}
            onAddDay={handleAddTimelineDay}
            onUpdateDay={handleUpdateTimelineDay}
            onDeleteDay={handleDeleteTimelineDay}
            onAddEvent={handleAddTimelineEvent}
            onUpdateEvent={handleUpdateTimelineEvent}
            onDeleteEvent={handleDeleteTimelineEvent}
            onReorderEvents={handleReorderTimelineEvents}
            onUploadDayFile={handleUploadDayFile}
            onRemoveDayFile={handleRemoveDayFile}
            canEdit={permissions.canEdit}
          />
        )
      case 'notes':
        return (
          <Notes
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            canSeePrivate={permissions.canSeePrivateNotes}
            canEdit={permissions.canEditNotes}
          />
        )
      case 'guidance':
        return (
          <Guidance
            blocks={guidanceBlocks}
            onAddBlock={handleAddGuidanceBlock}
            onUpdateBlock={handleUpdateGuidanceBlock}
            onDeleteBlock={handleDeleteGuidanceBlock}
            onReorderBlock={handleReorderGuidanceBlock}
            onUploadFile={handleUploadGuidanceFile}
            canEdit={permissions.canEditGuidance}
          />
        )
      case 'design':
        return (
          <DesignStudio
            boards={designBoards}
            photos={designPhotos}
            onInitBoards={handleInitDesignBoards}
            onAddBoard={handleAddDesignBoard}
            onUpdateBoard={handleUpdateDesignBoard}
            onDeleteBoard={handleDeleteDesignBoard}
            onUploadPhoto={handleUploadDesignPhoto}
            onDeletePhoto={handleDeleteDesignPhoto}
            canEdit={permissions.canEditDesign}
          />
        )
      default:
        return null
    }
  }

  // ── Authenticated app content (rendered inside /app route) ──────────────────
  const renderApp = () => {
    if (authLoading || dashboardLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cream)',
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontStyle: 'italic',
            color: 'var(--deep)',
            opacity: 0.7,
          }}>
            ✦ Vow &amp; Venue
          </div>
        </div>
      )
    }

    if (!session) return <Navigate to="/" replace />

    // Org dashboard (no wedding selected)
    if (activeWeddingId === null) {
      const userPlan = myWeddings.some(w => w.myRole === 'owner' && w.plan === 'pro') ? 'pro' : 'free'
      return (
        <div className="app">
          <Header
            session={session}
            wedding={null}
            isPro={userPlan === 'pro'}
            myWeddings={myWeddings}
            activeWeddingId={null}
            onSelectWedding={selectWedding}
            onSignIn={() => setAuthOpen(true)}
            onSignOut={handleSignOut}
            onHelp={() => setHelpOpen(true)}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onUploadAvatar={handleUploadAvatar}
            onDeleteAccount={handleDeleteAccount}
            profileOpen={profileOpen}
            setProfileOpen={setProfileOpen}
            deleteAccountOpen={deleteAccountOpen}
            setDeleteAccountOpen={setDeleteAccountOpen}
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onTabChange={setActiveTab}
          />
          <main className="main" style={{ maxWidth: 'none', padding: 0 }}>
            <OrgDashboard
              weddings={myWeddings}
              userPlan={userPlan}
              taskStats={dashboardTaskStats}
              sharedVendors={sharedVendors}
              profile={profile}
              teamMembers={teamMembers}
              revenue={dashboardRevenue}
              taskTemplates={taskTemplates}
              templateTasks={templateTasks}
              onSelectWedding={selectWedding}
              onCreateWedding={handleCreateWedding}
              onUpgrade={handleUpgrade}
              onUploadCover={handleUploadCover}
              onUpdateStudioName={handleUpdateStudioName}
              onCreateTemplate={handleCreateTemplate}
              onUpdateTemplate={handleUpdateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onAddTemplateTask={handleAddTemplateTask}
              onUpdateTemplateTask={handleUpdateTemplateTask}
              onDeleteTemplateTask={handleDeleteTemplateTask}
              onImportTemplate={handleImportTemplateToWedding}
              onSeedStarterTemplates={handleSeedStarterTemplates}
              onCopyVendor={handleCopyVendorToWedding}
              onArchiveWedding={handleArchiveWedding}
            />
          </main>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
          <SupportTicketModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} onSubmit={handleSubmitTicket} />
        </div>
      )
    }

    // Onboarding
    if (wedding && !wedding.setup_complete) {
      return <WeddingSetup onComplete={handleWeddingSetup} />
    }

    // App shell
    return (
      <div className="app">
        <Header
          session={session}
          wedding={wedding}
          isPro={wedding?.plan === 'pro'}
          myWeddings={myWeddings}
          activeWeddingId={activeWeddingId}
          onSelectWedding={selectWedding}
          onBackToDashboard={handleBackToDashboard}
          onSignIn={() => setAuthOpen(true)}
          onSignOut={handleSignOut}
          onHelp={() => setHelpOpen(true)}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onUploadAvatar={handleUploadAvatar}
          onDeleteAccount={handleDeleteAccount}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          deleteAccountOpen={deleteAccountOpen}
          setDeleteAccountOpen={setDeleteAccountOpen}
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onTabChange={setActiveTab}
        />
        {activeWeddingId && (
          <div className="breadcrumb-bar">
            <button className="breadcrumb-back" onClick={handleBackToDashboard}>
              &larr; All Weddings
            </button>
          </div>
        )}
        <NavTabs activeTab={activeTab} onTabChange={setActiveTab} hiddenTabs={hiddenTabs} />

        {showProBanner && (
          <div className="pro-success-banner">
            <span>✦ WELCOME TO PRO — Unlimited weddings, unlimited collaborators, priority support</span>
            <button onClick={() => setShowProBanner(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>&times;</button>
          </div>
        )}

        <main className="main">
          {renderTab()}
        </main>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        <SupportTicketModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} onSubmit={handleSubmitTicket} />
      </div>
    )
  }

  // ── Routes ─────────────────────────────────────────────────────────────────
  // Legacy ?rsvp= redirect
  const legacyRsvp = searchParams.get('rsvp')
  if (legacyRsvp) return <Navigate to={`/rsvp/${legacyRsvp}`} replace />

  return (
    <Routes>
      {/* Public RSVP page */}
      <Route path="/rsvp/:slug" element={<RSVPPage />} />

      {/* Hidden admin dashboard — must be before marketing layout redirect */}
      <Route path="/admin-x7k2p" element={<AdminDashboard />} />

      {/* Marketing site — only when not logged in */}
      <Route element={!authLoading && session ? <Navigate to="/app" replace /> : <MarketingLayout />}>
        <Route index element={<HomePage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="pricing" element={<PricingPage />} />
      </Route>

      {/* Authenticated app */}
      <Route path="/app" element={renderApp()} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
