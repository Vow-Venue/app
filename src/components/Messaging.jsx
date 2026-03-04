import { useState, useEffect, useRef } from 'react'

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
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const dmConvId = (a, b) => {
  const sorted = [a, b].sort()
  return `dm:${sorted[0]}:${sorted[1]}`
}

export default function Messaging({
  channels, messages, collaborators, currentUserId, tasks,
  onAddMessage, onAddChannel, onSetCurrentUser, onNavigate,
}) {
  const [activeConvId, setActiveConvId]   = useState(channels[0]?.id ?? null)
  const [activeConvType, setActiveConvType] = useState('channel')
  const [inputText, setInputText]         = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [addingChannel, setAddingChannel] = useState(false)
  const [newDmTarget, setNewDmTarget]     = useState('')
  const [addingDm, setAddingDm]           = useState(false)
  const messagesEndRef                    = useRef(null)

  const currentUser = collaborators.find(c => c.id === currentUserId) || collaborators[0]

  // Active conversation messages
  const convMessages = messages.filter(m => {
    if (activeConvType === 'channel') return m.channelId === activeConvId
    return m.channelId === activeConvId
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length, activeConvId])

  const sendMessage = () => {
    const text = inputText.trim()
    if (!text || !activeConvId || !currentUser) return
    onAddMessage({
      channelId: activeConvId,
      senderId: currentUser.id,
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

  const handleAddChannel = () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    const newCh = { name }
    onAddChannel(newCh)
    setNewChannelName('')
    setAddingChannel(false)
  }

  const handleStartDm = () => {
    if (!newDmTarget) return
    const convId = dmConvId(currentUser.id, newDmTarget)
    setActiveConvId(convId)
    setActiveConvType('dm')
    setNewDmTarget('')
    setAddingDm(false)
  }

  // Build DM conversations this user is part of
  const userDmConvIds = [...new Set(
    messages
      .filter(m => m.channelId.startsWith('dm:') && m.channelId.includes(currentUser?.id ?? ''))
      .map(m => m.channelId)
  )]

  const getDmPartner = (convId) => {
    const parts = convId.replace('dm:', '').split(':')
    const partnerId = parts.find(p => p !== currentUser?.id)
    return collaborators.find(c => c.id === partnerId)
  }

  // Active conv display name
  const convName = () => {
    if (activeConvType === 'channel') {
      const ch = channels.find(c => c.id === activeConvId)
      return ch ? `# ${ch.name}` : ''
    }
    const partner = getDmPartner(activeConvId)
    return partner ? partner.name : 'Direct Message'
  }

  // Task progress
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const taskPct        = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  const upcomingTasks  = tasks
    .filter(t => !t.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 2)

  // Unread counts (messages since last visit — we approximate with total per channel)
  const unreadCount = (convId) => {
    // Simple: count messages in channel that aren't from current user
    return messages.filter(m => m.channelId === convId && m.senderId !== currentUser?.id).length
  }

  return (
    <div>
      <div className="section-title">Messages</div>
      <div className="section-subtitle">TEAM COMMUNICATION</div>

      <div className="chat-layout">
        {/* ── Sidebar ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="chat-workspace-name">Vow &amp; Venue</div>
            {collaborators.length > 0 ? (
              <select
                className="chat-user-switch"
                value={currentUser?.id ?? ''}
                onChange={e => onSetCurrentUser(e.target.value)}
              >
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
                Add collaborators to chat
              </div>
            )}
          </div>

          <div className="chat-sidebar-section">
            {/* Channels */}
            <div className="sidebar-group-label">CHANNELS</div>
            {channels.map(ch => (
              <button
                key={ch.id}
                className={`sidebar-item ${activeConvType === 'channel' && activeConvId === ch.id ? 'active' : ''}`}
                onClick={() => { setActiveConvId(ch.id); setActiveConvType('channel') }}
              >
                <span style={{ opacity: 0.5 }}>#</span>
                <span>{ch.name}</span>
                {unreadCount(ch.id) > 0 && activeConvId !== ch.id && (
                  <span className="sidebar-unread">{unreadCount(ch.id)}</span>
                )}
              </button>
            ))}

            {addingChannel ? (
              <div style={{ padding: '4px 10px' }}>
                <input
                  className="sidebar-new-input"
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChannel(); if (e.key === 'Escape') setAddingChannel(false) }}
                  autoFocus
                />
              </div>
            ) : (
              <button className="sidebar-add-btn" onClick={() => setAddingChannel(true)}>
                + Add a channel
              </button>
            )}

            {/* Direct Messages */}
            <div className="sidebar-group-label" style={{ marginTop: 16 }}>DIRECT MESSAGES</div>
            {userDmConvIds.map(convId => {
              const partner = getDmPartner(convId)
              if (!partner) return null
              return (
                <button
                  key={convId}
                  className={`sidebar-item ${activeConvType === 'dm' && activeConvId === convId ? 'active' : ''}`}
                  onClick={() => { setActiveConvId(convId); setActiveConvType('dm') }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: avatarColor(partner.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'white', fontWeight: 600, flexShrink: 0,
                  }}>
                    {initials(partner.name)}
                  </div>
                  <span>{partner.name}</span>
                </button>
              )
            })}

            {addingDm ? (
              <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <select
                  className="chat-user-switch"
                  value={newDmTarget}
                  onChange={e => setNewDmTarget(e.target.value)}
                >
                  <option value="">Select person...</option>
                  {collaborators
                    .filter(c => c.id !== currentUser?.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <button
                  onClick={handleStartDm}
                  style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    color: 'rgba(255,255,255,0.7)', borderRadius: 6,
                    padding: '5px', cursor: 'pointer', fontSize: 12,
                    fontFamily: 'Jost, sans-serif',
                  }}
                >
                  Start DM
                </button>
              </div>
            ) : (
              <button className="sidebar-add-btn" onClick={() => setAddingDm(true)}>
                + New direct message
              </button>
            )}
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="chat-main">
          {/* Header */}
          <div className="chat-main-header">
            <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
              {activeConvType === 'channel' ? '#' : '⊕'}
            </div>
            <div className="chat-main-title">{convName()}</div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {!activeConvId && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40, fontStyle: 'italic' }}>
                Select a channel or DM to start chatting.
              </div>
            )}

            {convMessages.length === 0 && activeConvId && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40, fontStyle: 'italic' }}>
                No messages yet. Say hello!
              </div>
            )}

            {convMessages.map((msg, i) => {
              const sender     = collaborators.find(c => c.id === msg.senderId)
              const senderName = msg.senderName ?? sender?.name ?? 'Unknown'
              const isSelf     = msg.senderId === currentUserId
              // Group consecutive messages from same sender
              const prevMsg    = i > 0 ? convMessages[i - 1] : null
              const showMeta   = !prevMsg || prevMsg.senderId !== msg.senderId

              return (
                <div key={msg.id} className={`msg-group ${isSelf ? 'self' : 'other'}`}>
                  {showMeta && (
                    <div className="msg-meta">
                      <div
                        className="msg-avatar"
                        style={{ background: sender ? avatarColor(senderName) : 'var(--muted)' }}
                      >
                        {initials(senderName)}
                      </div>
                      <span className="msg-sender-name">{senderName}</span>
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

          {/* Input */}
          <div className="chat-input-area">
            <textarea
              className="chat-input"
              placeholder={currentUser ? `Message as ${currentUser.name}...` : 'Add a collaborator to message'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!currentUser || !activeConvId}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!currentUser || !activeConvId || !inputText.trim()}
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
      </div>
    </div>
  )
}
