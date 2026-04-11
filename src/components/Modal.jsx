export default function Modal({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null

  return (
    <div className={`modal-backdrop ${className}`} onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
