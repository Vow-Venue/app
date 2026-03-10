import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

export default function DesignStudio({
  boards, photos, onInitBoards, onAddBoard, onUpdateBoard, onDeleteBoard,
  onUploadPhoto, onDeletePhoto, canEdit,
}) {
  const [activeBoard, setActiveBoard] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(null)
  const fileRef = useRef(null)
  const notesTimeoutRef = useRef(null)

  // Auto-create default boards on first visit
  useEffect(() => {
    if (boards.length === 0 && canEdit) onInitBoards()
  }, [boards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep activeBoard in sync with parent boards state
  useEffect(() => {
    if (activeBoard) {
      const updated = boards.find(b => b.id === activeBoard.id)
      if (!updated) { setActiveBoard(null); return }
      if (updated.name !== activeBoard.name || updated.category !== activeBoard.category) {
        setActiveBoard(prev => ({ ...prev, name: updated.name, category: updated.category }))
      }
    }
  }, [boards]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedBoards = [...boards].sort((a, b) => a.sortOrder - b.sortOrder)

  const boardPhotos = activeBoard
    ? photos.filter(p => p.boardId === activeBoard.id).sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddBoard(newName.trim(), newCategory.trim())
    setNewName('')
    setNewCategory('')
    setShowNewModal(false)
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      await onUploadPhoto(activeBoard.id, file)
    }
    setUploading(false)
    e.target.value = ''
  }

  const startEdit = (board) => {
    setEditingId(board.id)
    setEditName(board.name)
    setEditCategory(board.category)
  }

  const saveEdit = (e) => {
    e.preventDefault()
    onUpdateBoard(editingId, { name: editName, category: editCategory })
    setActiveBoard(prev => prev && prev.id === editingId ? { ...prev, name: editName, category: editCategory } : prev)
    setEditingId(null)
  }

  const handleNotesChange = (value) => {
    setActiveBoard(prev => prev ? { ...prev, notes: value } : prev)
    clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(() => {
      onUpdateBoard(activeBoard.id, { notes: value })
    }, 600)
  }

  // ── Detail View ─────────────────────────────────────────────────────────────
  if (activeBoard) {
    return (
      <div className="design-detail">
        <div className="design-detail-header">
          <button className="design-back-btn" onClick={() => setActiveBoard(null)}>
            ← Back to boards
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              + UPLOAD PHOTOS
            </button>
          )}
        </div>

        <input
          ref={fileRef} type="file" accept="image/*" multiple
          style={{ display: 'none' }} onChange={handlePhotoUpload}
        />

        <div className="design-detail-title-row">
          {editingId === activeBoard.id ? (
            <form onSubmit={saveEdit} className="design-edit-form">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus placeholder="Board name" />
              <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="Category" />
              <button type="submit" className="btn btn-primary" style={{ fontSize: 11, padding: '6px 14px' }}>SAVE</button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => setEditingId(null)}>CANCEL</button>
            </form>
          ) : (
            <>
              <div>
                <h2 className="design-detail-name">{activeBoard.name}</h2>
                {activeBoard.category && <span className="design-board-category">{activeBoard.category.toUpperCase()}</span>}
              </div>
              {canEdit && (
                <button className="btn btn-ghost" onClick={() => startEdit(activeBoard)}>EDIT</button>
              )}
            </>
          )}
        </div>

        {uploading && <div className="design-uploading">Uploading...</div>}

        {boardPhotos.length === 0 ? (
          <div className="design-dropzone" onClick={canEdit ? () => fileRef.current?.click() : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default' }}>
            <div className="design-dropzone-inner">
              <span style={{ fontSize: 28, color: 'var(--muted)' }}>+</span>
              <span>Add inspiration photos</span>
            </div>
          </div>
        ) : (
          <div className="design-photo-grid">
            {boardPhotos.map(photo => (
              <div className="design-photo-item" key={photo.id}>
                <img src={photo.fileUrl} alt={photo.fileName} />
                {canEdit && (
                  <button className="design-photo-delete" onClick={() => onDeletePhoto(photo.id)} title="Delete photo">×</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="design-notes-section">
          <label className="design-notes-label">NOTES</label>
          {canEdit ? (
            <textarea
              className="design-notes-textarea"
              value={activeBoard.notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Add notes about this style guide..."
              rows={4}
            />
          ) : (
            <div className="design-notes-readonly">
              {activeBoard.notes || <em style={{ color: 'var(--muted)' }}>No notes yet</em>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Grid View ───────────────────────────────────────────────────────────────
  return (
    <div className="design-studio">
      <div className="section-title">Design Studio</div>
      <div className="section-subtitle">
        {boards.length} STYLE GUIDE{boards.length !== 1 ? 'S' : ''}
      </div>

      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>+ NEW STYLE GUIDE</button>
        </div>
      )}

      {boards.length === 0 && !canEdit && (
        <div className="design-empty">Your planner hasn't set up any style guides yet.</div>
      )}

      <div className="design-board-grid">
        {sortedBoards.map(board => {
          const bPhotos = photos.filter(p => p.boardId === board.id)
          const cover = bPhotos.length > 0
            ? bPhotos.sort((a, b) => a.sortOrder - b.sortOrder)[0]
            : null

          return (
            <div className="design-board-card" key={board.id} onClick={() => setActiveBoard(board)}>
              <div className="design-board-cover">
                {cover ? (
                  <img src={cover.fileUrl} alt={board.name} />
                ) : (
                  <div className="design-board-placeholder">
                    <span style={{ fontSize: 28 }}>+</span>
                    <span>Add inspiration photos</span>
                  </div>
                )}
                <div className="design-board-overlay">
                  <div className="design-board-title">{board.name}</div>
                </div>
              </div>
              <div className="design-board-meta">
                <span className="design-board-category">{(board.category || '').toUpperCase()}</span>
                <span className="design-board-count">{bPhotos.length} photo{bPhotos.length !== 1 ? 's' : ''}</span>
              </div>
              {canEdit && (
                <div className="design-board-actions" onClick={e => e.stopPropagation()}>
                  {confirmDeleteBoard === board.id ? (
                    <>
                      <button className="btn btn-primary" style={{ fontSize: 10, padding: '3px 10px' }}
                        onClick={() => { onDeleteBoard(board.id); setConfirmDeleteBoard(null) }}>DELETE</button>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
                        onClick={() => setConfirmDeleteBoard(null)}>CANCEL</button>
                    </>
                  ) : (
                    <button className="design-card-delete-btn" onClick={() => setConfirmDeleteBoard(board.id)}>×</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="New Style Guide">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>NAME *</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus
              placeholder="e.g. Color Palette, Table Centerpieces" />
          </div>
          <div className="form-group">
            <label>CATEGORY</label>
            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
              placeholder="e.g. Florals, Decor, Attire" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowNewModal(false)}>CANCEL</button>
            <button type="submit" className="btn btn-primary">CREATE</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
