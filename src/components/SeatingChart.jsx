import { useState, useRef, useEffect, useCallback } from 'react'

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

const ELEMENT_STYLES = {
  dance_floor: { bg: 'rgba(200,180,160,0.18)', border: '2px dashed rgba(200,180,160,0.5)', icon: '💃' },
  stage:       { bg: 'rgba(184,151,90,0.14)',   border: '2px dashed rgba(184,151,90,0.4)',  icon: '🎤' },
  bar:         { bg: 'rgba(139,115,85,0.14)',    border: '2px dashed rgba(139,115,85,0.4)',  icon: '🍸' },
  photo_booth: { bg: 'rgba(201,132,122,0.14)',   border: '2px dashed rgba(201,132,122,0.4)', icon: '📷' },
}

const RSVP_COLORS = { yes: '#4caf50', pending: '#ff9800', no: '#ef5350' }

// ── Seat position computation ────────────────────────────────────────────────
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

  // Tools: select | add_round | add_rect | add_sweetheart | add_element | delete
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
  const handleCanvasMouseDown = (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('fp-canvas')) return

    // Add tool: place on click
    if (activeTool.startsWith('add_') && activeTool !== 'add_element') {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const shape = activeTool.replace('add_', '')
      const n = tables.length
      const shapeCount = tables.filter(t => (t.shape ?? 'round') === shape).length
      const name = shape === 'sweetheart' ? 'Sweetheart Table'
        : shape === 'rect' ? (shapeCount === 0 ? 'Head Table' : `Long Table ${shapeCount + 1}`)
        : `Table ${shapeCount + 1}`
      const capacity = shape === 'sweetheart' ? 2 : shape === 'rect' ? 12 : 8
      onAddTable({ name, shape, capacity, x: snap(pos.x), y: snap(pos.y) })
      setActiveTool('select')
      return
    }

    // Add element with subtype
    if (activeTool === 'add_element' && elementSubType) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const defaults = ELEMENT_DEFAULTS[elementSubType]
      onAddRoomElement({ type: elementSubType, label: defaults.label, x: snap(pos.x), y: snap(pos.y), width: defaults.width, height: defaults.height })
      setActiveTool('select')
      setElementSubType(null)
      return
    }

    // Select: deselect + start pan
    setSelectedTable(null)
    setSelectedElement(null)
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }

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
      if (d.type === 'table') {
        onUpdateTable(d.id, { x: Math.max(0, pos.x - d.ox), y: Math.max(0, pos.y - d.oy) })
      } else {
        onUpdateRoomElement(d.id, { x: Math.max(0, pos.x - d.ox), y: Math.max(0, pos.y - d.oy) })
      }
    }
  }, [isPanning, zoom, screenToCanvas, onUpdateTable, onUpdateRoomElement])

  const handleMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return }
    if (dragRef.current) {
      const d = dragRef.current
      if (d.type === 'table') {
        const t = tables.find(t => t.id === d.id)
        if (t) onUpdateTable(d.id, { x: snap(t.x), y: snap(t.y) })
      } else {
        const el = roomElements.find(e => e.id === d.id)
        if (el) onUpdateRoomElement(d.id, { x: snap(el.x), y: snap(el.y) })
      }
      dragRef.current = null
      setDragging(null)
    }
  }, [isPanning, tables, roomElements, onUpdateTable, onUpdateRoomElement])

  // ── Table interactions ─────────────────────────────────────────────────────
  const handleTableMouseDown = (e, table) => {
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
  }

  // ── Element interactions ───────────────────────────────────────────────────
  const handleElementMouseDown = (e, elem) => {
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
  }

  // ── Guest drag (sidebar → table) ──────────────────────────────────────────
  const handleGuestDragStart = (e, guestId) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTableDrop = (e, table) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTable(null)
    const guestId = e.dataTransfer.getData('guestId')
    if (!guestId) return
    const capacity = table.capacity ?? 8
    const seated = guests.filter(g => g.tableId === table.id)
    if (seated.length >= capacity) return // full
    const used = new Set(seated.map(g => g.seatNumber).filter(n => n != null))
    let seat = null
    for (let i = 0; i < capacity; i++) {
      if (!used.has(i)) { seat = i; break }
    }
    if (seat === null) return
    onUpdateGuest(guestId, { tableId: table.id, seatNumber: seat })
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const unassigned = guests.filter(g => !g.tableId)
  const totalSeated = guests.filter(g => g.tableId).length
  const selTable = selectedTable ? tables.find(t => t.id === selectedTable) : null
  const selElement = selectedElement ? roomElements.find(e => e.id === selectedElement) : null
  const seatedAtSel = selTable ? guests.filter(g => g.tableId === selTable.id).sort((a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99)) : []

  // ── Tool cursor ───────────────────────────────────────────────────────────
  const cursorForCanvas = activeTool === 'select'
    ? (isPanning ? 'grabbing' : 'grab')
    : activeTool === 'delete' ? 'not-allowed'
    : 'crosshair'

  return (
    <div className="fp-container">
      {/* ── Left Toolbar ───────────────────────────────────────────────────── */}
      <div className="fp-toolbar no-print">
        {canEdit && (
          <>
            <button className={`fp-tool-btn${activeTool === 'select' ? ' active' : ''}`}
              onClick={() => { setActiveTool('select'); setElementMenu(false) }} title="Select / Move">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_round' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_round'); setElementMenu(false) }} title="Add Round Table">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_rect' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_rect'); setElementMenu(false) }} title="Add Rectangular Table">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="10" rx="2"/></svg>
            </button>
            <button className={`fp-tool-btn${activeTool === 'add_sweetheart' ? ' active' : ''}`}
              onClick={() => { setActiveTool('add_sweetheart'); setElementMenu(false) }} title="Add Sweetheart Table">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14a8 8 0 0 1 16 0H4z"/></svg>
            </button>

            <div style={{ position: 'relative' }}>
              <button className={`fp-tool-btn${activeTool === 'add_element' ? ' active' : ''}`}
                onClick={() => { setActiveTool('add_element'); setElementMenu(!elementMenu) }} title="Add Room Element">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
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
              onClick={() => { setActiveTool('delete'); setElementMenu(false) }} title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </>
        )}

        <div className="fp-tool-divider" />

        <button className="fp-tool-btn" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.15))} title="Zoom In">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button className="fp-tool-btn" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.15))} title="Zoom Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button className="fp-tool-btn" onClick={() => { setZoom(DEFAULT_ZOOM); setPan({ x: 0, y: 0 }) }} title="Reset View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <div className="fp-zoom-display">{Math.round(zoom * 100)}%</div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div
        ref={wrapperRef}
        className="fp-canvas-wrapper"
        style={{
          cursor: cursorForCanvas,
          backgroundImage: 'radial-gradient(circle, rgba(184,151,90,0.15) 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
          backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`,
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="fp-canvas"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* Room elements (behind tables) */}
          {roomElements.map(elem => {
            const es = ELEMENT_STYLES[elem.type] || ELEMENT_STYLES.dance_floor
            return (
              <div
                key={elem.id}
                className={`fp-element${selectedElement === elem.id ? ' selected' : ''}`}
                style={{
                  position: 'absolute', left: elem.x, top: elem.y,
                  width: elem.width, height: elem.height,
                  background: es.bg, border: es.border, borderRadius: 8,
                  cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
                  zIndex: 0,
                  outline: selectedElement === elem.id ? '2px solid var(--gold)' : 'none',
                  outlineOffset: 2,
                }}
                onMouseDown={e => handleElementMouseDown(e, elem)}
              >
                <span style={{ fontSize: 28, opacity: 0.6 }}>{es.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {elem.label}
                </span>
              </div>
            )
          })}

          {/* Tables */}
          {tables.map(table => {
            const shape = table.shape ?? 'round'
            const s = TABLE_SIZES[shape] || TABLE_SIZES.round
            const capacity = shape === 'sweetheart' ? 2 : (table.capacity ?? 8)
            const seatedHere = guests.filter(g => g.tableId === table.id)
            const seats = getSeatPositions(shape, capacity)
            const isOver = dragOverTable === table.id
            const isSel = selectedTable === table.id
            const isFull = seatedHere.length >= capacity

            // Extra size for seats overflow
            const padX = 30, padY = 30

            return (
              <div
                key={table.id}
                style={{
                  position: 'absolute', left: table.x - padX, top: table.y - padY,
                  width: s.w + padX * 2, height: s.h + padY * 2 + 20,
                  zIndex: dragging === table.id ? 100 : 2,
                  filter: dragging === table.id ? 'drop-shadow(0 6px 20px rgba(61,44,44,0.2))' : 'none',
                }}
                onMouseDown={e => handleTableMouseDown(e, table)}
                onDragOver={e => { e.preventDefault(); setDragOverTable(table.id) }}
                onDragLeave={() => setDragOverTable(null)}
                onDrop={e => handleTableDrop(e, table)}
              >
                {/* Table shape */}
                {shape === 'round' && (
                  <div style={{
                    position: 'absolute', left: padX, top: padY,
                    width: s.w, height: s.h, borderRadius: '50%',
                    background: isOver ? 'rgba(184,151,90,0.3)' : isSel ? 'rgba(184,151,90,0.25)' : 'rgba(184,151,90,0.14)',
                    border: `2px ${isSel ? 'solid' : 'dashed'} var(--gold)`,
                    transition: 'background 0.15s',
                    cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
                  }} />
                )}
                {shape === 'rect' && (
                  <div style={{
                    position: 'absolute', left: padX, top: padY,
                    width: s.w, height: s.h, borderRadius: 8,
                    background: isOver ? 'rgba(184,151,90,0.3)' : isSel ? 'rgba(184,151,90,0.25)' : 'rgba(184,151,90,0.14)',
                    border: `2px ${isSel ? 'solid' : 'dashed'} var(--gold)`,
                    transition: 'background 0.15s',
                    cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
                  }} />
                )}
                {shape === 'sweetheart' && (
                  <div style={{
                    position: 'absolute', left: padX, top: padY,
                    width: s.w, height: s.h,
                    borderRadius: '50px 50px 0 0',
                    background: isOver ? 'rgba(184,151,90,0.3)' : isSel ? 'rgba(184,151,90,0.25)' : 'rgba(184,151,90,0.14)',
                    border: `2px ${isSel ? 'solid' : 'dashed'} var(--gold)`,
                    borderBottom: `2px ${isSel ? 'solid' : 'dashed'} var(--gold)`,
                    transition: 'background 0.15s',
                    cursor: activeTool === 'select' ? 'grab' : activeTool === 'delete' ? 'pointer' : 'default',
                  }} />
                )}

                {/* Seats */}
                {seats.map((sp, seatNum) => {
                  const guest = seatedHere.find(g => g.seatNumber === seatNum)
                  const rsvpColor = guest ? (RSVP_COLORS[guest.rsvp] || RSVP_COLORS.pending) : null
                  return (
                    <div
                      key={seatNum}
                      className="fp-seat"
                      style={{
                        position: 'absolute',
                        left: padX + sp.x - SEAT_R,
                        top: padY + sp.y - SEAT_R,
                        width: SEAT_R * 2, height: SEAT_R * 2,
                        background: guest ? rsvpColor : 'rgba(255,255,255,0.95)',
                        border: `2px solid ${sp.isHead ? 'var(--deep)' : 'var(--gold)'}`,
                        color: guest ? '#fff' : (sp.isHead ? 'var(--deep)' : 'var(--gold)'),
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      }}
                      title={guest ? `${guest.name} (${guest.rsvp})` : `Seat ${seatNum + 1}${sp.isHead ? ' (Head)' : ''}`}
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedTable(table.id)
                        setSelectedElement(null)
                      }}
                    >
                      {guest ? guest.name.charAt(0).toUpperCase() : (sp.isHead ? '★' : '+')}
                    </div>
                  )
                })}

                {/* Label */}
                <div className="fp-table-label" style={{
                  position: 'absolute', left: padX, top: padY + s.h + (shape === 'sweetheart' ? 24 : 18),
                  width: s.w, textAlign: 'center',
                }}>
                  {table.name}
                  <span style={{ fontSize: 9, color: isFull ? 'var(--rose)' : 'var(--muted)', marginLeft: 4, fontStyle: 'normal', fontWeight: 400 }}>
                    {seatedHere.length}/{capacity}{isFull ? ' FULL' : ''}
                  </span>
                </div>

                {/* Print-only guest names */}
                <div className="fp-print-guests" style={{ display: 'none' }}>
                  {seatedHere.map(g => g.name).join(', ')}
                </div>
              </div>
            )
          })}

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
        {/* Table properties */}
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

            {/* Guests at this table */}
            <div className="fp-panel-section" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="fp-panel-label">GUESTS AT TABLE</div>
              {seatedAtSel.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No guests assigned yet. Drag guests here.
                </div>
              ) : seatedAtSel.map(g => (
                <div key={g.id} className="fp-guest-row">
                  <div className="fp-rsvp-dot" style={{ background: RSVP_COLORS[g.rsvp] || RSVP_COLORS.pending }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--deep)' }}>
                    {g.name}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>S{(g.seatNumber ?? 0) + 1}</span>
                  {canEdit && (
                    <button className="btn-danger" style={{ fontSize: 10, padding: '0 4px' }}
                      onClick={() => onUpdateGuest(g.id, { tableId: null, seatNumber: null })}>×</button>
                  )}
                </div>
              ))}

              {/* Unassigned guests below */}
              <div className="fp-panel-label" style={{ marginTop: 16 }}>UNASSIGNED · {unassigned.length}</div>
              {unassigned.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>All guests seated!</div>
              ) : unassigned.map(g => (
                <div key={g.id} className="fp-guest-row"
                  draggable onDragStart={e => handleGuestDragStart(e, g.id)}>
                  <div className="fp-rsvp-dot" style={{ background: RSVP_COLORS[g.rsvp] || RSVP_COLORS.pending }} />
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>⠿</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--deep)' }}>
                    {g.name}
                  </span>
                </div>
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
          /* Element properties */
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
          /* Default: stats + unassigned */
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
                <div key={g.id} className="fp-guest-row"
                  draggable onDragStart={e => handleGuestDragStart(e, g.id)}>
                  <div className="fp-rsvp-dot" style={{ background: RSVP_COLORS[g.rsvp] || RSVP_COLORS.pending }} />
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>⠿</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--deep)' }}>
                    {g.name}
                  </span>
                </div>
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
