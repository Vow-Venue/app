import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import NavTabs from './components/NavTabs'
import Overview from './components/Overview'
import GuestList from './components/GuestList'
import TaskList from './components/TaskList'
import VendorHub from './components/VendorHub'
import Messaging from './components/Messaging'
import Billing from './components/Billing'
import Collaborators from './components/Collaborators'
import DayOfContacts from './components/DayOfContacts'
import LandingPage from './components/LandingPage'
import AuthModal from './components/AuthModal'
import WeddingSetup from './components/WeddingSetup'
import RSVPPage from './components/RSVPPage'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── Seed Data (used in guest mode only) ─────────────────────────────────────

const SEED_GUESTS = [
  { id: 'g1', name: 'Emma & James Wilson',   email: 'emma@example.com',    rsvp: 'yes',     dietary: '',            tableId: 't1', guestRole: "Bride's Friend" },
  { id: 'g2', name: 'Sarah Mitchell',        email: 'sarah@example.com',   rsvp: 'pending', dietary: 'Vegetarian',  tableId: 't2', guestRole: 'Bridesmaid' },
  { id: 'g3', name: 'Robert Chen',           email: 'rchen@example.com',   rsvp: 'yes',     dietary: '',            tableId: 't1', guestRole: 'Groomsman' },
  { id: 'g4', name: 'Linda Beaumont',        email: 'linda@example.com',   rsvp: 'no',      dietary: '',            tableId: null, guestRole: "Bride's Aunt" },
  { id: 'g5', name: 'Marcus & Priya Nair',   email: 'marcus@example.com',  rsvp: 'yes',     dietary: 'Vegan',       tableId: 't2', guestRole: 'Family Friend' },
  { id: 'g6', name: 'Charlotte Webb',        email: 'cwebb@example.com',   rsvp: 'pending', dietary: 'Gluten-free', tableId: 't3', guestRole: 'Maid of Honor' },
  { id: 'g7', name: 'Thomas Harrington',     email: 'tharr@example.com',   rsvp: 'yes',     dietary: '',            tableId: 't3', guestRole: "Groom's Father" },
]

const SEED_TABLES = [
  { id: 't1', name: 'Rose Table' },
  { id: 't2', name: 'Peony Table' },
  { id: 't3', name: 'Dahlia Table' },
]

const SEED_TASKS = [
  { id: 'tk1', title: 'Book the ceremony venue',       dueDate: '2026-03-01', assignedTo: 'Olivia',  priority: 'high',   completed: true  },
  { id: 'tk2', title: 'Send save-the-date cards',      dueDate: '2026-03-15', assignedTo: 'Ethan',   priority: 'high',   completed: true  },
  { id: 'tk3', title: 'Confirm florist & flowers',     dueDate: '2026-04-01', assignedTo: 'Olivia',  priority: 'high',   completed: true  },
  { id: 'tk4', title: 'Finalize catering menu',        dueDate: '2026-04-15', assignedTo: 'Planner', priority: 'medium', completed: false },
  { id: 'tk5', title: 'Order wedding cake tasting',    dueDate: '2026-04-20', assignedTo: 'Olivia',  priority: 'medium', completed: false },
  { id: 'tk6', title: 'Confirm photographer timeline', dueDate: '2026-05-01', assignedTo: 'Planner', priority: 'high',   completed: false },
  { id: 'tk7', title: 'Arrange rehearsal dinner',      dueDate: '2026-05-10', assignedTo: 'Ethan',   priority: 'medium', completed: false },
  { id: 'tk8', title: 'Pick bridesmaid dresses',       dueDate: '2026-05-20', assignedTo: 'Olivia',  priority: 'low',    completed: false },
  { id: 'tk9', title: 'Confirm DJ setlist',            dueDate: '2026-06-01', assignedTo: 'Ethan',   priority: 'low',    completed: false },
]

const SEED_VENDORS = [
  { id: 'v1', name: 'Lumière Photography',  role: 'photographer', phone: '555-0101', email: 'hello@lumiere.co',    notes: '8-hour package, 2 shooters. Deposit paid.' },
  { id: 'v2', name: 'Blossom Florals',      role: 'florist',      phone: '555-0202', email: 'orders@blossom.com',  notes: 'White roses and peonies. Setup at 3pm.' },
  { id: 'v3', name: 'Harvest Table Co.',    role: 'caterer',      phone: '555-0303', email: 'harvest@example.com', notes: 'Tasting booked Apr 15. 3-course menu.' },
  { id: 'v4', name: 'DJ Marcus B.',         role: 'dj',           phone: '555-0404', email: 'marcusb@djmix.com',   notes: 'Ceremony + reception. 6-hour set.' },
  { id: 'v5', name: 'Rosewood Manor',       role: 'venue',        phone: '555-0505', email: 'events@rosewood.com', notes: 'Capacity 200. Indoor & garden. Deposit paid.' },
]

const SEED_CHANNELS = [
  { id: 'ch1', name: 'general' },
  { id: 'ch2', name: 'vendors' },
  { id: 'ch3', name: 'ceremony' },
]

const SEED_MESSAGES = [
  { id: 'm1', channelId: 'ch1', senderId: 'c1', text: 'Welcome to Vow & Venue! So excited for this journey together. 🌸', timestamp: '2026-02-20T09:00:00' },
  { id: 'm2', channelId: 'ch1', senderId: 'c2', text: "Let's make this the most beautiful day! Can't wait.", timestamp: '2026-02-20T09:08:00' },
  { id: 'm3', channelId: 'ch1', senderId: 'c1', text: "I've added all the vendors we've confirmed so far. Check the Vendors tab!", timestamp: '2026-02-21T10:15:00' },
  { id: 'm4', channelId: 'ch2', senderId: 'c2', text: 'Has everyone reviewed the florist quote from Blossom Florals?', timestamp: '2026-02-21T11:00:00' },
  { id: 'm5', channelId: 'ch2', senderId: 'c1', text: 'Yes — white roses and peonies look perfect. Approved!', timestamp: '2026-02-21T11:12:00' },
  { id: 'm6', channelId: 'ch2', senderId: 'c2', text: "Great. I'll confirm with them today and make sure the deposit goes through.", timestamp: '2026-02-21T11:18:00' },
  { id: 'm7', channelId: 'ch3', senderId: 'c1', text: 'Ceremony run-through scheduled for June 12th at 4pm. Please mark your calendars.', timestamp: '2026-02-22T14:00:00' },
  { id: 'm8', channelId: 'ch3', senderId: 'c2', text: "Confirmed. I'll let the officiant know as well.", timestamp: '2026-02-22T14:20:00' },
]

const SEED_INVOICES = [
  { id: 'inv1', invoiceNumber: 'INV-001', vendorName: 'Blossom Florals',      amount: 1200, dueDate: '2026-04-15', status: 'unpaid',  notes: 'White roses & peonies arrangement deposit', fileName: null, fileUrl: null },
  { id: 'inv2', invoiceNumber: 'INV-002', vendorName: 'Harvest Table Co.',    amount: 2800, dueDate: '2026-03-01', status: 'paid',    notes: 'Catering deposit — paid in full',            fileName: null, fileUrl: null },
  { id: 'inv3', invoiceNumber: 'INV-003', vendorName: 'Lumière Photography',  amount: 3500, dueDate: '2026-02-15', status: 'overdue', notes: 'Photography booking fee — OVERDUE',          fileName: null, fileUrl: null },
  { id: 'inv4', invoiceNumber: 'INV-004', vendorName: 'Rosewood Manor',       amount: 5000, dueDate: '2026-05-01', status: 'unpaid',  notes: 'Venue deposit — 50% of total required',     fileName: null, fileUrl: null },
  { id: 'inv5', invoiceNumber: 'INV-005', vendorName: 'DJ Marcus B.',         amount: 800,  dueDate: '2026-05-15', status: 'unpaid',  notes: 'Entertainment deposit',                     fileName: null, fileUrl: null },
]

const SEED_COLLABORATORS = [
  { id: 'c1', name: 'Olivia Hart', role: 'Bride', access: 'full' },
  { id: 'c2', name: 'Ethan Hart',  role: 'Groom', access: 'full' },
]

// ─── DB → App mapping helpers ─────────────────────────────────────────────────

const mapGuest = r => ({
  id: r.id,
  name: r.name,
  email: r.email ?? '',
  rsvp: r.rsvp,
  dietary: r.dietary ?? '',
  guestRole: r.guest_role ?? '',
  tableId: r.table_id,
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth
  const [session, setSession]         = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authOpen, setAuthOpen]       = useState(false)

  // ── URL params (read once on load)
  const [pendingInviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('invite') || null
  })
  const [rsvpSlug] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('rsvp') || null
  })

  // ── App view
  const [showApp, setShowApp]     = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // ── Wedding
  const [weddingId, setWeddingId] = useState(null)
  const [wedding, setWedding]     = useState(null)

  // ── Data (seeded for guest mode)
  const [guests, setGuests]             = useState(SEED_GUESTS)
  const [tables, setTables]             = useState(SEED_TABLES)
  const [tasks, setTasks]               = useState(SEED_TASKS)
  const [vendors, setVendors]           = useState(SEED_VENDORS)
  const [channels, setChannels]         = useState(SEED_CHANNELS)
  const [messages, setMessages]         = useState(SEED_MESSAGES)
  const [invoices, setInvoices]         = useState(SEED_INVOICES)
  const [collaborators, setCollaborators] = useState(SEED_COLLABORATORS)
  const [currentUserId, setCurrentUserId] = useState('c1')

  // ── Auth effect ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) setShowApp(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setShowApp(true)
        setAuthOpen(false)
      } else {
        // Sign out — reset to seed data and return to landing page
        setGuests(SEED_GUESTS)
        setTables(SEED_TABLES)
        setTasks(SEED_TASKS)
        setVendors(SEED_VENDORS)
        setChannels(SEED_CHANNELS)
        setMessages(SEED_MESSAGES)
        setInvoices(SEED_INVOICES)
        setCollaborators(SEED_COLLABORATORS)
        setCurrentUserId('c1')
        setWeddingId(null)
        setWedding(null)
        setShowApp(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Load wedding + all data when session arrives ─────────────────────────────
  useEffect(() => {
    if (!session) return
    loadWeddingAndData(session.user.id)
  }, [session?.user?.id])

  const loadWeddingAndData = async (userId) => {
    // ── Step 1: Redeem invite token if present in URL ─────────────────────────
    if (pendingInviteToken) {
      const { data: invite } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', pendingInviteToken)
        .eq('used', false)
        .maybeSingle()

      if (invite) {
        // Check 48-hour expiry
        const expiresAt = new Date(new Date(invite.created_at).getTime() + 48 * 60 * 60 * 1000)
        if (new Date() > expiresAt) {
          console.warn('Invite token has expired')
          window.history.replaceState({}, '', window.location.pathname)
        } else {
        // Mark token used + link collaborator to this user
        await supabase.from('invite_tokens').update({ used: true }).eq('id', invite.id)
        await supabase.from('collaborators')
          .upsert({ wedding_id: invite.wedding_id, user_id: userId, name: invite.name, email: invite.email, role: invite.role, access: invite.access }, { onConflict: 'wedding_id,email' })
          // Strip invite param from URL without reload
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    }

    // ── Step 2: Find wedding — own or shared via collaborator ─────────────────
    let { data: weddingRow } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // If no own wedding, check if invited as collaborator
    if (!weddingRow) {
      const { data: collab } = await supabase
        .from('collaborators')
        .select('wedding_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (collab) {
        const { data: sharedWedding } = await supabase
          .from('weddings')
          .select('*')
          .eq('id', collab.wedding_id)
          .single()
        weddingRow = sharedWedding
      }
    }

    // New user with no invite — create a blank wedding
    if (!weddingRow) {
      const { data: created } = await supabase
        .from('weddings')
        .insert({ user_id: userId })
        .select('*')
        .single()
      weddingRow = created
    }

    if (!weddingRow) return
    setWedding(weddingRow)
    setWeddingId(weddingRow.id)
    // Use weddingRow below instead of wedding
    const wedding = weddingRow

    const [gRes, tRes, tkRes, vRes, chRes, invRes, collRes] = await Promise.all([
      supabase.from('guests').select('*').eq('wedding_id', wedding.id),
      supabase.from('seating_tables').select('*').eq('wedding_id', wedding.id),
      supabase.from('tasks').select('*').eq('wedding_id', wedding.id).order('created_at'),
      supabase.from('vendors').select('*').eq('wedding_id', wedding.id),
      supabase.from('channels').select('*').eq('wedding_id', wedding.id),
      supabase.from('invoices').select('*').eq('wedding_id', wedding.id),
      supabase.from('collaborators').select('*').eq('wedding_id', wedding.id),
    ])

    setGuests((gRes.data ?? []).map(mapGuest))
    setTables(tRes.data ?? [])
    setTasks((tkRes.data ?? []).map(mapTask))
    setVendors(vRes.data ?? [])
    setInvoices((invRes.data ?? []).map(mapInvoice))
    setCollaborators(collRes.data ?? [])
    setCurrentUserId(userId)

    const fetchedChannels = chRes.data ?? []
    setChannels(fetchedChannels)

    if (fetchedChannels.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .in('channel_id', fetchedChannels.map(c => c.id))
        .order('created_at')
      setMessages((msgs ?? []).map(mapMessage))
    } else {
      setMessages([])
    }
  }

  // ── Realtime: new messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!weddingId || !session || channels.filter(c => c.type !== 'dm').length === 0) return

    const channelIds = new Set(channels.filter(c => c.type !== 'dm').map(c => c.id))

    const sub = supabase
      .channel('rt-messages-' + weddingId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (channelIds.has(payload.new.channel_id)) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, mapMessage(payload.new)]
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [weddingId, channels.length, session])

  // ── Guest handlers ───────────────────────────────────────────────────────────
  const handleAddGuest = async (guest) => {
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
    } else {
      setGuests(prev => [...prev, { ...guest, id: genId() }])
    }
  }

  const handleUpdateGuest = async (id, updates) => {
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
      }).eq('id', id)
    }
  }

  const handleDeleteGuest = async (id) => {
    setGuests(prev => prev.filter(g => g.id !== id))
    if (session) await supabase.from('guests').delete().eq('id', id)
  }

  const handleImportGuests = async (guestList) => {
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
    } else {
      setGuests(prev => [...prev, ...guestList.map(g => ({ ...g, id: genId(), tableId: null }))])
    }
  }

  // ── Table handlers ───────────────────────────────────────────────────────────
  const handleAddTable = async (table) => {
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
    } else {
      setTables(prev => [...prev, { ...table, id: genId() }])
    }
  }

  const handleUpdateTable = async (id, updates) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (session) await supabase.from('seating_tables').update(updates).eq('id', id)
  }

  const handleDeleteTable = async (id) => {
    setTables(prev => prev.filter(t => t.id !== id))
    setGuests(prev => prev.map(g => g.tableId === id ? { ...g, tableId: null } : g))
    if (session) await supabase.from('seating_tables').delete().eq('id', id)
    // DB on delete set null handles guest.table_id automatically
  }

  // ── Task handlers ────────────────────────────────────────────────────────────
  const handleAddTask = async (task) => {
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
    } else {
      setTasks(prev => [...prev, { ...task, id: genId() }])
    }
  }

  const handleUpdateTask = async (id, updates) => {
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
    setTasks(prev => prev.filter(t => t.id !== id))
    if (session) await supabase.from('tasks').delete().eq('id', id)
  }

  // ── Vendor handlers ──────────────────────────────────────────────────────────
  const handleAddVendor = async (vendor) => {
    if (session && weddingId) {
      const { data } = await supabase.from('vendors').insert({
        wedding_id: weddingId, ...vendor,
      }).select().single()
      if (data) setVendors(prev => [...prev, data])
    } else {
      setVendors(prev => [...prev, { ...vendor, id: genId() }])
    }
  }

  const handleUpdateVendor = async (id, updates) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    if (session) {
      const current = vendors.find(v => v.id === id)
      const m = { ...current, ...updates }
      await supabase.from('vendors').update({
        name: m.name, role: m.role, phone: m.phone || null,
        email: m.email || null, notes: m.notes || null,
      }).eq('id', id)
    }
  }

  const handleDeleteVendor = async (id) => {
    setVendors(prev => prev.filter(v => v.id !== id))
    if (session) await supabase.from('vendors').delete().eq('id', id)
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
    // Guest mode or DM: local only
    setMessages(prev => [...prev, { ...msg, id: genId(), timestamp: new Date().toISOString() }])
  }

  const handleAddChannel = async (channel) => {
    if (session && weddingId && channel.type !== 'dm') {
      const { data } = await supabase.from('channels').insert({
        wedding_id: weddingId,
        name: channel.name,
        type: 'channel',
      }).select().single()
      if (data) setChannels(prev => [...prev, data])
    } else {
      setChannels(prev => [...prev, { ...channel, id: genId() }])
    }
  }

  // ── Invoice handlers ─────────────────────────────────────────────────────────
  const handleAddInvoice = async (invoice) => {
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
    } else {
      setInvoices(prev => [...prev, { ...invoice, id: genId() }])
    }
  }

  const handleUpdateInvoice = async (id, updates) => {
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
    setInvoices(prev => prev.filter(i => i.id !== id))
    if (session) await supabase.from('invoices').delete().eq('id', id)
  }

  // ── Collaborator handlers ────────────────────────────────────────────────────
  const handleAddCollaborator = async (collab) => {
    if (session && weddingId) {
      const { data } = await supabase.from('collaborators').insert({
        wedding_id: weddingId,
        name: collab.name,
        email: collab.email || null,
        role: collab.role,
        access: collab.access,
      }).select().single()
      if (data) setCollaborators(prev => [...prev, data])

      // Create invite token so they can actually join
      if (collab.email) {
        const { data: tokenRow } = await supabase.from('invite_tokens').insert({
          wedding_id: weddingId,
          email: collab.email,
          name: collab.name,
          role: collab.role,
          access: collab.access,
        }).select('token').single()
        return tokenRow?.token ?? null
      }
    } else {
      setCollaborators(prev => [...prev, { ...collab, id: genId() }])
    }
    return null
  }

  const handleDeleteCollaborator = async (id) => {
    setCollaborators(prev => prev.filter(c => c.id !== id))
    if (session) await supabase.from('collaborators').delete().eq('id', id)
  }

  // ── Wedding setup (onboarding) ───────────────────────────────────────────────
  const handleWeddingSetup = async ({ partner1, partner2, weddingDate }) => {
    await supabase.from('weddings').update({
      partner1,
      partner2,
      wedding_date: weddingDate,
      setup_complete: true,
    }).eq('id', weddingId)
    setWedding(prev => ({ ...prev, partner1, partner2, wedding_date: weddingDate, setup_complete: true }))
  }

  // ── Budget ───────────────────────────────────────────────────────────────────
  const handleSetBudget = async (budget) => {
    setWedding(prev => ({ ...prev, budget }))
    if (session && weddingId) await supabase.from('weddings').update({ budget }).eq('id', weddingId)
  }

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = () => supabase.auth.signOut()

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
            onAddTable={handleAddTable}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
            onImportGuests={handleImportGuests}
          />
        )
      case 'tasks':
        return (
          <TaskList
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )
      case 'vendors':
        return (
          <VendorHub
            vendors={vendors}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        )
      case 'messaging':
        return (
          <Messaging
            channels={channels}
            messages={messages}
            collaborators={collaborators}
            currentUserId={currentUserId}
            tasks={tasks}
            onAddMessage={handleAddMessage}
            onAddChannel={handleAddChannel}
            onSetCurrentUser={setCurrentUserId}
            onNavigate={setActiveTab}
          />
        )
      case 'billing':
        return (
          <Billing
            invoices={invoices}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            budget={wedding?.budget ?? 0}
            onSetBudget={handleSetBudget}
          />
        )
      case 'collaborators': {
        const isOwner = !!(session && wedding && session.user.id === wedding.user_id)
        const myCollab = collaborators.find(c => c.user_id === session?.user?.id)
        const myRole = myCollab?.role?.toLowerCase() ?? ''
        const canInvite = !session || isOwner || myRole.includes('planner') || myRole === 'owner'
        return (
          <Collaborators
            collaborators={collaborators}
            onAddCollaborator={handleAddCollaborator}
            onDeleteCollaborator={handleDeleteCollaborator}
            isAuthenticated={!!session}
            canInvite={canInvite}
          />
        )
      }
      case 'dayofcontacts':
        return (
          <DayOfContacts
            collaborators={collaborators}
            vendors={vendors}
          />
        )
      default:
        return null
    }
  }

  // ── Public RSVP page (no auth required) ─────────────────────────────────────
  if (rsvpSlug) return <RSVPPage slug={rsvpSlug} />

  // ── Initial auth check spinner ───────────────────────────────────────────────
  if (authLoading) {
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

  // ── Landing page ─────────────────────────────────────────────────────────────
  if (!showApp) {
    return (
      <>
        <LandingPage
          onStart={() => setShowApp(true)}
          onSignIn={() => setAuthOpen(true)}
        />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  // ── Onboarding — new user hasn't completed setup yet ─────────────────────────
  if (session && wedding && !wedding.setup_complete) {
    return <WeddingSetup onComplete={handleWeddingSetup} />
  }

  // ── App shell ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        session={session}
        wedding={wedding}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
      />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Guest mode banner — only shown when not signed in */}
      {!session && (
        <div style={{
          background: 'rgba(184,151,90,0.1)',
          borderBottom: '1px solid var(--border)',
          padding: '9px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--deep)',
          gap: 12,
        }}>
          <span>
            ⚠&nbsp; You&apos;re in <strong>guest mode</strong> — sign in to save your work across sessions.
          </span>
          <button
            className="btn btn-primary"
            style={{ fontSize: 10, padding: '6px 18px', flexShrink: 0 }}
            onClick={() => setAuthOpen(true)}
          >
            SIGN IN
          </button>
        </div>
      )}

      <main className="main">
        {renderTab()}
      </main>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
