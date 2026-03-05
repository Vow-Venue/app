import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'

const TABLE_W = 180
const TABLE_H = 160

export default function SeatingChart({
  guests, tables,
  onUpdateGuest, onUpdateTable, onAddTable, onDeleteTable,
}) {
  const canvasRef = useRef(null)

  const [positions, setPositions] = useState({})
  const [draggingTable, setDraggingTable] = useState(null)
  const [dragOverTable, setDragOverTable] = useState(null)
  const [editTable, setEditTable] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Sync positions when tables change
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      tables.forEach((t, i) => {
        if (!next[t.id]) next[t.id] = {
          x: t.x ?? (60 + (i % 4) * 220),
          y: t.y ?? (60 + Math.floor(i / 4) * 210),
        }
      })
      return next
    })
  }, [tables])

  const getPos = (t) => positions[t.id] ?? { x: t.x ?? 60, y: t.y ?? 60 }

  // ── Table drag (mouse) ──────────────────────────────────────────────────────
  const handleTableMouseDown = (e, table) => {
    if (e.target.closest('[data-action]')) return
    e.preventDefault()
    const canvas = canvasRef.current.getBoundingClientRect()
    const pos = getPos(table)
    setDraggingTable({
      id: table.id,
      offsetX: e.clientX - canvas.left - pos.x,
      offsetY: e.clientY - canvas.top - pos.y,
    })
  }

  const handleCanvasMouseMove = (e) => {
    if (!draggingTable) return
    const canvas = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - canvas.left - draggingTable.offsetX, canvas.width - TABLE_W))
    const y = Math.max(0, Math.min(e.clientY - canvas.top - draggingTable.offsetY, canvas.height - TABLE_H))
    setPositions(prev => ({ ...prev, [draggingTable.id]: { x, y } }))
  }

  const handleCanvasMouseUp = () => {
    if (draggingTable) {
      const pos = positions[draggingTable.id]
      if (pos) onUpdateTable(draggingTable.id, { x: Math.round(pos.x), y: Math.round(pos.y) })
      setDraggingTable(null)
    }
  }

  // ── Guest drag (HTML5) ──────────────────────────────────────────────────────
  const handleGuestDragStart = (e, guestId) => {
    e.dataTransfer.setData('guestId', guestId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTableDragOver = (e, tableId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTable(tableId)
  }

  const handleTableDragLeave = () => setDragOverTable(null)

  const handleTableDrop = (e, tableId) => {
    e.preventDefault()
    const guestId = e.dataTransfer.getData('guestId')
    if (guestId) onUpdateGuest(guestId, { tableId })
    setDragOverTable(null)
  }

  const handleRemoveGuest = (guestId) => {
    onUpdateGuest(guestId, { tableId: null })
  }

  // ── Add table ───────────────────────────────────────────────────────────────
  const handleAddTable = (shape) => {
    const count = tables.length
    const x = 60 + (count % 4) * 210
    const y = 60 + Math.floor(count / 4) * 200
    const roundCount  = tables.filter(t => (t.shape ?? 'round') === 'round').length
    const rectCount   = tables.filter(t => (t.shape ?? 'round') === 'rect').length
    const name = shape === 'rect'
      ? (rectCount === 0 ? 'Head Table' : `Long Table ${rectCount + 1}`)
      : `Table ${roundCount + 1}`
    onAddTable({ name, capacity: shape === 'rect' ? 12 : 8, shape, x, y })
  }

  // ── Edit table modal ────────────────────────────────────────────────────────
  const openEdit = (t) => {
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
  const seated     = guests.filter(g => g.tableId)

  return (
    <div>
      {/* ── Top toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        {/* Stats + legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--muted)' }}>
            {tables.length} TABLE{tables.length !== 1 ? 'S' : ''} · {seated.length}/{guests.length} SEATED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <span style={{
                display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                background: 'rgba(184,151,90,0.18)', border: '1.5px dashed var(--gold)',
              }} />
              Round · 8 seats
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <span style={{
                display: 'inline-block', width: 22, height: 11, borderRadius: 4,
                background: 'rgba(184,151,90,0.18)', border: '1.5px dashed var(--gold)',
              }} />
              Long · 12 seats
            </span>
          </div>
        </div>

        {/* Add table buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 7 }}
            onClick={() => handleAddTable('round')}
          >
            <span style={{
              display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
              border: '2px solid var(--gold)', flexShrink: 0,
            }} />
            + ROUND TABLE
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: 11, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 7 }}
            onClick={() => handleAddTable('rect')}
          >
            <span style={{
              display: 'inline-block', width: 18, height: 10, borderRadius: 3,
              border: '2px solid rgba(255,255,255,0.7)', flexShrink: 0,
            }} />
            + LONG TABLE
          </button>
        </div>
      </div>

      {/* ── Main layout: sidebar + canvas ── */}
      <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 310px)', minHeight: 440 }}>

        {/* Sidebar: unassigned guests */}
        <div style={{
          width: 200,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--white)',
          borderRadius: '12px 0 0 12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: 'var(--muted)',
          }}>
            UNASSIGNED · {unassigned.length}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {unassigned.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
                All guests are seated!
              </div>
            ) : unassigned.map(g => (
              <div
                key={g.id}
                draggable
                onDragStart={e => handleGuestDragStart(e, g.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--deep)',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  userSelect: 'none',
                  borderBottom: '1px solid rgba(61,44,44,0.05)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,151,90,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>⠿</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              </div>
            ))}
          </div>
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
            fontSize: 10,
            color: 'var(--muted)',
            textAlign: 'center',
            fontStyle: 'italic',
            letterSpacing: 0.5,
          }}>
            drag guests → drop on table
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            background: 'var(--cream)',
            borderRadius: '0 12px 12px 0',
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
              justifyContent: 'center', flexDirection: 'column', gap: 16,
              color: 'var(--muted)', pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', gap: 16, opacity: 0.25 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed currentColor' }} />
                <div style={{ width: 80, height: 36, borderRadius: 8, border: '2px dashed currentColor', alignSelf: 'center' }} />
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7 }}>
                Use <strong>+ Round Table</strong> or <strong>+ Long Table</strong> above<br />
                to start building your seating chart
              </div>
            </div>
          )}

          {tables.map(table => {
            const pos      = getPos(table)
            const capacity = table.capacity ?? 8
            const shape    = table.shape ?? 'round'
            const seated   = guests.filter(g => g.tableId === table.id)
            const isOver   = dragOverTable === table.id
            const isDragging = draggingTable?.id === table.id
            const isFull   = seated.length >= capacity

            return (
              <div
                key={table.id}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: TABLE_W,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  zIndex: isDragging ? 100 : 1,
                  filter: isDragging ? 'drop-shadow(0 8px 24px rgba(61,44,44,0.2))' : 'none',
                  transition: isDragging ? 'none' : 'filter 0.2s',
                }}
                onMouseDown={e => handleTableMouseDown(e, table)}
                onDragOver={e => handleTableDragOver(e, table.id)}
                onDragLeave={handleTableDragLeave}
                onDrop={e => handleTableDrop(e, table.id)}
              >
                {/* Table shape visual */}
                <div style={{
                  width: '100%',
                  paddingBottom: shape === 'round' ? '100%' : '45%',
                  position: 'relative',
                  marginBottom: 6,
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: shape === 'round' ? '50%' : '14px',
                    background: isOver ? 'rgba(184,151,90,0.28)' : 'rgba(184,151,90,0.13)',
                    border: `2px ${isOver ? 'solid' : 'dashed'} var(--gold)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s, border-style 0.15s',
                  }}>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: 'var(--deep)',
                      textAlign: 'center',
                      padding: '0 14px',
                      lineHeight: 1.3,
                    }}>
                      {table.name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: isFull ? 'var(--rose)' : 'var(--muted)',
                      marginTop: 4,
                      fontWeight: 600,
                      letterSpacing: 1,
                    }}>
                      {seated.length}/{capacity}{isFull ? ' · FULL' : ''}
                    </div>
                  </div>
                </div>

                {/* Guest list + actions */}
                <div style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '5px 8px',
                  boxShadow: '0 2px 8px rgba(61,44,44,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
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
                      data-action="delete"
                      className="btn-danger"
                      style={{ fontSize: 12, padding: '0 5px' }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => onDeleteTable(table.id)}
                    >
                      ×
                    </button>
                  </div>

                  {seated.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                      Drop guests here
                    </div>
                  ) : seated.map(g => (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 0',
                      fontSize: 12,
                      color: 'var(--deep)',
                      borderBottom: '1px solid rgba(61,44,44,0.05)',
                    }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name}
                      </span>
                      <button
                        data-action="remove"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => handleRemoveGuest(g.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--muted)', fontSize: 14, lineHeight: 1,
                          padding: '0 2px', flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Edit table modal ── */}
      <Modal isOpen={!!editTable} onClose={() => setEditTable(null)} title="Edit Table">
        {editTable && (
          <form onSubmit={e => { e.preventDefault(); handleEditSave() }}>
            <div className="form-group">
              <label>TABLE NAME</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>SEATS</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={editForm.capacity}
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
