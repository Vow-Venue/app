import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────
const GRID_SIZE    = 20
const MIN_ZOOM     = 0.3
const MAX_ZOOM     = 2.5
const DEFAULT_ZOOM = 0.75
const SEAT_R       = 11

const TABLE_SIZES = {
  round:      { w: 120, h: 120 },
  rect:       { w: 220, h: 80  },
  sweetheart: { w: 100, h: 60  },
}

const ELEMENT_DEFAULTS = {
  dance_floor: { width: 300, height: 300, label: 'Dance Floor' },
  stage:       { width: 400, height: 150, label: 'Stage' },
  bar:         { width: 200, height: 80,  label: 'Bar' },
  photo_booth: { width: 120, height: 120, label: 'Photo Booth' },
}

const ROOM_W = 2400
const ROOM_H = 1600

const ELEMENT_STYLES = {
  dance_floor: { bg: 'rgba(200,180,160,0.18)', border: '2px dashed rgba(200,180,160,0.5)', icon: '💃' },
  stage:       { bg: 'rgba(184,151,90,0.14)',   border: '2px dashed rgba(184,151,90,0.4)',  icon: '🎤' },
  bar:         { bg: 'rgba(139,115,85,0.14)',    border: '2px dashed rgba(139,115,85,0.4)',  icon: '🍸' },
  photo_booth: { bg: 'rgba(201,132,122,0.14)',   border: '2px dashed rgba(201,132,122,0.4)', icon: '📷' },
}

const RSVP_COLORS = { yes: '#4caf50', pending: '#ff9800', no: '#ef5350' }

// ── Seat position computation (stable — only depends on shape + capacity) ───
function getSeatPositions(shape, capacity) {
  const s = TABLE_SIZES[shape] || TABLE_SIZES.round
  if (shape === 'sweetheart') {
    return [
      { x: s.w * 0.28, y: s.h + 10, isHead: true },
      { x: s.w * 0.72, y: s.h + 10, isHead: true },
    ]
  }
  if (shape === 'round') {
    const cx = s.w / 2, cy = s.h / 2
    const r = s.w / 2 + 14
    return Array.from({ length: capacity }, (_, i) => {
      const a = (2 * Math.PI * i / capacity) - Math.PI / 2
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), isHead: false }
    })
  }
  // rect
  const pad = 14
  const innerL = pad, innerR = s.w - pad
  const sideN = Math.max(0, capacity - 2)
  const topN = Math.ceil(sideN / 2)
  const botN = Math.floor(sideN / 2)
  const positions = []
  positions.push({ x: -16, y: s.h / 2, isHead: true })
  for (let i = 0; i < topN; i++)
    positions.push({ x: innerL + (innerR - innerL) * (i + 1) / (topN + 1), y: -16 })
  for (let i = 0; i < botN; i++)
    positions.push({ x: innerL + (innerR - innerL) * (i + 1) / (botN + 1), y: s.h + 16 })
  positions.push({ x: s.w + 16, y: s.h / 2, isHead: true })
  return positions
}

const snap = v => Math.round(v / GRID_SIZE) * GRID_SIZE

// ── Memoized Seat Component ─────────────────────────────────────────────────
const SeatCircle = memo(function SeatCircle({ sp, seatNum, guest, padX, padY, onSelect }) {
  const isOccupied = !!guest
  const rsvpColor = guest ? (RSVP_COLORS[guest.rsvp] || RSVP_COLORS.pending) : null
  return (
    <div
      className="fp-seat"
      style={{
        position: 'absolute',
        left: padX + sp.x - SEAT_R,
        top: padY + sp.y - SEAT_R,
        width: SEAT_R * 2, height: SEAT_R * 2,
        background: isOccupied ? (rsvpColor || '#C9A96E') : 'rgba(255,255,255,0.95)',
        border: `2px solid ${isOccupied ? 'transparent' : (sp.isHead ? 'var(--deep)' : '#C9A96E')}`,
        color: isOccupied ? '#fff' : (sp.isHead ? 'var(--deep)' : '#C9A96E'),
        boxShadow: isOccupied ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
      }}
      title={guest ? `${guest.name} (${guest.rsvp})` : `Seat ${seatNum + 1}${sp.isHead ? ' (Head)' : ''} — Empty`}
      onClick={onSelect}
    >
      {isOccupied ? guest.name.charAt(0).toUpperCase() : (sp.isHead ? '★' : '')}
    </div>
  )
})

// ── Memoized Table Shape ────────────────────────────────────────────────────
const TableShape = memo(function TableShape({ shape, s, isOver, isSel, cursorStyle, padX, padY }) {
  const bg = isOver ? 'rgba(184,151,90,0.3)' : isSel ? 'rgba(184,151,90,0.25)' : 'rgba(184,151,90,0.14)'
  const borderStyle = isSel ? '2.5px solid #C9A96E' : '2px dashed var(--gold)'
  const base = {
    position: 'absolute', left: padX, top: padY,
    width: s.w, height: s.h,
    background: bg, border: borderStyle,
    transition: 'background 0.15s, box-shadow 0.15s, border 0.15s',
    cursor: cursorStyle,
    boxShadow: isSel ? '0 0 0 3px rgba(201,169,110,0.25), 0 4px 16px rgba(201,169,110,0.2)' : 'none',
  }
  if (shape === 'round') return <div style={{ ...base, borderRadius: '50%' }} />
  if (shape === 'sweetheart') return <div style={{ ...base, borderRadius: '50px 50px 0 0' }} />
  return <div style={{ ...base, borderRadius: 8 }} />
})

// ── Memoized Table Component ────────────────────────────────────────────────
const LABEL_HEIGHT = 32

const TableNode = memo(function TableNode({
  table, seatedHere, isDragging, isOver, isSel,
  activeTool, onMouseDown, onDragOver, onDragLeave, onDrop, onSelectTable,
}) {
  const shape = table.shape ?? 'round'
  const s = TABLE_SIZES[shape] || TABLE_SIZES.round
  const capacity = shape === 'sweetheart' ? 2 : (table.capacity ?? 8)
  const seats = useMemo(() => getSeatPositions(shape, capacity), [shape, capacity])
  const isFull = seatedHere.length >= capacity
  const padX = 30, padY = 30 + LABEL_HEIGHT
  const cursorStyle = activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default'

  return (
    <div
      style={{
        position: 'absolute', left: table.x - 30, top: table.y - padY,
        width: s.w + 30 * 2, height: s.h + padY + 30 + 4,
        zIndex: isDragging ? 100 : 2,
        filter: isDragging ? 'drop-shadow(0 6px 20px rgba(61,44,44,0.2))' : 'none',
      }}
      onMouseDown={onMouseDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Table name ABOVE the shape */}
      <div className="fp-table-label" style={{
        position: 'absolute', left: 30, top: 0,
        width: s.w, textAlign: 'center',
      }}>
        {table.name}
      </div>
      <div className="fp-table-capacity" style={{
        position: 'absolute', left: 30, top: 16,
        width: s.w,
        color: isFull ? 'var(--rose)' : 'var(--muted)',
      }}>
        {seatedHere.length}/{capacity}{isFull ? ' FULL' : ''}
      </div>

      <TableShape shape={shape} s={s} isOver={isOver} isSel={isSel} cursorStyle={cursorStyle} padX={30} padY={padY} />

      {seats.map((sp, seatNum) => (
        <SeatCircle
          key={seatNum}
          sp={sp} seatNum={seatNum}
          guest={seatedHere.find(g => g.seatNumber === seatNum)}
          padX={30} padY={padY}
          onSelect={onSelectTable}
        />
      ))}

      <div className="fp-print-guests" style={{ display: 'none' }}>
        {seatedHere.map(g => g.name).join(', ')}
      </div>
    </div>
  )
})

// ── Memoized Room Element Component ─────────────────────────────────────────
const RoomElementNode = memo(function RoomElementNode({ elem, isSelected, activeTool, onMouseDown }) {
  const es = ELEMENT_STYLES[elem.type] || ELEMENT_STYLES.dance_floor
  return (
    <div
      className={`fp-element${isSelected ? ' selected' : ''}`}
      style={{
        position: 'absolute', left: elem.x, top: elem.y,
        width: elem.width, height: elem.height,
        background: es.bg, border: es.border, borderRadius: 8,
        cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
        zIndex: 0,
        outline: isSelected ? '2px solid var(--gold)' : 'none',
        outlineOffset: 2,
      }}
      onMouseDown={onMouseDown}
    >
      <span style={{ fontSize: 28, opacity: 0.6 }}>{es.icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
        {elem.label}
      </span>
    </div>
  )
})

// ── Guest Row (used in panel) ───────────────────────────────────────────────
const GuestRow = memo(function GuestRow({ guest, draggable, onDragStart, onUnseat, showSeat, canEdit }) {
  return (
    <div className="fp-guest-row" draggable={draggable} onDragStart={onDragStart}>
      <div className="fp-rsvp-dot" style={{ background: RSVP_COLORS[guest.rsvp] || RSVP_COLORS.pending }} />
      {draggable && <span style={{ fontSize: 9, color: 'var(--muted)' }}>⠿</span>}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--deep)' }}>
        {guest.name}
      </span>
      {showSeat && <span style={{ fontSize: 9, color: 'var(--muted)' }}>S{(guest.seatNumber ?? 0) + 1}</span>}
      {canEdit && onUnseat && (
        <button className="btn-danger" style={{ fontSize: 10, padding: '0 4px' }} onClick={onUnseat}>×</button>
      )}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────

export default function SeatingChart({
  guests, tables,
  onUpdateGuest, onUpdateTable, onAddTable, onDeleteTable,
  roomElements = [],
  onAddRoomElement, onUpdateRoomElement, onDeleteRoomElement,
  canEdit = true,
}) {
  // Canvas
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM)
  const [pan, setPan]             = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart                  = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // Tools
  const [activeTool, setActiveTool]       = useState('select')
  const [elementMenu, setElementMenu]     = useState(false)
  const [elementSubType, setElementSubType] = useState(null)

  // Selection
  const [selectedTable, setSelectedTable]     = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)

  // Drag
  const [dragging, setDragging]         = useState(null)
  const [dragOverTable, setDragOverTable] = useState(null)
  const dragRef = useRef(null)

  const wrapperRef = useRef(null)

  // ── Pre-compute guest-by-table map (avoids O(n*m) in render) ────────────
  const guestsByTable = useMemo(() => {
    const map = {}
    for (const g of guests) {
      if (g.tableId) {
        if (!map[g.tableId]) map[g.tableId] = []
        map[g.tableId].push(g)
      }
    }
    return map
  }, [guests])

  const unassigned = useMemo(() => guests.filter(g => !g.tableId), [guests])
  const totalSeated = useMemo(() => guests.length - unassigned.length, [guests.length, unassigned.length])

  const selTable = selectedTable ? tables.find(t => t.id === selectedTable) : null
  const selElement = selectedElement ? roomElements.find(e => e.id === selectedElement) : null
  const seatedAtSel = useMemo(
    () => selTable ? (guestsByTable[selTable.id] || []).slice().sort((a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99)) : [],
    [selTable, guestsByTable]
  )

  // ── Zoom via mouse wheel ──────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Coordinate conversion ─────────────────────────────────────────────────
  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = wrapperRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / zoom - pan.x,
      y: (clientY - rect.top) / zoom - pan.y,
    }
  }, [zoom, pan])

  // ── Canvas mouse handlers ─────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('fp-canvas')) return

    if (activeTool.startsWith('add_') && activeTool !== 'add_element') {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const shape = activeTool.replace('add_', '')
      const shapeCount = tables.filter(t => (t.shape ?? 'round') === shape).length
      const name = shape === 'sweetheart' ? 'Sweetheart Table'
        : shape === 'rect' ? (shapeCount === 0 ? 'Head Table' : `Long Table ${shapeCount + 1}`)
        : `Table ${shapeCount + 1}`
      const capacity = shape === 'sweetheart' ? 2 : shape === 'rect' ? 12 : 8
      onAddTable({ name, shape, capacity, x: snap(pos.x), y: snap(pos.y) })
      setActiveTool('select')
      return
    }

    if (activeTool === 'add_element' && elementSubType) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const defaults = ELEMENT_DEFAULTS[elementSubType]
      onAddRoomElement({ type: elementSubType, label: defaults.label, x: snap(pos.x), y: snap(pos.y), width: defaults.width, height: defaults.height })
      setActiveTool('select')
      setElementSubType(null)
      return
    }

    setSelectedTable(null)
    setSelectedElement(null)
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }, [activeTool, elementSubType, tables, pan, screenToCanvas, onAddTable, onAddRoomElement])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const dx = (e.clientX - panStart.current.x) / zoom
      const dy = (e.clientY - panStart.current.y) / zoom
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy })
      return
    }
    if (dragRef.current) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const d = dragRef.current
      const clampX = (v) => Math.max(0, Math.min(ROOM_W - 60, v))
      const clampY = (v) => Math.max(0, Math.min(ROOM_H - 60, v))
      if (d.type === 'table') {
        onUpdateTable(d.id, { x: clampX(pos.x - d.ox), y: clampY(pos.y - d.oy) })
      } else {
        onUpdateRoomElement(d.id, { x: clampX(pos.x - d.ox), y: clampY(pos.y - d.oy) })
      }
    }
  }, [isPanning, zoom, screenToCanvas, onUpdateTable, onUpdateRoomElement])

  const handleMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return }
    if (dragRef.current) {
      const d = dragRef.current
      const clampSnap = (v, max) => Math.max(0, Math.min(max, snap(v)))
      if (d.type === 'table') {
        const t = tables.find(t => t.id === d.id)
        if (t) onUpdateTable(d.id, { x: clampSnap(t.x, ROOM_W - 60), y: clampSnap(t.y, ROOM_H - 60) })
      } else {
        const el = roomElements.find(e => e.id === d.id)
        if (el) onUpdateRoomElement(d.id, { x: clampSnap(el.x, ROOM_W - 60), y: clampSnap(el.y, ROOM_H - 60) })
      }
      dragRef.current = null
      setDragging(null)
    }
  }, [isPanning, tables, roomElements, onUpdateTable, onUpdateRoomElement])

  // ── Table interactions ─────────────────────────────────────────────────────
  const handleTableMouseDown = useCallback((e, table) => {
    e.stopPropagation()
    if (activeTool === 'delete') {
      if (confirm(`Delete "${table.name}"? Guests will be unassigned.`)) onDeleteTable(table.id)
      return
    }
    setSelectedTable(table.id)
    setSelectedElement(null)
    if (canEdit && activeTool === 'select') {
      const pos = screenToCanvas(e.clientX, e.clientY)
      dragRef.current = { type: 'table', id: table.id, ox: pos.x - table.x, oy: pos.y - table.y }
      setDragging(table.id)
    }
  }, [activeTool, canEdit, screenToCanvas, onDeleteTable])

  // ── Element interactions ───────────────────────────────────────────────────
  const handleElementMouseDown = useCallback((e, elem) => {
    e.stopPropagation()
    if (activeTool === 'delete') {
      onDeleteRoomElement(elem.id)
      return
    }
    setSelectedElement(elem.id)
    setSelectedTable(null)
    if (canEdit && activeTool === 'select') {
      const pos = screenToCanvas(e.clientX, e.clientY)
      dragRef.current = { type: 'element', id: elem.id, ox: pos.x - elem.x, oy: pos.y - elem.y }
      setDragging(elem.id)
    }
  }, [activeTool, canEdit, screenToCanvas, onDeleteRoomElement])

  // ── Guest drag (sidebar → table) ──────────────────────────────────────────
  const handleGuestDragStart = useCallback((e, guestId) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleTableDrop = useCallback((e, table) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTable(null)
    const guestId = e.dataTransfer.getData('guestId')
    if (!guestId) return
    const capacity = table.capacity ?? 8
    const seated = guestsByTable[table.id] || []
    if (seated.length >= capacity) return
    const used = new Set(seated.map(g => g.seatNumber).filter(n => n != null))
    let seat = null
    for (let i = 0; i < capacity; i++) {
      if (!used.has(i)) { seat = i; break }
    }
    if (seat === null) return
    onUpdateGuest(guestId, { tableId: table.id, seatNumber: seat })
  }, [guestsByTable, onUpdateGuest])

  const handleDragOver = useCallback((e, tableId) => {
    e.preventDefault()
    setDragOverTable(tableId)
  }, [])

  const handleDragLeave = useCallback(() => setDragOverTable(null), [])

  // ── Tool cursor ───────────────────────────────────────────────────────────
  const cursorForCanvas = activeTool === 'select'
    ? (isPanning ? 'grabbing' : 'grab')
    : activeTool === 'delete' ? 'not-allowed'
    : 'crosshair'

  // ── Canvas background (memoized to avoid object churn) ────────────────────
  const canvasBg = useMemo(() => ({
    cursor: cursorForCanvas,
    backgroundImage: 'radial-gradient(circle, rgba(184,151,90,0.15) 1px, transparent 1px)',
    backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
    backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`,
  }), [cursorForCanvas, zoom, pan.x, pan.y])

  const canvasTransform = useMemo(
    () => ({ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }),
    [zoom, pan.x, pan.y]
  )

  return (
    <div className="fp-container">
      {/* ── Left Toolbar ───────────────────────────────────────────────────── */}
      <div className="fp-toolbar no-print">
        {canEdit && (
          <>
            <button className={`fp-tool-btn${activeTool === 'select' ? ' active' : ''}`}
              onClick={() => { setActiveTool('select'); setElementMenu(false) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
              <span className="fp-tooltip">Select</span>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_round' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_round'); setElementMenu(false) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
              <span className="fp-tooltip">Round Table</span>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_rect' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_rect'); setElementMenu(false) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="10" rx="2"/></svg>
              <span className="fp-tooltip">Rectangular Table</span>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_sweetheart' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_sweetheart'); setElementMenu(false) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14a8 8 0 0 1 16 0H4z"/></svg>
              <span className="fp-tooltip">Sweetheart Table</span>
            </button>

            <div style={{ position: 'relative' }}>
              <button className={`fp-tool-btn${activeTool === 'add_element' ? ' active' : ''}`}
                onClick={() => { setActiveTool('add_element'); setElementMenu(!elementMenu) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span className="fp-tooltip">Add Element</span>
              </button>
              {elementMenu && (
                <div className="fp-element-menu">
                  {Object.entries(ELEMENT_DEFAULTS).map(([type, def]) => (
                    <button key={type} className="fp-element-menu-item"
                      onClick={() => { setElementSubType(type); setElementMenu(false) }}>
                      <span>{ELEMENT_STYLES[type].icon}</span> {def.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className={`fp-tool-btn${activeTool === 'delete' ? ' active' : ''}`}
              onClick={() => { setActiveTool('delete'); setElementMenu(false) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span className="fp-tooltip">Delete</span>
            </button>
          </>
        )}

        <div className="fp-tool-divider" />

        <button className="fp-tool-btn" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.15))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          <span className="fp-tooltip">Zoom In</span>
        </button>
        <button className="fp-tool-btn" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.15))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          <span className="fp-tooltip">Zoom Out</span>
        </button>
        <button className="fp-tool-btn" onClick={() => { setZoom(DEFAULT_ZOOM); setPan({ x: 0, y: 0 }) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          <span className="fp-tooltip">Fit to Screen</span>
        </button>
        <div className="fp-zoom-display">{Math.round(zoom * 100)}%</div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div
        ref={wrapperRef}
        className="fp-canvas-wrapper"
        style={canvasBg}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="fp-canvas" style={canvasTransform}>
          {/* Room boundary */}
          <div className="fp-room-boundary" style={{ left: -10, top: -10, width: ROOM_W + 20, height: ROOM_H + 20 }} />

          {/* Room elements (behind tables) */}
          {roomElements.map(elem => (
            <RoomElementNode
              key={elem.id}
              elem={elem}
              isSelected={selectedElement === elem.id}
              activeTool={activeTool}
              onMouseDown={e => handleElementMouseDown(e, elem)}
            />
          ))}

          {/* Tables */}
          {tables.map(table => (
            <TableNode
              key={table.id}
              table={table}
              seatedHere={guestsByTable[table.id] || []}
              isDragging={dragging === table.id}
              isOver={dragOverTable === table.id}
              isSel={selectedTable === table.id}
              activeTool={activeTool}
              onMouseDown={e => handleTableMouseDown(e, table)}
              onDragOver={e => handleDragOver(e, table.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleTableDrop(e, table)}
              onSelectTable={e => { e.stopPropagation(); setSelectedTable(table.id); setSelectedElement(null) }}
            />
          ))}

          {/* Empty state */}
          {tables.length === 0 && roomElements.length === 0 && (
            <div style={{
              position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', color: 'var(--muted)', pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', opacity: 0.25, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed currentColor' }} />
                <div style={{ width: 80, height: 36, borderRadius: 8, border: '2px dashed currentColor', alignSelf: 'center' }} />
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.8 }}>
                Use the toolbar to add tables and elements<br />
                to start building your floor plan
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────── */}
      <div className="fp-panel no-print">
        {selTable ? (
          <>
            <div className="fp-panel-section">
              <div className="fp-panel-label">TABLE PROPERTIES</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>NAME</label>
                <input
                  type="text" value={selTable.name}
                  onChange={e => onUpdateTable(selTable.id, { name: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>SHAPE</label>
                  <select value={selTable.shape ?? 'round'}
                    onChange={e => onUpdateTable(selTable.id, { shape: e.target.value, capacity: e.target.value === 'sweetheart' ? 2 : selTable.capacity })}
                    style={{ fontSize: 12 }}>
                    <option value="round">Round</option>
                    <option value="rect">Rectangular</option>
                    <option value="sweetheart">Sweetheart</option>
                  </select>
                </div>
                {(selTable.shape ?? 'round') !== 'sweetheart' && (
                  <div className="form-group" style={{ width: 70, marginBottom: 10 }}>
                    <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>SEATS</label>
                    <input type="number" min={2} max={30} value={selTable.capacity ?? 8}
                      onChange={e => onUpdateTable(selTable.id, { capacity: Number(e.target.value) })}
                      style={{ fontSize: 12 }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: seatedAtSel.length >= (selTable.capacity ?? 8) ? 'var(--rose)' : 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                {seatedAtSel.length}/{selTable.shape === 'sweetheart' ? 2 : selTable.capacity ?? 8} SEATED
                {seatedAtSel.length >= (selTable.shape === 'sweetheart' ? 2 : selTable.capacity ?? 8) ? ' · FULL' : ''}
              </div>
            </div>

            <div className="fp-panel-section" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="fp-panel-label">GUESTS AT TABLE</div>
              {seatedAtSel.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No guests assigned yet. Drag guests here.
                </div>
              ) : seatedAtSel.map(g => (
                <GuestRow key={g.id} guest={g} showSeat canEdit={canEdit}
                  onUnseat={() => onUpdateGuest(g.id, { tableId: null, seatNumber: null })} />
              ))}

              <div className="fp-panel-label" style={{ marginTop: 16 }}>UNASSIGNED · {unassigned.length}</div>
              {unassigned.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>All guests seated!</div>
              ) : unassigned.map(g => (
                <GuestRow key={g.id} guest={g} draggable
                  onDragStart={e => handleGuestDragStart(e, g.id)} />
              ))}
            </div>

            {canEdit && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: 11, color: 'var(--rose)' }}
                  onClick={() => { if (confirm(`Delete "${selTable.name}"?`)) { onDeleteTable(selTable.id); setSelectedTable(null) } }}>
                  DELETE TABLE
                </button>
              </div>
            )}
          </>
        ) : selElement ? (
          <>
            <div className="fp-panel-section">
              <div className="fp-panel-label">ELEMENT PROPERTIES</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>LABEL</label>
                <input type="text" value={selElement.label}
                  onChange={e => onUpdateRoomElement(selElement.id, { label: e.target.value })}
                  style={{ fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>WIDTH</label>
                  <input type="number" min={40} max={800} value={selElement.width}
                    onChange={e => onUpdateRoomElement(selElement.id, { width: Number(e.target.value) })}
                    style={{ fontSize: 12 }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', fontWeight: 600 }}>HEIGHT</label>
                  <input type="number" min={40} max={800} value={selElement.height}
                    onChange={e => onUpdateRoomElement(selElement.id, { height: Number(e.target.value) })}
                    style={{ fontSize: 12 }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Type: {ELEMENT_DEFAULTS[selElement.type]?.label || selElement.type}
              </div>
            </div>
            {canEdit && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: 11, color: 'var(--rose)' }}
                  onClick={() => { onDeleteRoomElement(selElement.id); setSelectedElement(null) }}>
                  DELETE ELEMENT
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="fp-panel-section">
              <div className="fp-panel-label">FLOOR PLAN</div>
              <div style={{ fontSize: 12, color: 'var(--deep)', marginBottom: 4, fontWeight: 500 }}>
                {tables.length} table{tables.length !== 1 ? 's' : ''} · {totalSeated}/{guests.length} seated
              </div>
              {roomElements.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {roomElements.length} element{roomElements.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div className="fp-panel-section" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="fp-panel-label">UNASSIGNED · {unassigned.length}</div>
              {unassigned.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>All guests seated!</div>
              ) : unassigned.map(g => (
                <GuestRow key={g.id} guest={g} draggable
                  onDragStart={e => handleGuestDragStart(e, g.id)} />
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>
              drag guests to tables · click table to edit
            </div>
          </>
        )}
      </div>
    </div>
  )
}
