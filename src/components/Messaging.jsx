import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

const AVATAR_COLORS = [
  '#c9847a', '#b8975a', '#7a9cb8', '#7ab88a', '#9a7ab8', '#b87a9a',
]

const avatarColor = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const initials = (name) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

const fmtTime = (ts) => {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const dmConvId = (a, b) => {
  const sorted = [a, b].sort()
  return `dm:${sorted[0]}:${sorted[1]}`
}

export default function Messaging({
  channels, channelMembers, messages, collaborators, me,
  tasks, onAddMessage, onAddChannel, onAddChannelMembers, onRemoveChannelMember, onNavigate,
  canCreateChannel = true,
}) {
  const [activeConvId, setActiveConvId]     = useState(null)
  const [activeConvType, setActiveConvType] = useState(null)
  const [inputText, setInputText]           = useState('')

  // Channel creation modal
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [newChannelName, setNewChannelName]       = useState('')
  const [selectedMembers, setSelectedMembers]     = useState([])

  // Member management panel
  const [showMembers, setShowMembers] = useState(false)

  // DM creation
  const [showNewDm, setShowNewDm]         = useState(false)
  const [dmSearchQuery, setDmSearchQuery] = useState('')

  // Sidebar search
  const [sidebarSearch, setSidebarSearch] = useState('')

  const messagesEndRef = useRef(null)

  // All participants for name lookup
  const allPeople = [me, ...collaborators]

  // Channels the current user is a member of
  const myChannels = channels.filter(ch =>
    ch.type !== 'dm' &&
    channelMembers.some(m => m.channelId === ch.id && m.userId === me.id)
  )

  // DM conversations
  const userDmConvIds = [...new Set(
    messages
      .filter(m => m.channelId.startsWith('dm:') && m.channelId.includes(me.id))
      .map(m => m.channelId)
  )]

  const sortedDmConvIds = [...userDmConvIds].sort((a, b) => {
    const lastA = messages.filter(m => m.channelId === a).at(-1)?.timestamp || ''
    const lastB = messages.filter(m => m.channelId === b).at(-1)?.timestamp || ''
    return lastB.localeCompare(lastA)
  })

  const getDmPartner = (convId) => {
    const parts = convId.replace('dm:', '').split(':')
    const partnerId = parts.find(p => p !== me.id)
    return collaborators.find(c => c.id === partnerId || c.user_id === partnerId)
  }

  // Sidebar search filtering
  const filteredChannels = sidebarSearch
    ? myChannels.filter(ch => ch.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : myChannels

  const filteredDmConvIds = sidebarSearch
    ? sortedDmConvIds.filter(convId => {
        const partner = getDmPartner(convId)
        return partner?.name.toLowerCase().includes(sidebarSearch.toLowerCase())
      })
    : sortedDmConvIds

  // Active channel members
  const activeChannelMembers = activeConvType === 'channel'
    ? channelMembers
        .filter(m => m.channelId === activeConvId)
        .map(m => allPeople.find(p => p.id === m.userId || p.user_id === m.userId))
        .filter(Boolean)
    : []

  // People not yet in active channel
  const availableForChannel = collaborators.filter(c => {
    const uid = c.user_id || c.id
    return !channelMembers.some(m => m.channelId === activeConvId && m.userId === uid)
  })

  // Messages for active conversation
  const convMessages = messages.filter(m => m.channelId === activeConvId)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length, activeConvId])

  // Auto-select #general on mount
  useEffect(() => {
    if (!activeConvId && myChannels.length > 0) {
      const general = myChannels.find(ch => ch.name === 'general')
      setActiveConvId(general?.id || myChannels[0].id)
      setActiveConvType('channel')
    }
  }, [myChannels.length])

  const sendMessage = () => {
    const text = inputText.trim()
    if (!text || !activeConvId) return
    onAddMessage({
      channelId: activeConvId,
      senderId: me.id,
      senderName: me.name,
      text,
      timestamp: new Date().toISOString(),
    })
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Channel creation
  const handleCreateChannel = (e) => {
    e.preventDefault()
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    onAddChannel({ name, type: 'channel', members: selectedMembers })
    setNewChannelName('')
    setSelectedMembers([])
    setShowCreateChannel(false)
  }

  const toggleMember = (uid) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  // Start DM
  const startDm = (person) => {
    const convId = dmConvId(me.id, person.user_id || person.id)
    setActiveConvId(convId)
    setActiveConvType('dm')
    setShowNewDm(false)
    setDmSearchQuery('')
  }

  // Unread count (simple approximation)
  const unreadCount = (convId) =>
    messages.filter(m => m.channelId === convId && m.senderId !== me.id && m.senderId !== 'system').length

  // Active conversation display name
  const convName = () => {
    if (activeConvType === 'channel') {
      const ch = channels.find(c => c.id === activeConvId)
      return ch ? `# ${ch.name}` : ''
    }
    if (activeConvType === 'dm') {
      const partner = getDmPartner(activeConvId)
      return partner ? partner.name : 'Direct Message'
    }
    return ''
  }

  // Task progress
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const taskPct        = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  const upcomingTasks  = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 2)

  return (
    <div>
      <div className="section-title">Messages</div>
      <div className="section-subtitle">TEAM COMMUNICATION</div>

      <div className={`chat-layout ${showMembers && activeConvType === 'channel' ? 'with-members-panel' : ''}`}>
        {/* ── Sidebar ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="chat-workspace-name">Vow &amp; Venue</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
              Signed in as <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{me.name}</strong>
            </div>
          </div>

          {/* Search */}
          <div className="sidebar-search">
            <input
              className="sidebar-search-input"
              placeholder="Search channels & people..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
          </div>

          <div className="chat-sidebar-section">
            {/* Channels */}
            <div className="sidebar-group-label">CHANNELS</div>
            {filteredChannels.map(ch => (
              <button
                key={ch.id}
                className={`sidebar-item ${activeConvType === 'channel' && activeConvId === ch.id ? 'active' : ''}`}
                onClick={() => { setActiveConvId(ch.id); setActiveConvType('channel'); setShowMembers(false) }}
              >
                <span style={{ opacity: 0.5 }}>#</span>
                <span>{ch.name}</span>
                {unreadCount(ch.id) > 0 && activeConvId !== ch.id && (
                  <span className="sidebar-unread">{unreadCount(ch.id)}</span>
                )}
              </button>
            ))}

            {canCreateChannel && (
              <button className="sidebar-add-btn" onClick={() => setShowCreateChannel(true)}>
                + Create channel
              </button>
            )}

            {/* Direct Messages */}
            <div className="sidebar-group-label" style={{ marginTop: 16 }}>DIRECT MESSAGES</div>

            {filteredDmConvIds.map(convId => {
              const partner = getDmPartner(convId)
              if (!partner) return null
              return (
                <button
                  key={convId}
                  className={`sidebar-item ${activeConvType === 'dm' && activeConvId === convId ? 'active' : ''}`}
                  onClick={() => { setActiveConvId(convId); setActiveConvType('dm'); setShowMembers(false) }}
                >
                  <div className="sidebar-dm-avatar" style={{ background: avatarColor(partner.name) }}>
                    {initials(partner.name)}
                  </div>
                  <span>{partner.name}</span>
                </button>
              )
            })}

            {/* New DM picker */}
            {showNewDm ? (
              <div className="dm-people-picker">
                <input
                  className="dm-search-input"
                  placeholder="Search by name or role..."
                  value={dmSearchQuery}
                  onChange={e => setDmSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="dm-people-list">
                  {collaborators
                    .filter(c => {
                      const q = dmSearchQuery.toLowerCase()
                      return c.name.toLowerCase().includes(q)
                        || (c.role || '').toLowerCase().includes(q)
                    })
                    .map(c => (
                      <button key={c.id} className="dm-person-item" onClick={() => startDm(c)}>
                        <div className="dm-person-avatar" style={{ background: avatarColor(c.name) }}>
                          {initials(c.name)}
                        </div>
                        <div className="dm-person-info">
                          <span className="dm-person-name">{c.name}</span>
                          {c.role && <span className="dm-person-role">{c.role}</span>}
                        </div>
                      </button>
                    ))
                  }
                  {collaborators.length === 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', padding: '8px 0', textAlign: 'center' }}>
                      Add collaborators first to start messaging.
                    </div>
                  )}
                </div>
                <button className="dm-picker-close" onClick={() => { setShowNewDm(false); setDmSearchQuery('') }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="sidebar-add-btn" onClick={() => setShowNewDm(true)}>
                + New message
              </button>
            )}
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="chat-main">
          <div className="chat-main-header">
            <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
              {activeConvType === 'channel' ? '#' : activeConvType === 'dm' ? '' : ''}
            </div>
            <div className="chat-main-title">{convName()}</div>
            {activeConvType === 'channel' && (
              <button
                className="channel-members-btn"
                onClick={() => setShowMembers(!showMembers)}
              >
                <span style={{ fontSize: 14 }}>&#x1f464;</span>
                <span>{activeChannelMembers.length}</span>
              </button>
            )}
          </div>

          <div className="chat-messages">
            {!activeConvId && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40, fontStyle: 'italic' }}>
                Select a channel or start a direct message.
              </div>
            )}
            {convMessages.length === 0 && activeConvId && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40, fontStyle: 'italic' }}>
                No messages yet. Say hello!
              </div>
            )}
            {convMessages.map((msg, i) => {
              const isSystem = msg.senderId === 'system'

              if (isSystem) {
                return (
                  <div key={msg.id} className="msg-system">
                    <span className="msg-system-text">{msg.text}</span>
                    <span className="msg-system-time">{fmtTime(msg.timestamp)}</span>
                  </div>
                )
              }

              const sender     = allPeople.find(p => p.id === msg.senderId)
              const senderName = msg.senderName ?? sender?.name ?? 'Unknown'
              const isSelf     = msg.senderId === me.id
              const prevMsg    = i > 0 ? convMessages[i - 1] : null
              const showMeta   = !prevMsg || prevMsg.senderId !== msg.senderId

              return (
                <div key={msg.id} className={`msg-group ${isSelf ? 'self' : 'other'}`}>
                  {showMeta && (
                    <div className="msg-meta">
                      <div className="msg-avatar" style={{ background: avatarColor(senderName) }}>
                        {initials(senderName)}
                      </div>
                      <span className="msg-sender-name">{isSelf ? 'You' : senderName}</span>
                      <span className="msg-time">{fmtTime(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className={`msg-bubble ${isSelf ? 'self' : 'other'}`}>
                    {msg.text}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              className="chat-input"
              placeholder={activeConvId ? `Message as ${me.name}...` : 'Select a conversation'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConvId}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!activeConvId || !inputText.trim()}
            >
              SEND
            </button>
          </div>

          {/* Task Progress Widget */}
          <div className="task-progress-widget">
            <div className="task-progress-widget-title">TASK PROGRESS</div>
            <div className="progress-wrap" style={{ marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${taskPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="progress-label">
                {totalTasks === 0 ? 'No tasks yet' : `${completedTasks} of ${totalTasks} done (${taskPct}%)`}
              </div>
              <button className="task-progress-link" onClick={() => onNavigate('tasks')}>
                VIEW ALL →
              </button>
            </div>
            {upcomingTasks.length > 0 && (
              <div className="task-progress-upcoming">
                {upcomingTasks.map(t => (
                  <div key={t.id} className="task-progress-item">
                    <div className="task-progress-dot" />
                    <span>{t.title}</span>
                    {t.dueDate && (
                      <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
                        {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Members Panel ── */}
        {showMembers && activeConvType === 'channel' && (
          <div className="channel-members-panel">
            <div className="channel-members-panel-header">
              <span>Members ({activeChannelMembers.length})</span>
              <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}>×</button>
            </div>

            <div className="channel-members-list">
              {activeChannelMembers.map(p => (
                <div key={p.id} className="channel-member-item">
                  <div className="msg-avatar" style={{ background: avatarColor(p.name), width: 24, height: 24, fontSize: 9 }}>
                    {initials(p.name)}
                  </div>
                  <span>{p.id === me.id ? `${p.name} (you)` : p.name}</span>
                  {p.id !== me.id && (
                    <button
                      className="channel-member-remove"
                      onClick={() => onRemoveChannelMember(activeConvId, p.user_id || p.id)}
                      title="Remove from channel"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {availableForChannel.length > 0 && (
              <div className="channel-add-member-section">
                <div className="channel-add-member-label">Add members</div>
                <div className="channel-add-members-list">
                  {availableForChannel.map(c => (
                    <button
                      key={c.id}
                      className="channel-add-member-item"
                      onClick={() => onAddChannelMembers(activeConvId, [c.user_id || c.id])}
                    >
                      <div className="msg-avatar" style={{ background: avatarColor(c.name), width: 22, height: 22, fontSize: 8 }}>
                        {initials(c.name)}
                      </div>
                      <span>{c.name}</span>
                      <span className="channel-add-member-plus">+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Channel Creation Modal ── */}
      <Modal isOpen={showCreateChannel} onClose={() => { setShowCreateChannel(false); setNewChannelName(''); setSelectedMembers([]) }} title="Create Channel">
        <form onSubmit={handleCreateChannel}>
          <div className="form-group">
            <label>CHANNEL NAME</label>
            <input
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              placeholder="e.g. ceremony-planning"
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>ADD MEMBERS</label>
            {collaborators.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No collaborators yet. You can add members later.
              </div>
            ) : (
              <div className="member-picker">
                {collaborators.map(c => {
                  const uid = c.user_id || c.id
                  return (
                    <label key={c.id} className="member-pick-item">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(uid)}
                        onChange={() => toggleMember(uid)}
                        style={{ width: 14, height: 14, accentColor: 'var(--gold)' }}
                      />
                      <div className="member-pick-avatar" style={{ background: avatarColor(c.name) }}>
                        {initials(c.name)}
                      </div>
                      <span>{c.name}</span>
                      {c.role && <span className="member-pick-role">{c.role}</span>}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setShowCreateChannel(false); setNewChannelName(''); setSelectedMembers([]) }}>CANCEL</button>
            <button type="submit" className="btn btn-primary" disabled={!newChannelName.trim()}>CREATE CHANNEL</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
