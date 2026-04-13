import Modal from './Modal'

export default function UpgradeLimitModal({ isOpen, onClose, onUpgrade }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="You've reached your free plan limit"
      className="upgrade-limit-modal"
    >
      <div style={{ padding: '4px 24px 28px', textAlign: 'center' }}>
        <p className="upgrade-limit-subtext">
          Free planners can manage up to 2 weddings. Upgrade to Pro for
          unlimited weddings and full access to every feature.
        </p>

        <div className="upgrade-limit-comparison">
          <div className="plan-col plan-free">
            <h4>Free</h4>
            <ul>
              <li>2 weddings</li>
              <li>All planning features</li>
              <li>Unlimited collaborators (always free)</li>
            </ul>
          </div>
          <div className="plan-col plan-pro">
            <h4>Pro</h4>
            <ul>
              <li>Unlimited weddings</li>
              <li>All planning features</li>
              <li>Unlimited collaborators (always free)</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>

        <p className="upgrade-limit-note">
          Collaborators (couples, vendors, family) are always free and never need a seat.
        </p>

        <button
          className="btn btn-gold"
          style={{ width: '100%', padding: '14px 24px', fontSize: 13, letterSpacing: 1 }}
          onClick={onUpgrade}
        >
          UPGRADE TO PRO · $39/MO
        </button>

        <button className="upgrade-limit-dismiss" onClick={onClose}>
          Maybe Later
        </button>
      </div>
    </Modal>
  )
}
