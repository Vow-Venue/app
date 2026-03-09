import { useState, useEffect, useRef, useCallback } from 'react'
import Modal from './Modal'

const BLANK_NOTE = { title: '', body: '', visibility: 'shared' }

const stripHtml = (html) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      editorRef.current.innerHTML = value || ''
    }
    isInternalChange.current = false
  }, [value])

  const handleInput = useCallback(() => {
    isInternalChange.current = true
    onChange(editorRef.current.innerHTML)
  }, [onChange])

  const exec = (cmd, val = null) => {
    editorRef.current.focus()
    document.execCommand(cmd, false, val)
    isInternalChange.current = true
    onChange(editorRef.current.innerHTML)
  }

  return (
    <div className="rich-text-wrap">
      <div className="rich-text-toolbar">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic">
          <em>I</em>
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} title="Underline">
          <u>U</u>
        </button>
        <span className="rich-text-separator" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list">
          &bull; List
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Numbered list">
          1. List
        </button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        onInput={handleInput}
        data-placeholder="Write your notes here..."
      />
    </div>
  )
}

export default function Notes({ notes, onAddNote, onUpdateNote, onDeleteNote, canSeePrivate }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [viewingNote, setViewingNote] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [form, setForm] = useState(BLANK_NOTE)

  useEffect(() => {
    if (editingNote) {
      setForm({ title: editingNote.title, body: editingNote.body, visibility: editingNote.visibility })
    } else {
      setForm(BLANK_NOTE)
    }
  }, [editingNote, modalOpen])

  const openAdd = () => { setEditingNote(null); setViewingNote(null); setModalOpen(true) }
  const openEdit = (note) => { setEditingNote(note); setViewingNote(null); setModalOpen(true) }
  const openView = (note) => { setViewingNote(note); setModalOpen(false) }
  const close = () => { setModalOpen(false); setEditingNote(null); setViewingNote(null) }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingNote) {
      onUpdateNote(editingNote.id, form)
    } else {
      onAddNote(form)
    }
    close()
  }

  const visibleNotes = canSeePrivate
    ? notes
    : notes.filter(n => n.visibility === 'shared')

  return (
    <div>
      <div className="section-title">Notes</div>
      <div className="section-subtitle">{visibleNotes.length} NOTE{visibleNotes.length !== 1 ? 'S' : ''}</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={openAdd}>+ NEW NOTE</button>
      </div>

      {visibleNotes.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: 40 }}>
          No notes yet. Create your first note above.
        </div>
      ) : (
        <div className="card-grid">
          {visibleNotes.map(n => (
            <div className="note-card" key={n.id} onClick={() => openView(n)}>
              <div className="note-card-header">
                <div className="note-card-title">{n.title}</div>
                <span className={`note-visibility-badge ${n.visibility === 'planner_only' ? 'note-vis-private' : ''}`}>
                  {n.visibility === 'planner_only' ? 'PLANNER ONLY' : 'SHARED'}
                </span>
              </div>
              <div className="note-card-preview">
                {stripHtml(n.body) || 'No content'}
              </div>
              <div className="note-card-footer">
                <span className="note-card-date">{formatDate(n.updatedAt || n.createdAt)}</span>
                <div className="note-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost" onClick={() => openEdit(n)}>EDIT</button>
                  <button className="btn-danger" onClick={() => onDeleteNote(n.id)}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Note */}
      {viewingNote && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">{viewingNote.title}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div style={{ padding: '0 24px 8px' }}>
              <span className={`note-visibility-badge ${viewingNote.visibility === 'planner_only' ? 'note-vis-private' : ''}`}>
                {viewingNote.visibility === 'planner_only' ? 'PLANNER ONLY' : 'SHARED'}
              </span>
            </div>
            <div
              className="note-view-body"
              dangerouslySetInnerHTML={{ __html: viewingNote.body || '<em>No content</em>' }}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={close}>CLOSE</button>
              <button className="btn btn-primary" onClick={() => openEdit(viewingNote)}>EDIT</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={close} title={editingNote ? 'Edit Note' : 'New Note'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>TITLE *</label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. Venue Notes, Catering Details"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>CONTENT</label>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm(prev => ({ ...prev, body: html }))}
            />
          </div>
          <div className="form-group">
            <label>VISIBILITY</label>
            <select name="visibility" value={form.visibility} onChange={handleChange}>
              <option value="shared">Shared with collaborators</option>
              <option value="planner_only">Planner only</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>CANCEL</button>
            <button type="submit" className="btn btn-primary">
              {editingNote ? 'SAVE CHANGES' : 'CREATE NOTE'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
