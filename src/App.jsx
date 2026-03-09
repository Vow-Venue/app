import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import usePermissions from './hooks/usePermissions'
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
import Notes from './components/Notes'
import AuthModal from './components/AuthModal'
import WeddingSetup from './components/WeddingSetup'
import RSVPPage from './components/RSVPPage'
import MyWeddings from './components/MyWeddings'
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

  // ── Multi-wedding
  const [myWeddings, setMyWeddings]             = useState([])
  const [activeWeddingId, setActiveWeddingId]   = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [showProBanner, setShowProBanner]       = useState(false)

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
        setWeddingId(null)
        setWedding(null)
        if (!window.location.pathname.startsWith('/admin-')) navigate('/', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Load weddings when session arrives ───────────────────────────────────────
  useEffect(() => {
    if (!session) return
    loadMyWeddings(session.user.id)
  }, [session?.user?.id])

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
        const { data: invite } = await supabase
          .from('invite_tokens')
          .select('*')
          .eq('token', pendingInviteToken)
          .eq('used', false)
          .maybeSingle()

        if (invite) {
          const expiresAt = new Date(new Date(invite.created_at).getTime() + 48 * 60 * 60 * 1000)
          if (new Date() > expiresAt) {
            console.warn('Invite token has expired')
            window.history.replaceState({}, '', window.location.pathname)
          } else {
            await supabase.from('invite_tokens').update({ used: true }).eq('id', invite.id)
            await supabase.from('collaborators')
              .upsert({ wedding_id: invite.wedding_id, user_id: userId, name: invite.name, email: invite.email, role: invite.role, access: invite.access }, { onConflict: 'wedding_id,email' })
            // Also create wedding_members row for access control (safe — ignores if table missing)
            try {
              await supabase.from('wedding_members')
                .upsert({ wedding_id: invite.wedding_id, user_id: userId, role: mapMemberRole(invite.role) }, { onConflict: 'wedding_id,user_id' })
            } catch { /* table may not exist yet */ }
            window.history.replaceState({}, '', window.location.pathname)
          }
        }
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

      setMyWeddings(weddings)

      // ── Step 4: Auto-routing ────────────────────────────────────────────────
      if (weddings.length === 1) {
        setActiveWeddingId(weddings[0].id)
        await loadWeddingData(weddings[0].id, userId)
      }
      // else: multiple weddings — show dashboard (activeWeddingId stays null)

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

      const [gRes, tRes, tkRes, vRes, chRes, invRes, collRes, notesRes] = await Promise.all([
        supabase.from('guests').select('*').eq('wedding_id', wId),
        supabase.from('seating_tables').select('*').eq('wedding_id', wId),
        supabase.from('tasks').select('*').eq('wedding_id', wId).order('created_at'),
        supabase.from('vendors').select('*').eq('wedding_id', wId),
        supabase.from('channels').select('*').eq('wedding_id', wId),
        supabase.from('invoices').select('*').eq('wedding_id', wId),
        supabase.from('collaborators').select('*').eq('wedding_id', wId),
        supabase.from('notes').select('*').eq('wedding_id', wId).order('updated_at', { ascending: false }),
      ])

      setGuests((gRes.data ?? []).map(mapGuest))
      setTables(tRes.data ?? [])
      setTasks((tkRes.data ?? []).map(mapTask))
      setVendors(vRes.data ?? [])
      setInvoices((invRes.data ?? []).map(mapInvoice))
      setCollaborators(collRes.data ?? [])
      setNotes((notesRes.data ?? []).map(mapNote))

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

  // ── Back to My Weddings dashboard ───────────────────────────────────────────
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
    setActiveTab('overview')
  }

  // ── Create a new wedding ────────────────────────────────────────────────────
  const handleCreateWedding = async () => {
    if (!session) return
    const userId = session.user.id
    const ownedCount = myWeddings.filter(w => w.myRole === 'owner').length
    const isPro = myWeddings.some(w => w.myRole === 'owner' && w.plan === 'pro')
    if (!isPro && ownedCount >= 2) return

    const { data: created } = await supabase
      .from('weddings').insert({ user_id: userId }).select('*').single()
    if (!created) return

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
    const ext = file.name.split('.').pop()
    const path = `${wId}/cover.${ext}`

    // Upload to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from('wedding-covers')
      .upload(path, file, { upsert: true })
    if (upErr) { console.error('Cover upload failed:', upErr.message); return }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wedding-covers')
      .getPublicUrl(path)

    // Bust cache with timestamp
    const url = `${publicUrl}?t=${Date.now()}`

    // Update wedding record
    await supabase.from('weddings').update({ cover_url: url }).eq('id', wId)
    setMyWeddings(prev => prev.map(w => w.id === wId ? { ...w, cover_url: url } : w))
    if (wedding?.id === wId) setWedding(prev => ({ ...prev, cover_url: url }))
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
      const { data } = await supabase.from('vendors').insert({
        wedding_id: weddingId,
        name: vendor.name, role: vendor.role, phone: vendor.phone || null,
        email: vendor.email || null, notes: vendor.notes || null,
        amount: Number(vendor.amount) || 0, due_date: vendor.dueDate || null, paid: !!vendor.paid,
      }).select().single()
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
    if (!session || !weddingId) { setAuthOpen(true); return }
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
          weddingId,
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
      h.add('tasks')
      h.add('notes')
      h.add('dayofcontacts')
    }
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
            onAddTable={handleAddTable}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
            onImportGuests={handleImportGuests}
            canEdit={permissions.canEditGuests}
          />
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
            collaborators={collaborators}
            vendors={vendors}
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

    // My Weddings dashboard (no wedding selected)
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
            onSignIn={() => setAuthOpen(true)}
            onSignOut={handleSignOut}
          />
          <main className="main">
            <MyWeddings
              weddings={myWeddings}
              userPlan={userPlan}
              onSelectWedding={selectWedding}
              onCreateWedding={handleCreateWedding}
              onUpgrade={handleUpgrade}
              onUploadCover={handleUploadCover}
            />
          </main>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
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
        />
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
