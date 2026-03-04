import { useState, useEffect } from 'react'
import Modal from './Modal'

const BLANK_TASK = { title: '', dueDate: '', assignedTo: '', priority: 'medium', completed: false }

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask }) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm]               = useState(BLANK_TASK)
  const [filter, setFilter]           = useState('all')

  useEffect(() => {
    setForm(editingTask ?? BLANK_TASK)
  }, [editingTask, modalOpen])

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

      {/* Progress */}
      {total > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="progress-wrap">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-label">{pct}% complete — {completed} of {total} tasks done</div>
        </div>
      )}

      {/* Filters + Add */}
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
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
          + ADD TASK
        </button>
      </div>

      {/* Task list */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', padding: '16px 0' }}>
            No tasks here.
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

            <span className={`badge priority-${t.priority}`}>
              {t.priority.toUpperCase()}
            </span>

            <div className="task-assignee">{t.assignedTo || 'Unassigned'}</div>

            <button className="btn-icon" onClick={() => openEdit(t)}>Edit</button>
            <button className="btn-danger" onClick={() => onDeleteTask(t.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={close} title={editingTask ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>TASK TITLE *</label>
            <input name="title" type="text" value={form.title} onChange={handleChange} required placeholder="e.g. Confirm florist" />
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
              name="completed"
              type="checkbox"
              id="task-completed"
              checked={form.completed}
              onChange={handleChange}
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
    </div>
  )
}
