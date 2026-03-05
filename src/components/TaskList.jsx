import { useState, useEffect } from 'react'
import Modal from './Modal'

const BLANK_TASK = { title: '', dueDate: '', assignedTo: '', priority: 'medium', completed: false }

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Wedding checklist templates ────────────────────────────────────────────────
const TEMPLATES = [
  {
    period: '12+ Months Before',
    tasks: [
      { title: 'Set a wedding date',                        priority: 'high'   },
      { title: 'Establish your overall budget',             priority: 'high'   },
      { title: 'Create the initial guest list',             priority: 'high'   },
      { title: 'Book your ceremony venue',                  priority: 'high'   },
      { title: 'Book your reception venue',                 priority: 'high'   },
      { title: 'Consider hiring a wedding planner',         priority: 'medium' },
      { title: 'Research and shortlist photographers',      priority: 'medium' },
      { title: 'Announce engagement to family & friends',   priority: 'low'    },
    ],
  },
  {
    period: '9–12 Months Before',
    tasks: [
      { title: 'Book photographer & videographer',          priority: 'high'   },
      { title: 'Book caterer',                              priority: 'high'   },
      { title: 'Book officiant',                            priority: 'high'   },
      { title: 'Book live music or DJ',                     priority: 'high'   },
      { title: 'Send save-the-date cards',                  priority: 'high'   },
      { title: 'Start wedding dress / suit shopping',       priority: 'medium' },
      { title: 'Choose your wedding party',                 priority: 'medium' },
      { title: 'Book honeymoon travel',                     priority: 'medium' },
    ],
  },
  {
    period: '6–9 Months Before',
    tasks: [
      { title: 'Order wedding dress / suit',                priority: 'high'   },
      { title: 'Book florist',                              priority: 'high'   },
      { title: 'Book hair & makeup artist',                 priority: 'high'   },
      { title: 'Create wedding website',                    priority: 'medium' },
      { title: 'Build gift registry',                       priority: 'medium' },
      { title: 'Order bridesmaid dresses',                  priority: 'medium' },
      { title: 'Plan rehearsal dinner',                     priority: 'medium' },
      { title: 'Book hotel room block for guests',          priority: 'low'    },
    ],
  },
  {
    period: '3–6 Months Before',
    tasks: [
      { title: 'Send wedding invitations',                  priority: 'high'   },
      { title: 'Apply for marriage license',                priority: 'high'   },
      { title: 'Purchase wedding rings',                    priority: 'high'   },
      { title: 'Finalize catering menu & headcount',        priority: 'high'   },
      { title: 'Book wedding cake / desserts',              priority: 'high'   },
      { title: 'Plan ceremony program & readings',          priority: 'medium' },
      { title: 'Arrange guest transportation',              priority: 'medium' },
      { title: 'Start seating chart',                       priority: 'medium' },
    ],
  },
  {
    period: '1–3 Months Before',
    tasks: [
      { title: 'Final dress / suit fitting',                priority: 'high'   },
      { title: 'Confirm all vendors with final timeline',   priority: 'high'   },
      { title: 'Finalize seating chart',                    priority: 'high'   },
      { title: 'Write personal vows',                       priority: 'high'   },
      { title: 'Create detailed wedding day timeline',      priority: 'high'   },
      { title: 'Prepare final vendor payments',             priority: 'high'   },
      { title: 'Prepare cash tips for vendors',             priority: 'medium' },
      { title: 'Confirm rehearsal dinner details',          priority: 'medium' },
    ],
  },
  {
    period: 'Week Of',
    tasks: [
      { title: 'Confirm final headcount with caterer',      priority: 'high'   },
      { title: 'Pick up wedding dress / suit',              priority: 'high'   },
      { title: 'Attend wedding rehearsal',                  priority: 'high'   },
      { title: 'Distribute day-of timeline to wedding party', priority: 'high' },
      { title: 'Deliver decor & favors to venue',           priority: 'medium' },
      { title: 'Prepare wedding day emergency kit',         priority: 'medium' },
      { title: 'Pack honeymoon bags',                       priority: 'medium' },
      { title: 'Get a full night\'s sleep',                 priority: 'low'    },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask }) {
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [form, setForm]                 = useState(BLANK_TASK)
  const [filter, setFilter]             = useState('all')
  const [tmplOpen, setTmplOpen]         = useState(false)
  const [tmplChecked, setTmplChecked]   = useState({})     // { 'period:title': true }
  const [expandedPeriod, setExpandedPeriod] = useState(null)

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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
              onClick={() => onUpdateTask(t.id, { completed: !t.completed })}
              title="Toggle complete"
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
            <button className="btn-icon" onClick={() => openEdit(t)}>Edit</button>
            <button className="btn-danger" onClick={() => onDeleteTask(t.id)}>×</button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
