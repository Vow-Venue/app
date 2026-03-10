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
    title: 'Welcome Message',
    icon: Heading,
    desc: 'Greet your couple and set the tone for the planning journey.',
    blocks: [
      { type: 'header', content: { title: 'Welcome Message' } },
      { type: 'text', content: { body: '' } },
    ],
  },
  {
    title: 'Planning Process',
    icon: Type,
    desc: 'Outline your planning process, communication style, and key milestones.',
    blocks: [
      { type: 'header', content: { title: 'Planning Process' } },
      { type: 'text', content: { body: '' } },
    ],
  },
  {
    title: 'Packing List',
    icon: FileText,
    desc: 'Help your couple prepare with a detailed packing checklist.',
    blocks: [
      { type: 'header', content: { title: 'Packing List' } },
      { type: 'text', content: { body: '' } },
    ],
  },
]

// ── Auto-expanding textarea ─────────────────────────────────────────────────

function AutoTextarea({ value, onChange, onBlur, className, placeholder, autoFocus }) {
  const ref = useRef(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={e => { onChange(e.target.value); resize() }}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={4}
    />
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Guidance({
  blocks, onAddBlock, onUpdateBlock, onDeleteBlock, onReorderBlock, onUploadFile, canEdit = false,
}) {
  const [uploading, setUploading] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [newBlockId, setNewBlockId] = useState(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)
  const bottomRef = useRef(null)

  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)

  // Scroll to newly added block
  useEffect(() => {
    if (newBlockId) {
      const el = document.getElementById(`gb-${newBlockId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = el.querySelector('input, textarea')
        if (input) setTimeout(() => input.focus(), 150)
      }
      setNewBlockId(null)
    }
  }, [newBlockId, blocks])

  const handleAdd = async (type, content) => {
    if (type === 'file') {
      fileRef.current?.click()
      return
    }
    if (type === 'image') {
      imageRef.current?.click()
      return
    }
    const result = await onAddBlock(type, content || (type === 'header' ? { title: '' } : { body: '' }))
    if (result?.id) setNewBlockId(result.id)
  }

  const handleStarterClick = async (template) => {
    for (const b of template.blocks) {
      await onAddBlock(b.type, b.content)
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading('file')
    const url = await onUploadFile(file)
    if (url) {
      const result = await onAddBlock('file', { file_url: url, file_name: file.name })
      if (result?.id) setNewBlockId(result.id)
    }
    setUploading(null)
    e.target.value = ''
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading('image')
    const url = await onUploadFile(file)
    if (url) {
      const result = await onAddBlock('image', { image_url: url, caption: '' })
      if (result?.id) setNewBlockId(result.id)
    }
    setUploading(null)
    e.target.value = ''
  }

  return (
    <div>
      <div className="section-title">Guidance</div>
      <div className="section-subtitle">
        {sorted.length === 0 ? 'WELCOME PACKET' : `${sorted.length} BLOCK${sorted.length !== 1 ? 'S' : ''}`}
      </div>

      <div className="guidance-doc">

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {sorted.length === 0 && (
          canEdit ? (
            <div className="guidance-empty-state">
              <div className="guidance-empty-title">Build your welcome packet</div>
              <div className="guidance-empty-desc">
                Choose a template to get started, or add blocks manually.
              </div>
              <div className="guidance-starters-grid">
                {STARTER_TEMPLATES.map((tmpl, i) => {
                  const Icon = tmpl.icon
                  return (
                    <button key={i} className="guidance-starter-card" onClick={() => handleStarterClick(tmpl)}>
                      <Icon size={20} className="guidance-starter-icon" />
                      <div className="guidance-starter-title">{tmpl.title}</div>
                      <div className="guidance-starter-desc">{tmpl.desc}</div>
                    </button>
                  )
                })}
              </div>
              <div className="guidance-toolbar">
                {BLOCK_TYPES.map(bt => {
                  const Icon = bt.icon
                  return (
                    <button key={bt.type} className="guidance-pill-btn" onClick={() => handleAdd(bt.type)} disabled={uploading !== null}>
                      <Icon size={13} />
                      {uploading === bt.type ? 'Uploading...' : bt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="guidance-empty-readonly">
              Your planner hasn't added any guidance yet.
            </div>
          )
        )}

        {/* ── Block list ───────────────────────────────────────────────────── */}
        {sorted.map((block, idx) => (
          <div key={block.id} id={`gb-${block.id}`} className="guidance-block">
            <div className="guidance-block-content">
              <BlockRenderer
                block={block}
                canEdit={canEdit}
                onUpdate={(updates) => onUpdateBlock(block.id, { content: { ...block.content, ...updates } })}
              />

              {/* Inline delete confirmation */}
              {canEdit && confirmingDelete === block.id && (
                <div className="guidance-confirm-bar">
                  <span>Delete this block?</span>
                  <button className="guidance-confirm-yes" onClick={() => { onDeleteBlock(block.id); setConfirmingDelete(null) }}>
                    Yes
                  </button>
                  <button className="guidance-confirm-no" onClick={() => setConfirmingDelete(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Side controls */}
            {canEdit && (
              <div className="guidance-side-controls">
                <button className="guidance-side-btn" onClick={() => onReorderBlock(block.id, -1)} disabled={idx === 0} title="Move up">
                  <ChevronUp size={14} />
                </button>
                <button className="guidance-side-btn" onClick={() => onReorderBlock(block.id, 1)} disabled={idx === sorted.length - 1} title="Move down">
                  <ChevronDown size={14} />
                </button>
                <button
                  className="guidance-side-btn guidance-side-delete"
                  onClick={() => setConfirmingDelete(confirmingDelete === block.id ? null : block.id)}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* ── Add block toolbar at bottom ───────────────────────────────────── */}
        {canEdit && sorted.length > 0 && (
          <div className="guidance-toolbar">
            {BLOCK_TYPES.map(bt => {
              const Icon = bt.icon
              return (
                <button key={bt.type} className="guidance-pill-btn" onClick={() => handleAdd(bt.type)} disabled={uploading !== null}>
                  <Icon size={13} />
                  {uploading === bt.type ? 'Uploading...' : bt.label}
                </button>
              )
            })}
          </div>
        )}

        <div ref={bottomRef} />

        {/* Hidden file inputs */}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
        <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
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
  const [editing, setEditing] = useState(!content.title && canEdit)
  const [draft, setDraft] = useState(content.title || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const save = () => {
    onUpdate({ title: draft })
    setEditing(false)
  }

  if (canEdit && editing) {
    return (
      <input
        ref={inputRef}
        className="guidance-h2-input"
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save() }}
        placeholder="Section title..."
      />
    )
  }

  return (
    <h2
      className="guidance-h2"
      onClick={() => canEdit && setEditing(true)}
      style={{ cursor: canEdit ? 'text' : 'default' }}
    >
      {content.title || 'Untitled Section'}
    </h2>
  )
}

function TextBlock({ content, canEdit, onUpdate }) {
  const [editing, setEditing] = useState(!content.body && canEdit)
  const [draft, setDraft] = useState(content.body || '')

  const save = () => {
    onUpdate({ body: draft })
    setEditing(false)
  }

  if (canEdit && editing) {
    return (
      <AutoTextarea
        className="guidance-textarea"
        value={draft}
        onChange={setDraft}
        onBlur={save}
        placeholder="Start writing..."
        autoFocus
      />
    )
  }

  if (!content.body) {
    return (
      <div
        className="guidance-text-empty"
        onClick={() => canEdit && setEditing(true)}
        style={{ cursor: canEdit ? 'text' : 'default' }}
      >
        {canEdit ? 'Start writing...' : ''}
      </div>
    )
  }

  return (
    <div
      className="guidance-text"
      onClick={() => canEdit && setEditing(true)}
      style={{ cursor: canEdit ? 'text' : 'default' }}
    >
      {content.body}
    </div>
  )
}

function FileBlock({ content }) {
  return (
    <div className="guidance-file">
      <FileText size={20} className="guidance-file-icon" />
      <span className="guidance-file-name">{content.file_name || 'Attached file'}</span>
      <a
        href={content.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="guidance-file-dl"
        onClick={e => e.stopPropagation()}
      >
        <Download size={13} /> Download
      </a>
    </div>
  )
}

function ImageBlock({ content, canEdit, onUpdate }) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(content.caption || '')

  const saveCaption = () => {
    onUpdate({ caption: captionDraft })
    setEditingCaption(false)
  }

  return (
    <div className="guidance-image-wrap">
      {content.image_url && (
        <img
          src={content.image_url}
          alt={content.caption || 'Guidance image'}
          className="guidance-img"
        />
      )}
      {canEdit && editingCaption ? (
        <input
          type="text"
          className="guidance-caption-input"
          value={captionDraft}
          onChange={e => setCaptionDraft(e.target.value)}
          onBlur={saveCaption}
          onKeyDown={e => { if (e.key === 'Enter') saveCaption() }}
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
