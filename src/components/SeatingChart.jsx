import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'

// ── Layout constants ─────────────────────────────────────────────────────────
const ROUND_W = 200, ROUND_H = 200   // seat layout area (not incl. controls bar)
const RECT_W  = 300, RECT_H  = 170
const SEAT_R  = 13                    // seat circle radius
const CTRL_H  = 36                    // controls bar height above layout area

// ── Seat position computation ─────────────────────────────────────────────────
// Returns [{x, y, isHead}] — positions are relative to the layout area top-left.
function getSeatPositions(shape, capacity) {
  if (shape === 'round') {
    const cx = ROUND_W / 2, cy = ROUND_H / 2
    const r = 78  // radius at which seats are placed
    return Array.from({ length: capacity }, (_, i) => {
      const a = (2 * Math.PI * i / capacity) - Math.PI / 2
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), isHead: false }
    })
  }
  // Rectangular: 2 head seats on ends, rest split top/bottom
  const tl = 44, tr = 256, tt = 38, tb = 132
  const cy = (tt + tb) / 2
  const sideN = Math.max(0, capacity - 2)
  const topN = Math.ceil(sideN / 2)
  const botN = Math.floor(sideN / 2)
  const off = 22
  const pos = []
  pos.push({ x: tl - off, y: cy, isHead: true })           // left head
  for (let i = 0; i < topN; i++)
    pos.push({ x: tl + (tr - tl) * (i + 1) / (topN + 1), y: tt - off })
  for (let i = 0; i < botN; i++)
    pos.push({ x: tl + (tr - tl) * (i + 1) / (botN + 1), y: tb + off })
  pos.push({ x: tr + off, y: cy, isHead: true })           // right head
  return pos
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SeatingChart({
  guests, tables,
  onUpdateGuest, onUpdateTable, onAddTable, onDeleteTable,
  canEdit = true,
}) {
  const canvasRef  = useRef(null)
  const popoverRef = useRef(null)

  const [positions,     setPositions]     = useState({})
  const [draggingTable, setDraggingTable] = useState(null)
  const [dragOverTable, setDragOverTable] = useState(null)
  const [editTable,     setEditTable]     = useState(null)
  const [editForm,      setEditForm]      = useState({})
  // activeSeat: { tableId, seatNum, currentGuestId, rect }
  const [activeSeat,    setActiveSeat]    = useState(null)

  // Sync table canvas positions
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      tables.forEach((t, i) => {
        if (!next[t.id]) next[t.id] = {
          x: t.x ?? (60 + (i % 3) * 280),
          y: t.y ?? (60 + Math.floor(i / 3) * 240),
        }
      })
      return next
    })
  }, [tables])

  // Close seat popover on outside click
  useEffect(() => {
    if (!activeSeat) return
    const fn = e => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setActiveSeat(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [activeSeat])

  const getPos = t => positions[t.id] ?? { x: t.x ?? 60, y: t.y ?? 60 }

  // ── Table drag (mouse) ──────────────────────────────────────────────────────
  const handleTableMouseDown = (e, table) => {
    if (e.target.closest('[data-action]')) return
    e.preventDefault()
    const { left, top } = canvasRef.current.getBoundingClientRect()
    const { x, y } = getPos(table)
    setDraggingTable({ id: table.id, ox: e.clientX - left - x, oy: e.clientY - top - y })
  }

  const handleCanvasMouseMove = e => {
    if (!draggingTable) return
    const { left, top } = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, e.clientX - left - draggingTable.ox)
    const y = Math.max(0, e.clientY - top - draggingTable.oy)
    setPositions(prev => ({ ...prev, [draggingTable.id]: { x, y } }))
  }

  const handleCanvasMouseUp = () => {
    if (draggingTable) {
      const pos = positions[draggingTable.id]
      if (pos) onUpdateTable(draggingTable.id, { x: Math.round(pos.x), y: Math.round(pos.y) })
      setDraggingTable(null)
    }
  }

  // ── Guest drag (sidebar → table = assign first free seat) ───────────────────
  const handleGuestDragStart = (e, guestId) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTableDrop = (e, table) => {
    e.preventDefault()
    setDragOverTable(null)
    const guestId = e.dataTransfer.getData('guestId')
    if (!guestId) return
    const capacity = table.capacity ?? 8
    const seated = guests.filter(g => g.tableId === table.id)
    const used = new Set(seated.map(g => g.seatNumber).filter(n => n != null))
    let seat = null
    for (let i = 0; i < capacity; i++) {
      if (!used.has(i)) { seat = i; break }
    }
    if (seat === null) return  // table full
    onUpdateGuest(guestId, { tableId: table.id, seatNumber: seat })
  }

  // ── Seat click → popover ───────────────────────────────────────────────────
  const handleSeatClick = (e, tableId, seatNum, currentGuestId) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveSeat({ tableId, seatNum, currentGuestId, rect })
  }

  const handleAssignSeat = guestId => {
    if (!guestId || !activeSeat) return
    onUpdateGuest(guestId, { tableId: activeSeat.tableId, seatNumber: activeSeat.seatNum })
    setActiveSeat(null)
  }

  // ── Add table ───────────────────────────────────────────────────────────────
  const handleAddTable = shape => {
    const n = tables.length
    const x = 60 + (n % 3) * 280
    const y = 60 + Math.floor(n / 3) * 240
    const roundN = tables.filter(t => (t.shape ?? 'round') === 'round').length
    const rectN  = tables.filter(t => (t.shape ?? 'round') === 'rect').length
    const name = shape === 'rect'
      ? (rectN === 0 ? 'Head Table' : `Long Table ${rectN + 1}`)
      : `Table ${roundN + 1}`
    onAddTable({ name, capacity: shape === 'rect' ? 12 : 8, shape, x, y })
  }

  // ── Edit table modal ────────────────────────────────────────────────────────
  const openEdit = t => {
    setEditTable(t)
    setEditForm({ name: t.name, capacity: t.capacity ?? 8, shape: t.shape ?? 'round' })
  }

  const handleEditSave = () => {
    onUpdateTable(editTable.id, {
      name: editForm.name,
      capacity: Number(editForm.capacity),
      shape: editForm.shape,
    })
    setEditTable(null)
  }

  const unassigned = guests.filter(g => !g.tableId)
  const totalSeated = guests.filter(g => g.tableId).length

  // Popover derived data
  const activeTable = activeSeat ? tables.find(t => t.id === activeSeat.tableId) : null
  const activeGuest = activeSeat?.currentGuestId
    ? guests.find(g => g.id === activeSeat.currentGuestId)
    : null
  const seatedAtActiveTable = activeTable
    ? guests.filter(g => g.tableId === activeTable.id)
    : []
  const activeSeatIsHead = activeTable && (activeTable.shape ?? 'round') !== 'round' &&
    (activeSeat.seatNum === 0 || activeSeat.seatNum === (activeTable.capacity ?? 8) - 1)

  return (
    <div>
      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 12, marginBottom: 12, flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--muted)' }}>
            {tables.length} TABLE{tables.length !== 1 ? 'S' : ''} · {totalSeated}/{guests.length} SEATED
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px dashed var(--gold)', display: 'inline-block' }} />
              Round · 8 seats
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 20, height: 10, borderRadius: 3, border: '1.5px dashed var(--gold)', display: 'inline-block' }} />
              Long · 12 seats
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
              Click ○ to assign a seat
            </span>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => handleAddTable('round')}
            >
              <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--gold)', display: 'inline-block', flexShrink: 0 }} />
              + ROUND TABLE
            </button>
            <button
              className="btn btn-primary"
              style={{ fontSize: 11, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => handleAddTable('rect')}
            >
              <span style={{ width: 17, height: 9, borderRadius: 3, border: '2px solid rgba(255,255,255,0.7)', display: 'inline-block', flexShrink: 0 }} />
              + LONG TABLE
            </button>
          </div>
        )}
      </div>

      {/* ── Main: sidebar + canvas ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', height: 'calc(100vh - 310px)', minHeight: 460 }}>

        {/* Sidebar */}
        <div style={{
          width: 190, flexShrink: 0, borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', background: 'var(--white)',
          borderRadius: '12px 0 0 12px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 10px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, letterSpacing: 2, color: 'var(--muted)',
          }}>
            UNASSIGNED · {unassigned.length}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {unassigned.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
                All guests seated!
              </div>
            ) : unassigned.map(g => (
              <div
                key={g.id}
                draggable
                onDragStart={e => handleGuestDragStart(e, g.id)}
                style={{
                  padding: '7px 12px', fontSize: 12, color: 'var(--deep)',
                  cursor: 'grab', display: 'flex', alignItems: 'center', gap: 8,
                  userSelect: 'none', borderBottom: '1px solid rgba(61,44,44,0.05)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,151,90,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>⠿</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            padding: '10px 12px', borderTop: '1px solid var(--border)',
            fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic',
          }}>
            drag to a table or click ○
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, position: 'relative', overflow: 'auto',
            background: 'var(--cream)', borderRadius: '0 12px 12px 0',
            cursor: draggingTable ? 'grabbing' : 'default',
            backgroundImage: 'radial-gradient(circle, rgba(184,151,90,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            minWidth: 0,
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {tables.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column', gap: 14,
              color: 'var(--muted)', pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', gap: 16, opacity: 0.25 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed currentColor' }} />
                <div style={{ width: 80, height: 36, borderRadius: 8, border: '2px dashed currentColor', alignSelf: 'center' }} />
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.8 }}>
                Use <strong>+ Round Table</strong> or <strong>+ Long Table</strong> above<br />
                to start building your seating chart
              </div>
            </div>
          )}

          {tables.map(table => {
            const pos      = getPos(table)
            const shape    = table.shape ?? 'round'
            const capacity = table.capacity ?? 8
            const layoutW  = shape === 'round' ? ROUND_W : RECT_W
            const layoutH  = shape === 'round' ? ROUND_H : RECT_H
            const seatedHere  = guests.filter(g => g.tableId === table.id)
            const seatPositions = getSeatPositions(shape, capacity)
            const isOver     = dragOverTable === table.id
            const isDragging = draggingTable?.id === table.id
            const isFull     = seatedHere.length >= capacity

            return (
              <div
                key={table.id}
                style={{
                  position: 'absolute', left: pos.x, top: pos.y,
                  width: layoutW, userSelect: 'none',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: isDragging ? 100 : 1,
                  filter: isDragging ? 'drop-shadow(0 8px 24px rgba(61,44,44,0.22))' : 'none',
                  transition: isDragging ? 'none' : 'filter 0.2s',
                }}
                onMouseDown={canEdit ? e => handleTableMouseDown(e, table) : undefined}
                onDragOver={e => { e.preventDefault(); setDragOverTable(table.id) }}
                onDragLeave={() => setDragOverTable(null)}
                onDrop={e => handleTableDrop(e, table)}
              >
                {/* Controls bar */}
                <div
                  data-action="ctrl"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 6px 4px 10px', height: CTRL_H,
                    background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)',
                    borderBottom: 'none', borderRadius: '10px 10px 0 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 13, fontStyle: 'italic', color: 'var(--deep)', fontWeight: 600,
                    }}>
                      {table.name}
                    </span>
                    <span style={{ fontSize: 10, color: isFull ? 'var(--rose)' : 'var(--muted)', fontWeight: 600 }}>
                      {seatedHere.length}/{capacity}{isFull ? ' · FULL' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {canEdit && (
                      <>
                        <button
                          data-action="edit"
                          className="btn-icon"
                          style={{ fontSize: 10, padding: '2px 6px' }}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => openEdit(table)}
                        >
                          Edit
                        </button>
                        <button
                          data-action="del"
                          className="btn-danger"
                          style={{ fontSize: 12, padding: '0 5px' }}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => onDeleteTable(table.id)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Seat layout area */}
                <div style={{
                  position: 'relative', width: layoutW, height: layoutH,
                  background: 'rgba(255,255,255,0.55)',
                  border: '1px solid var(--border)', borderRadius: '0 0 10px 10px',
                  overflow: 'visible',
                }}>
                  {/* Table shape visual */}
                  {shape === 'round' ? (
                    <div style={{
                      position: 'absolute',
                      left: ROUND_W / 2 - 55, top: ROUND_H / 2 - 55,
                      width: 110, height: 110, borderRadius: '50%',
                      background: isOver ? 'rgba(184,151,90,0.28)' : 'rgba(184,151,90,0.14)',
                      border: `2px ${isOver ? 'solid' : 'dashed'} var(--gold)`,
                      transition: 'background 0.15s, border-style 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isOver && (
                        <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>DROP</span>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      left: 44, top: 38, width: 212, height: 94,
                      borderRadius: 8,
                      background: isOver ? 'rgba(184,151,90,0.28)' : 'rgba(184,151,90,0.14)',
                      border: `2px ${isOver ? 'solid' : 'dashed'} var(--gold)`,
                      transition: 'background 0.15s, border-style 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isOver && (
                        <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>DROP</span>
                      )}
                    </div>
                  )}

                  {/* Seat spots */}
                  {seatPositions.map((sp, seatNum) => {
                    const guest    = seatedHere.find(g => g.seatNumber === seatNum)
                    const isActive = activeSeat?.tableId === table.id && activeSeat?.seatNum === seatNum

                    return (
                      <div
                        key={seatNum}
                        data-action="seat"
                        onClick={e => handleSeatClick(e, table.id, seatNum, guest?.id ?? null)}
                        title={guest
                          ? `${guest.name}${sp.isHead ? ' — Head seat' : ''}`
                          : `Seat ${seatNum + 1}${sp.isHead ? ' (Head)' : ''} — click to assign`
                        }
                        style={{
                          position: 'absolute',
                          left: sp.x - SEAT_R,
                          top:  sp.y - SEAT_R,
                          width: SEAT_R * 2,
                          height: SEAT_R * 2,
                          borderRadius: '50%',
                          background: guest ? 'var(--gold)' : 'rgba(255,255,255,0.95)',
                          border: `2px solid ${sp.isHead ? 'var(--deep)' : 'var(--gold)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 9, fontWeight: 700,
                          color: guest ? 'white' : (sp.isHead ? 'var(--deep)' : 'var(--gold)'),
                          boxShadow: isActive
                            ? '0 0 0 3px rgba(184,151,90,0.5)'
                            : '0 1px 4px rgba(0,0,0,0.1)',
                          transition: 'box-shadow 0.15s, background 0.15s',
                          userSelect: 'none', zIndex: 5,
                        }}
                      >
                        {guest
                          ? guest.name.charAt(0).toUpperCase()
                          : (sp.isHead ? '★' : '+')}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Seat picker popover (fixed position) ────────────────────────────── */}
      {activeSeat && activeTable && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: Math.min(activeSeat.rect.bottom + 8, window.innerHeight - 240),
            left: Math.max(8, Math.min(activeSeat.rect.left - 8, window.innerWidth - 248)),
            zIndex: 2000,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(61,44,44,0.18)',
            width: 230,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>
            {activeSeatIsHead ? '★ HEAD SEAT' : `SEAT ${activeSeat.seatNum + 1}`}
            {' · '}
            {activeTable.name.toUpperCase()}
          </div>

          {activeGuest ? (
            /* Occupied seat */
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--deep)', marginBottom: 6 }}>
                {activeGuest.name}
              </div>
              {activeGuest.dietary && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                  🍽 {activeGuest.dietary}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, flex: 1 }}
                  onClick={() => {
                    onUpdateGuest(activeGuest.id, { seatNumber: null })
                    setActiveSeat(null)
                  }}
                >
                  UNASSIGN SEAT
                </button>
                <button
                  className="btn-danger"
                  title="Remove from table"
                  onClick={() => {
                    onUpdateGuest(activeGuest.id, { tableId: null, seatNumber: null })
                    setActiveSeat(null)
                  }}
                >
                  ×
                </button>
              </div>
              {/* Move to different seat at this table */}
              {seatedAtActiveTable.filter(g => g.seatNumber !== activeSeat.seatNum).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6 }}>SWAP WITH:</div>
                  <select
                    style={{ width: '100%', fontSize: 12 }}
                    defaultValue=""
                    onChange={e => {
                      if (!e.target.value) return
                      const otherGuest = guests.find(g => g.id === e.target.value)
                      if (!otherGuest) return
                      const oldSeat = otherGuest.seatNumber
                      onUpdateGuest(activeGuest.id, { seatNumber: oldSeat })
                      onUpdateGuest(otherGuest.id, { seatNumber: activeSeat.seatNum })
                      setActiveSeat(null)
                    }}
                  >
                    <option value="">— swap seats with —</option>
                    {seatedAtActiveTable
                      .filter(g => g.seatNumber !== activeSeat.seatNum && g.seatNumber != null)
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} (seat {g.seatNumber + 1})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            /* Empty seat */
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                Assign a guest to this seat:
              </div>
              <select
                style={{ width: '100%', marginBottom: 10, fontSize: 12 }}
                defaultValue=""
                onChange={e => e.target.value && handleAssignSeat(e.target.value)}
              >
                <option value="">— choose guest —</option>
                {unassigned.length > 0 && (
                  <optgroup label="Unassigned guests">
                    {unassigned.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </optgroup>
                )}
                {seatedAtActiveTable.filter(g => g.seatNumber != null).length > 0 && (
                  <optgroup label={`Move from ${activeTable.name}`}>
                    {seatedAtActiveTable
                      .filter(g => g.seatNumber != null && g.seatNumber !== activeSeat.seatNum)
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} (seat {g.seatNumber + 1})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, width: '100%' }}
                onClick={() => setActiveSeat(null)}
              >
                CANCEL
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Edit table modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!editTable} onClose={() => setEditTable(null)} title="Edit Table">
        {editTable && (
          <form onSubmit={e => { e.preventDefault(); handleEditSave() }}>
            <div className="form-group">
              <label>TABLE NAME</label>
              <input
                type="text" value={editForm.name} required autoFocus
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>SEATS</label>
                <input
                  type="number" min={2} max={30} value={editForm.capacity}
                  onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>SHAPE</label>
                <select
                  value={editForm.shape}
                  onChange={e => setEditForm(p => ({ ...p, shape: e.target.value }))}
                >
                  <option value="round">Round (banquet)</option>
                  <option value="rect">Long / Rectangular</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>
              ★ Long tables have head seats at each end.
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditTable(null)}>CANCEL</button>
              <button type="submit" className="btn btn-primary">SAVE</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
