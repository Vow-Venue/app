import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { parseCSVRaw, findColumn, toCSV, downloadCSV } from '../lib/csv'
import { TEMPLATES } from '../lib/taskTemplates'

const BLANK_TASK = { title: '', dueDate: '', assignedTo: '', priority: 'medium', completed: false }

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const gcalUrl = (title, dateStr) => {
  if (!dateStr) return null
  const d = dateStr.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${d}/${d}`,
    details: 'Wedding planning task — Vow & Venue',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

const TASK_CSV_COLUMNS = [
  { key: 'title',      label: 'Title' },
  { key: 'dueDate',    label: 'Due Date' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'priority',   label: 'Priority' },
  { key: 'status',     label: 'Status' },
]

function parseTaskCSV(text) {
  const { headers, rows } = parseCSVRaw(text)
  if (!headers.length) return []

  return rows.map(row => {
    const rawPriority = findColumn(headers, row, 'priority', 'urgency', 'importance').toLowerCase()
    const priority = ['high', 'urgent', 'critical'].includes(rawPriority) ? 'high'
                   : ['low', 'optional', 'nice to have'].includes(rawPriority) ? 'low'
                   : 'medium'

    const rawStatus = findColumn(headers, row, 'status', 'completed', 'done', 'complete').toLowerCase()
    const completed = ['yes', 'done', 'completed', 'true', '1', 'x'].includes(rawStatus)

    // Try to parse due date in multiple formats
    const rawDate = findColumn(headers, row, 'due date', 'due', 'date', 'deadline')
    let dueDate = ''
    if (rawDate) {
      const d = new Date(rawDate)
      if (!isNaN(d.getTime())) dueDate = d.toISOString().slice(0, 10)
    }

    return {
      title:      findColumn(headers, row, 'title', 'task', 'name', 'description', 'to do', 'todo'),
      dueDate,
      assignedTo: findColumn(headers, row, 'assigned', 'assignee', 'owner', 'responsible', 'person'),
      priority,
      completed,
    }
  }).filter(t => t.title)
}

// ── Wedding checklist templates ────────────────────────────────────────────────
// TEMPLATES imported from '../lib/taskTemplates'

// ─────────────────────────────────────────────────────────────────────────────

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask, onImportTasks, canEdit = true }) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [form, setForm]                 = useState(BLANK_TASK)
  const [filter, setFilter]             = useState('all')
  const [tmplOpen, setTmplOpen]         = useState(false)
  const [tmplChecked, setTmplChecked]   = useState({})     // { 'period:title': true }
  const [expandedPeriod, setExpandedPeriod] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const fileInputRef                      = useRef(null)

  useEffect(() => {
    setForm(editingTask ?? BLANK_TASK)
  }, [editingTask, modalOpen])

  // Pre-check all tasks when template modal opens
  useEffect(() => {
    if (tmplOpen) {
      const all = {}
      const existingTitles = new Set(tasks.map(t => t.title.toLowerCase()))
      TEMPLATES.forEach(section => {
        section.tasks.forEach(task => {
          const key = `${section.period}:${task.title}`
          all[key] = !existingTitles.has(task.title.toLowerCase()) // uncheck if already exists
        })
      })
      setTmplChecked(all)
      setExpandedPeriod(TEMPLATES[0].period)
    }
  }, [tmplOpen])

  const openAdd  = () => { setEditingTask(null); setModalOpen(true) }
  const openEdit = (t) => { setEditingTask(t); setModalOpen(true) }
  const close    = () => { setModalOpen(false); setEditingTask(null) }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingTask) {
      onUpdateTask(editingTask.id, form)
    } else {
      onAddTask(form)
    }
    close()
  }

  const toggleTmplTask = (key) =>
    setTmplChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleAllInPeriod = (period, tasksInPeriod) => {
    const keys = tasksInPeriod.map(t => `${period}:${t.title}`)
    const allChecked = keys.every(k => tmplChecked[k])
    setTmplChecked(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = !allChecked })
      return next
    })
  }

  const checkedCount = Object.values(tmplChecked).filter(Boolean).length

  const handleImportTemplate = () => {
    TEMPLATES.forEach(section => {
      section.tasks.forEach(task => {
        const key = `${section.period}:${task.title}`
        if (tmplChecked[key]) {
          onAddTask({ title: task.title, priority: task.priority, dueDate: '', assignedTo: '', completed: false })
        }
      })
    })
    setTmplOpen(false)
  }

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportPreview({ tasks: parseTaskCSV(ev.target.result) })
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importPreview?.tasks?.length) return
    if (onImportTasks) await onImportTasks(importPreview.tasks)
    setImportPreview(null)
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = tasks.map(t => ({
      ...t,
      status: t.completed ? 'Completed' : 'Pending',
    }))
    downloadCSV('tasks.csv', toCSV(TASK_CSV_COLUMNS, data))
  }

  const total     = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100)

  const filtered = tasks.filter(t => {
    if (filter === 'pending')   return !t.completed
    if (filter === 'completed') return t.completed
    return true
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const pOrder = { high: 0, medium: 1, low: 2 }
    return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1)
  })

  return (
    <div>
      <div className="section-title">Tasks &amp; Checklist</div>
      <div className="section-subtitle">
        {total === 0 ? 'NO TASKS YET' : `${completed} OF ${total} COMPLETE`}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="progress-wrap">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-label">{pct}% complete — {completed} of {total} tasks done</div>
        </div>
      )}

      {/* Filters + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="chip-row" style={{ margin: 0 }}>
          {['all', 'pending', 'completed'].map(f => (
            <button
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handleExport}>
            ↓ EXPORT CSV
          </button>
          {canEdit && (
            <>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => fileInputRef.current?.click()}>
                ↑ IMPORT CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11 }}
                onClick={() => setTmplOpen(true)}
              >
                LOAD TEMPLATES
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                + ADD TASK
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: '16px 0' }}>
            {total === 0
              ? 'No tasks yet — try loading the wedding checklist templates.'
              : 'No tasks here.'}
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className="task-item">
            <div
              className={`task-check ${t.completed ? 'done' : ''}`}
              onClick={canEdit ? () => onUpdateTask(t.id, { completed: !t.completed }) : undefined}
              title={canEdit ? 'Toggle complete' : ''}
              style={canEdit ? undefined : { cursor: 'default' }}
            >
              {t.completed ? '✓' : ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`task-label ${t.completed ? 'done' : ''}`}>{t.title}</div>
              {t.dueDate && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Due {fmtDate(t.dueDate)}
                </div>
              )}
            </div>
            <span className={`badge priority-${t.priority}`}>{t.priority.toUpperCase()}</span>
            <div className="task-assignee">{t.assignedTo || 'Unassigned'}</div>
            {t.dueDate && (
              <a
                className="btn-icon btn-gcal"
                href={gcalUrl(t.title, t.dueDate)}
                target="_blank"
                rel="noopener noreferrer"
                title="Add to Google Calendar"
              >
                +Cal
              </a>
            )}
            {canEdit && <button className="btn-icon" onClick={() => openEdit(t)}>Edit</button>}
            {canEdit && <button className="btn-danger" onClick={() => onDeleteTask(t.id)}>×</button>}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={close} title={editingTask ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>TASK TITLE *</label>
            <input name="title" type="text" value={form.title} onChange={handleChange} required placeholder="e.g. Confirm florist" autoFocus />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>DUE DATE</label>
              <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>PRIORITY</label>
              <select name="priority" value={form.priority} onChange={handleChange}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>ASSIGNED TO</label>
            <input name="assignedTo" type="text" value={form.assignedTo} onChange={handleChange} placeholder="e.g. Olivia, Planner" />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              name="completed" type="checkbox" id="task-completed"
              checked={form.completed} onChange={handleChange}
              style={{ width: 'auto', flex: 'none' }}
            />
            <label htmlFor="task-completed" style={{ margin: 0, cursor: 'pointer' }}>Mark as completed</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>CANCEL</button>
            <button type="submit" className="btn btn-primary">
              {editingTask ? 'SAVE CHANGES' : 'ADD TASK'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Preview Modal */}
      <Modal isOpen={!!importPreview} onClose={() => setImportPreview(null)} title="Import Tasks from CSV">
        {importPreview && (
          <div>
            {importPreview.tasks.length === 0 ? (
              <div>
                <p style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0 8px' }}>
                  No valid tasks found in this file.
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
                  Make sure your CSV has a <strong>Title</strong> column in the first row.<br />
                  Other supported columns: Due Date, Priority, Assigned To, Status.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  Found <strong>{importPreview.tasks.length} task{importPreview.tasks.length !== 1 ? 's' : ''}</strong> ready to import:
                </p>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  {importPreview.tasks.slice(0, 6).map((t, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderBottom: i < Math.min(5, importPreview.tasks.length - 1) ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'center', fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 500, flex: 1 }}>{t.title}</span>
                      <span className={`badge priority-${t.priority}`} style={{ fontSize: 10 }}>{t.priority.toUpperCase()}</span>
                      {t.dueDate && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmtDate(t.dueDate)}</span>}
                      {t.completed && <span style={{ color: '#2e7d32', fontSize: 10, fontWeight: 600 }}>DONE</span>}
                    </div>
                  ))}
                  {importPreview.tasks.length > 6 && (
                    <div style={{ padding: '7px 12px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
                      + {importPreview.tasks.length - 6} more...
                    </div>
                  )}
                </div>
                <div style={{
                  background: 'rgba(184,151,90,0.07)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px', fontSize: 11,
                  color: 'var(--muted)', lineHeight: 1.6, marginBottom: 4,
                }}>
                  <strong>CSV column headers recognised:</strong> Title, Due Date, Priority (high/medium/low), Assigned To, Status (done/pending).
                </div>
              </>
            )}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>CANCEL</button>
              {importPreview.tasks.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  IMPORT {importPreview.tasks.length} TASK{importPreview.tasks.length !== 1 ? 'S' : ''}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Template Modal */}
      <Modal isOpen={tmplOpen} onClose={() => setTmplOpen(false)} title="Wedding Checklist Templates">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Select tasks to add to your checklist. Already-added tasks are unchecked by default.
        </p>

        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
          {TEMPLATES.map((section, si) => {
            const isOpen = expandedPeriod === section.period
            const keys = section.tasks.map(t => `${section.period}:${t.title}`)
            const allChecked = keys.every(k => tmplChecked[k])
            const someChecked = keys.some(k => tmplChecked[k])
            const checkedInSection = keys.filter(k => tmplChecked[k]).length

            return (
              <div key={section.period} style={{ borderBottom: si < TEMPLATES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {/* Section header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', cursor: 'pointer',
                    background: isOpen ? 'rgba(184,151,90,0.06)' : 'transparent',
                  }}
                  onClick={() => setExpandedPeriod(isOpen ? null : section.period)}
                >
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                    onChange={() => toggleAllInPeriod(section.period, section.tasks)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 'auto', flex: 'none', margin: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, letterSpacing: 1, color: 'var(--deep)' }}>
                    {section.period}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {checkedInSection}/{section.tasks.length}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', userSelect: 'none' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* Task list */}
                {isOpen && section.tasks.map(task => {
                  const key = `${section.period}:${task.title}`
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px 8px 30px',
                        borderTop: '1px solid rgba(61,44,44,0.05)',
                        cursor: 'pointer', fontSize: 13, color: 'var(--deep)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!tmplChecked[key]}
                        onChange={() => toggleTmplTask(key)}
                        style={{ width: 'auto', flex: 'none', margin: 0 }}
                      />
                      <span style={{ flex: 1 }}>{task.title}</span>
                      <span className={`badge priority-${task.priority}`} style={{ fontSize: 9 }}>
                        {task.priority.toUpperCase()}
                      </span>
                    </label>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => setTmplOpen(false)}>CANCEL</button>
          <button
            className="btn btn-primary"
            onClick={handleImportTemplate}
            disabled={checkedCount === 0}
          >
            ADD {checkedCount} TASK{checkedCount !== 1 ? 'S' : ''}
          </button>
        </div>
      </Modal>
    </div>
  )
}
