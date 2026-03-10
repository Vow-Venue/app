import { useState, useRef, useEffect, useCallback } from 'react'
import { Heading, Type, FileText, Image, Download, Trash2 } from 'lucide-react'
import Modal from './Modal'

const TYPE_META = {
  header: { icon: Heading, label: 'Section Header' },
  text:   { icon: Type,     label: 'Text' },
  file:   { icon: FileText, label: 'File' },
  image:  { icon: Image,    label: 'Image' },
}

const TYPE_OPTIONS = [
  { type: 'header', icon: Heading, label: 'Section Header', desc: 'Add a title to organize your packet' },
  { type: 'text',   icon: Type,    label: 'Text Block',     desc: 'Write a paragraph or instructions' },
  { type: 'file',   icon: FileText, label: 'File Attachment', desc: 'Upload a PDF, document, or spreadsheet' },
  { type: 'image',  icon: Image,   label: 'Image',          desc: 'Upload a photo or graphic' },
]

function getCardTitle(block) {
  switch (block.type) {
    case 'header': return block.content.title || 'Untitled Header'
    case 'text': {
      const body = block.content.body || ''
      return body.length > 60 ? body.slice(0, 60) + '...' : body || 'Untitled Text'
    }
    case 'file':   return block.content.file_name || 'Attached File'
    case 'image':  return block.content.caption || 'Image'
    default:       return 'Untitled'
  }
}

function getCardPreview(block) {
  switch (block.type) {
    case 'header': return 'Section Header'
    case 'text':   return block.content.body || 'No content yet'
    case 'file':   return 'File Attachment'
    case 'image':  return block.content.caption || 'Image'
    default:       return ''
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AutoTextarea({ value, onChange, className, placeholder }) {
  const ref = useRef(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={e => { onChange(e.target.value); resize() }}
      placeholder={placeholder}
      rows={3}
    />
  )
}

export default function Guidance({
  blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onReorderBlock, onUploadFile, canEdit = false,
}) {
  const [viewingBlock, setViewingBlock] = useState(null)
  const [editingBlock, setEditingBlock] = useState(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [creatingType, setCreatingType] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Form state for create/edit
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCaption, setFormCaption] = useState('')

  const fileRef = useRef(null)

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)

  // ── Open / close helpers ──────────────────────────────────────────────────

  const openView = (block) => { setViewingBlock(block); setEditingBlock(null) }
  const closeView = () => setViewingBlock(null)

  const openEdit = (block) => {
    setEditingBlock(block)
    setViewingBlock(null)
    if (block.type === 'header') setFormTitle(block.content.title || '')
    if (block.type === 'text') setFormBody(block.content.body || '')
    if (block.type === 'image') setFormCaption(block.content.caption || '')
  }

  const closeEdit = () => { setEditingBlock(null); setCreatingType(null) }

  const openCreate = () => { setShowTypePicker(true); setCreatingType(null) }
  const closeCreate = () => { setShowTypePicker(false); setCreatingType(null) }

  const pickType = (type) => {
    setShowTypePicker(false)
    if (type === 'file' || type === 'image') {
      setCreatingType(type)
      setTimeout(() => fileRef.current?.click(), 50)
    } else {
      setCreatingType(type)
      setFormTitle('')
      setFormBody('')
    }
  }

  // ── Create / Edit submit ──────────────────────────────────────────────────

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    if (creatingType === 'header') {
      onAddBlock('header', { title: formTitle || 'Untitled Header' })
    } else if (creatingType === 'text') {
      onAddBlock('text', { body: formBody })
    }
    closeCreate()
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!editingBlock) return
    if (editingBlock.type === 'header') {
      onUpdateBlock(editingBlock.id, { content: { ...editingBlock.content, title: formTitle } })
    } else if (editingBlock.type === 'text') {
      onUpdateBlock(editingBlock.id, { content: { ...editingBlock.content, body: formBody } })
    } else if (editingBlock.type === 'image') {
      onUpdateBlock(editingBlock.id, { content: { ...editingBlock.content, caption: formCaption } })
    }
    closeEdit()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await onUploadFile(file)
    if (url && creatingType === 'file') {
      onAddBlock('file', { file_url: url, file_name: file.name })
    } else if (url && creatingType === 'image') {
      onAddBlock('image', { image_url: url, caption: '' })
    }
    setUploading(false)
    setCreatingType(null)
    setShowTypePicker(false)
    e.target.value = ''
  }

  const handleDelete = (blockId, e) => {
    if (e) e.stopPropagation()
    if (confirmingDelete === blockId) {
      onDeleteBlock(blockId)
      setConfirmingDelete(null)
    } else {
      setConfirmingDelete(blockId)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="section-title">Guidance</div>
      <div className="section-subtitle">
        {sorted.length === 0 ? 'WELCOME PACKET' : `${sorted.length} ITEM${sorted.length !== 1 ? 'S' : ''}`}
      </div>

      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
          <button className="btn btn-primary" onClick={openCreate}>+ NEW GUIDANCE</button>
        </div>
      )}

      {/* Hidden file input for file/image uploads */}
      <input
        ref={fileRef}
        type="file"
        accept={creatingType === 'image' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.txt'}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="guidance-empty">
          {canEdit
            ? 'No guidance yet. Create your first item to build a welcome packet for your couple.'
            : "Your planner hasn't added any guidance yet."}
        </div>
      )}

      {/* Card grid */}
      {sorted.length > 0 && (
        <div className="card-grid">
          {sorted.map(block => {
            const meta = TYPE_META[block.type] || TYPE_META.text
            const Icon = meta.icon
            const isImage = block.type === 'image' && block.content.image_url

            return (
              <div className="guidance-card" key={block.id} onClick={() => openView(block)}>
                {isImage ? (
                  <div className="guidance-card-thumb">
                    <img src={block.content.image_url} alt={block.content.caption || 'Image'} />
                  </div>
                ) : (
                  <div className="guidance-card-icon">
                    <Icon size={24} />
                  </div>
                )}

                <div className="guidance-card-body">
                  <div className="guidance-card-top">
                    <div className="guidance-card-title">{getCardTitle(block)}</div>
                    <span className="guidance-type-badge">{meta.label.toUpperCase()}</span>
                  </div>
                  {!isImage && (
                    <div className="guidance-card-preview">{getCardPreview(block)}</div>
                  )}
                </div>

                <div className="guidance-card-footer">
                  <span className="guidance-card-date">{formatDate(block.createdAt)}</span>
                  {canEdit && (
                    <div className="guidance-card-actions" onClick={e => e.stopPropagation()}>
                      {confirmingDelete === block.id ? (
                        <>
                          <button className="btn-danger" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { onDeleteBlock(block.id); setConfirmingDelete(null) }}>
                            DELETE
                          </button>
                          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setConfirmingDelete(null)}>
                            CANCEL
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost" onClick={() => openEdit(block)}>EDIT</button>
                          <button className="btn-danger" style={{ padding: '4px 6px', fontSize: 0 }} onClick={(e) => handleDelete(block.id, e)}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      {viewingBlock && (
        <div className="modal-backdrop" onClick={closeView}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="guidance-type-badge">
                  {(TYPE_META[viewingBlock.type]?.label || 'Item').toUpperCase()}
                </span>
                {viewingBlock.type === 'header' && viewingBlock.content.title}
              </div>
              <button className="modal-close" onClick={closeView}>×</button>
            </div>

            <div className="guidance-view-body">
              {viewingBlock.type === 'header' && (
                <h2 className="guidance-view-header">{viewingBlock.content.title || 'Untitled Header'}</h2>
              )}
              {viewingBlock.type === 'text' && (
                <div className="guidance-view-text">
                  {viewingBlock.content.body || <em style={{ color: 'var(--muted)' }}>No content</em>}
                </div>
              )}
              {viewingBlock.type === 'file' && (
                <div className="guidance-view-file">
                  <FileText size={28} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <div>
                    <div className="guidance-view-filename">{viewingBlock.content.file_name || 'Attached file'}</div>
                    <a
                      href={viewingBlock.content.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guidance-view-download"
                    >
                      <Download size={13} /> Download File
                    </a>
                  </div>
                </div>
              )}
              {viewingBlock.type === 'image' && (
                <div className="guidance-view-image">
                  {viewingBlock.content.image_url && (
                    <img src={viewingBlock.content.image_url} alt={viewingBlock.content.caption || 'Image'} />
                  )}
                  {viewingBlock.content.caption && (
                    <div className="guidance-view-caption">{viewingBlock.content.caption}</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeView}>CLOSE</button>
              {canEdit && <button className="btn btn-primary" onClick={() => openEdit(viewingBlock)}>EDIT</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── Type Picker Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={showTypePicker} onClose={closeCreate} title="New Guidance">
        <div className="guidance-type-picker">
          {TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon
            return (
              <button key={opt.type} className="guidance-type-option" onClick={() => pickType(opt.type)}>
                <Icon size={24} style={{ color: 'var(--gold)' }} />
                <div className="guidance-type-option-label">{opt.label}</div>
                <div className="guidance-type-option-desc">{opt.desc}</div>
              </button>
            )
          })}
        </div>
        {uploading && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>
            Uploading...
          </div>
        )}
      </Modal>

      {/* ── Create Modal (header / text) ───────────────────────────────────── */}
      <Modal
        isOpen={creatingType === 'header' || creatingType === 'text'}
        onClose={closeCreate}
        title={creatingType === 'header' ? 'New Section Header' : 'New Text Block'}
      >
        <form onSubmit={handleCreateSubmit}>
          {creatingType === 'header' && (
            <div className="form-group">
              <label>TITLE *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Welcome, Planning Timeline, Venue Details"
                required
                autoFocus
              />
            </div>
          )}
          {creatingType === 'text' && (
            <div className="form-group">
              <label>CONTENT</label>
              <AutoTextarea
                className="guidance-form-textarea"
                value={formBody}
                onChange={setFormBody}
                placeholder="Write your guidance content here..."
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={closeCreate}>CANCEL</button>
            <button type="submit" className="btn btn-primary">CREATE</button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingBlock}
        onClose={closeEdit}
        title={editingBlock ? `Edit ${TYPE_META[editingBlock.type]?.label || 'Item'}` : 'Edit'}
      >
        {editingBlock && (
          <form onSubmit={handleEditSubmit}>
            {editingBlock.type === 'header' && (
              <div className="form-group">
                <label>TITLE</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Section title"
                  autoFocus
                />
              </div>
            )}
            {editingBlock.type === 'text' && (
              <div className="form-group">
                <label>CONTENT</label>
                <AutoTextarea
                  className="guidance-form-textarea"
                  value={formBody}
                  onChange={setFormBody}
                  placeholder="Write your guidance content here..."
                />
              </div>
            )}
            {editingBlock.type === 'file' && (
              <div className="guidance-view-file" style={{ margin: '16px 24px' }}>
                <FileText size={28} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <div>
                  <div className="guidance-view-filename">{editingBlock.content.file_name || 'Attached file'}</div>
                  <a
                    href={editingBlock.content.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guidance-view-download"
                  >
                    <Download size={13} /> Download File
                  </a>
                </div>
              </div>
            )}
            {editingBlock.type === 'image' && (
              <>
                {editingBlock.content.image_url && (
                  <div style={{ margin: '16px 24px', textAlign: 'center' }}>
                    <img
                      src={editingBlock.content.image_url}
                      alt={editingBlock.content.caption || 'Image'}
                      style={{ maxWidth: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>CAPTION</label>
                  <input
                    type="text"
                    value={formCaption}
                    onChange={e => setFormCaption(e.target.value)}
                    placeholder="Add a caption..."
                  />
                </div>
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={closeEdit}>CANCEL</button>
              <button type="submit" className="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
