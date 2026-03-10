import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, FileText, Image, Type, Heading, Download } from 'lucide-react'

const BLOCK_TYPES = [
  { type: 'header', label: 'Header', icon: Heading },
  { type: 'text',   label: 'Text',   icon: Type },
  { type: 'file',   label: 'File',   icon: FileText },
  { type: 'image',  label: 'Image',  icon: Image },
]

const STARTER_TEMPLATES = [
  {
    type: 'header', icon: Heading, title: 'Welcome Message',
    content: { title: 'Welcome Message' },
    desc: 'Greet your couple and set the tone for the planning journey.',
  },
  {
    type: 'text', icon: Type, title: 'Planning Process',
    content: { body: '' },
    desc: 'Outline your planning process, communication style, and key milestones.',
  },
  {
    type: 'text', icon: Type, title: 'What to Expect',
    content: { body: '' },
    desc: 'Set expectations for timelines, meetings, and deliverables.',
  },
]

export default function Guidance({
  blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onReorderBlock, onUploadFile, canEdit = false,
}) {
  const [uploading, setUploading] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)

  const handleAdd = async (type, content) => {
    if (type === 'header') {
      onAddBlock('header', content || { title: 'New Section' })
    } else if (type === 'text') {
      onAddBlock('text', content || { body: '' })
    } else if (type === 'file') {
      fileRef.current?.click()
    } else if (type === 'image') {
      imageRef.current?.click()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading('file')
    const url = await onUploadFile(file)
    if (url) onAddBlock('file', { file_url: url, file_name: file.name })
    setUploading(null)
    e.target.value = ''
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading('image')
    const url = await onUploadFile(file)
    if (url) onAddBlock('image', { image_url: url, caption: '' })
    setUploading(null)
    e.target.value = ''
  }

  const handleDelete = (id) => {
    if (confirmingDelete === id) {
      onDeleteBlock(id)
      setConfirmingDelete(null)
    } else {
      setConfirmingDelete(id)
    }
  }

  return (
    <div>
      <div className="section-title">Guidance</div>
      <div className="section-subtitle">
        {sorted.length === 0 ? 'WELCOME PACKET' : `${sorted.length} BLOCK${sorted.length !== 1 ? 'S' : ''}`}
      </div>

      <div className="guidance-container">
        {/* Add block toolbar — planner only */}
        {canEdit && sorted.length > 0 && (
          <div className="guidance-toolbar">
            {BLOCK_TYPES.map(bt => {
              const Icon = bt.icon
              return (
                <button
                  key={bt.type}
                  className="guidance-add-btn"
                  onClick={() => handleAdd(bt.type)}
                  disabled={uploading !== null}
                >
                  <Icon size={13} />
                  {uploading === bt.type ? 'Uploading...' : bt.label}
                </button>
              )
            })}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
            <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
        )}

        {/* Empty state with starter templates (planner) or simple message (read-only) */}
        {sorted.length === 0 && (
          canEdit ? (
            <div className="guidance-starters">
              <div className="guidance-starters-intro">
                Start building your couple's welcome packet. Click a section below to add it, or use the buttons to add your own.
              </div>
              <div className="guidance-starters-grid">
                {STARTER_TEMPLATES.map((tmpl, i) => {
                  const Icon = tmpl.icon
                  return (
                    <button
                      key={i}
                      className="guidance-starter-card"
                      onClick={() => handleAdd(tmpl.type, tmpl.content)}
                    >
                      <Icon size={18} style={{ color: 'var(--gold)' }} />
                      <div className="guidance-starter-title">{tmpl.title}</div>
                      <div className="guidance-starter-desc">{tmpl.desc}</div>
                    </button>
                  )
                })}
              </div>
              <div className="guidance-toolbar" style={{ justifyContent: 'center', marginTop: 24 }}>
                {BLOCK_TYPES.map(bt => {
                  const Icon = bt.icon
                  return (
                    <button
                      key={bt.type}
                      className="guidance-add-btn"
                      onClick={() => handleAdd(bt.type)}
                      disabled={uploading !== null}
                    >
                      <Icon size={13} />
                      {uploading === bt.type ? 'Uploading...' : bt.label}
                    </button>
                  )
                })}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
            </div>
          ) : (
            <div className="guidance-empty">
              Your planner hasn't added any guidance yet.
            </div>
          )
        )}

        {/* Block list */}
        {sorted.map((block, idx) => (
          <div key={block.id} className="guidance-block">
            {canEdit && (
              <div className="guidance-block-controls">
                <button
                  className="guidance-arrow-btn"
                  onClick={() => onReorderBlock(block.id, -1)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  className="guidance-arrow-btn"
                  onClick={() => onReorderBlock(block.id, 1)}
                  disabled={idx === sorted.length - 1}
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}

            <div className="guidance-block-content">
              <BlockRenderer
                block={block}
                canEdit={canEdit}
                onUpdate={(updates) => onUpdateBlock(block.id, { content: { ...block.content, ...updates } })}
              />

              {/* Inline delete confirmation */}
              {canEdit && confirmingDelete === block.id && (
                <div className="guidance-confirm-delete">
                  <span>Delete this block?</span>
                  <button className="guidance-confirm-yes" onClick={() => { onDeleteBlock(block.id); setConfirmingDelete(null) }}>
                    Yes, delete
                  </button>
                  <button className="guidance-confirm-cancel" onClick={() => setConfirmingDelete(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {canEdit && (
              <button
                className="guidance-delete-btn"
                onClick={() => handleDelete(block.id)}
                title="Delete block"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Block renderers ──────────────────────────────────────────────────────────

function BlockRenderer({ block, canEdit, onUpdate }) {
  if (block.type === 'header') return <HeaderBlock content={block.content} canEdit={canEdit} onUpdate={onUpdate} />
  if (block.type === 'text')   return <TextBlock content={block.content} canEdit={canEdit} onUpdate={onUpdate} />
  if (block.type === 'file')   return <FileBlock content={block.content} />
  if (block.type === 'image')  return <ImageBlock content={block.content} canEdit={canEdit} onUpdate={onUpdate} />
  return null
}

function HeaderBlock({ content, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content.title || '')

  if (canEdit && editing) {
    return (
      <input
        className="guidance-header-input"
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onUpdate({ title: draft }); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ title: draft }); setEditing(false) } }}
        autoFocus
      />
    )
  }

  return (
    <h2
      className="guidance-header"
      onClick={() => canEdit && setEditing(true)}
      title={canEdit ? 'Click to edit' : undefined}
      style={{ cursor: canEdit ? 'text' : 'default' }}
    >
      {content.title || 'Untitled Section'}
    </h2>
  )
}

function AutoTextarea({ value, onChange, onBlur, className, placeholder }) {
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
      onChange={e => { onChange(e); resize() }}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={1}
      autoFocus
    />
  )
}

function TextBlock({ content, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content.body || '')

  if (canEdit && editing) {
    return (
      <AutoTextarea
        className="guidance-text-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onUpdate({ body: draft }); setEditing(false) }}
        placeholder="Start writing..."
      />
    )
  }

  if (!content.body) {
    return (
      <div
        className="guidance-text guidance-text-placeholder"
        onClick={() => canEdit && setEditing(true)}
        style={{ cursor: canEdit ? 'text' : 'default' }}
      >
        {canEdit ? 'Click to start writing...' : ''}
      </div>
    )
  }

  return (
    <div
      className="guidance-text"
      onClick={() => canEdit && setEditing(true)}
      style={{ cursor: canEdit ? 'text' : 'default', whiteSpace: 'pre-wrap' }}
    >
      {content.body}
    </div>
  )
}

function FileBlock({ content }) {
  return (
    <div className="guidance-file-card">
      <FileText size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
      <span className="guidance-file-name">{content.file_name || 'Attached file'}</span>
      <a
        href={content.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="guidance-download-link"
        onClick={e => e.stopPropagation()}
      >
        <Download size={12} /> Download
      </a>
    </div>
  )
}

function ImageBlock({ content, canEdit, onUpdate }) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(content.caption || '')

  return (
    <div className="guidance-image-block">
      {content.image_url && (
        <img
          src={content.image_url}
          alt={content.caption || 'Guidance image'}
          className="guidance-image"
        />
      )}
      {canEdit && editingCaption ? (
        <input
          type="text"
          className="guidance-caption-input"
          value={captionDraft}
          onChange={e => setCaptionDraft(e.target.value)}
          onBlur={() => { onUpdate({ caption: captionDraft }); setEditingCaption(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ caption: captionDraft }); setEditingCaption(false) } }}
          placeholder="Add a caption..."
          autoFocus
        />
      ) : (
        <div
          className="guidance-caption"
          onClick={() => canEdit && setEditingCaption(true)}
          style={{ cursor: canEdit ? 'text' : 'default' }}
        >
          {content.caption || (canEdit ? 'Add a caption...' : '')}
        </div>
      )}
    </div>
  )
}
