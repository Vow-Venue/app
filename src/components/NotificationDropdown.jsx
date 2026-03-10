import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function NotificationDropdown({
  notifications = [],
  activeWeddingId,
  onMarkRead,
  onMarkAllRead,
  onSelectWedding,
  onTabChange,
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const visible = activeWeddingId
    ? notifications.filter(n => n.wedding_id === activeWeddingId)
    : notifications

  const unreadCount = visible.filter(n => !n.read).length
  const displayed = visible.slice(0, 20)

  const handleNotifClick = (notif) => {
    onMarkRead(notif.id)
    setOpen(false)
    if (notif.wedding_id && notif.link_tab) {
      if (!activeWeddingId || activeWeddingId !== notif.wedding_id) {
        onSelectWedding(notif.wedding_id)
        setTimeout(() => onTabChange(notif.link_tab), 100)
      } else {
        onTabChange(notif.link_tab)
      }
    } else if (notif.link_tab && activeWeddingId) {
      onTabChange(notif.link_tab)
    }
  }

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen(prev => !prev)}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={() => onMarkAllRead(activeWeddingId)}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {displayed.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              displayed.map(notif => (
                <button
                  key={notif.id}
                  className={`notif-item${notif.read ? '' : ' notif-item-unread'}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  {!notif.read && <span className="notif-dot" />}
                  <div className="notif-content">
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">{timeAgo(notif.created_at)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
