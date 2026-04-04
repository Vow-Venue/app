import { useState } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #faf7f2;
    --blush: #e8c4b8;
    --rose: #c9847a;
    --gold: #b8975a;
    --gold-light: #d4b483;
    --deep: #3d2c2c;
    --muted: #8a7a72;
    --white: #ffffff;
    --border: rgba(184,151,90,0.25);
  }

  body {
    font-family: 'Jost', sans-serif;
    background: var(--cream);
    color: var(--deep);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .header {
    background: var(--deep);
    padding: 0 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    font-family: 'Cormorant Garamond', serif;
    font-size: 26px;
    font-weight: 300;
    color: var(--gold-light);
    letter-spacing: 3px;
    font-style: italic;
  }

  .logo span {
    color: var(--blush);
    font-style: normal;
    font-weight: 600;
  }

  .wedding-badge {
    background: rgba(184,151,90,0.15);
    border: 1px solid var(--border);
    color: var(--gold-light);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 500;
  }

  /* Tabs */
  .tabs {
    background: var(--white);
    border-bottom: 1px solid var(--border);
    display: flex;
    padding: 0 40px;
    gap: 0;
    overflow-x: auto;
  }

  .tab {
    padding: 16px 24px;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    font-family: 'Jost', sans-serif;
  }

  .tab.active {
    color: var(--gold);
    border-bottom-color: var(--gold);
  }

  .tab:hover:not(.active) {
    color: var(--deep);
  }

  /* Main */
  .main {
    flex: 1;
    padding: 40px;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
  }

  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 300;
    color: var(--deep);
    margin-bottom: 6px;
    font-style: italic;
  }

  .section-subtitle {
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 1px;
    margin-bottom: 32px;
  }

  /* Cards */
  .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px;
    margin-bottom: 16px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  /* Form inputs */
  .input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  input[type="text"], input[type="email"], select {
    font-family: 'Jost', sans-serif;
    font-size: 14px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--cream);
    color: var(--deep);
    outline: none;
    transition: border 0.2s;
    flex: 1;
    min-width: 150px;
  }

  input[type="text"]:focus, input[type="email"]:focus, select:focus {
    border-color: var(--gold);
  }

  .btn {
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 500;
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-primary {
    background: var(--deep);
    color: var(--gold-light);
  }

  .btn-primary:hover {
    background: #5a3e3e;
  }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }

  .btn-ghost:hover {
    border-color: var(--rose);
    color: var(--rose);
  }

  .btn-danger {
    background: transparent;
    border: none;
    color: #c9847a;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 6px;
  }

  /* Guest list */
  .guest-table {
    width: 100%;
    border-collapse: collapse;
  }

  .guest-table th {
    text-align: left;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted);
    font-weight: 500;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
  }

  .guest-table td {
    padding: 12px 16px;
    font-size: 14px;
    border-bottom: 1px solid rgba(184,151,90,0.1);
  }

  .guest-table tr:last-child td {
    border-bottom: none;
  }

  .rsvp-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1px;
  }

  .rsvp-yes { background: #e8f5e9; color: #2e7d32; }
  .rsvp-no { background: #fce4ec; color: #c62828; }
  .rsvp-pending { background: #fff8e1; color: #f57f17; }

  /* Tasks */
  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(184,151,90,0.1);
  }

  .task-item:last-child { border-bottom: none; }

  .task-check {
    width: 20px;
    height: 20px;
    border: 2px solid var(--gold);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .task-check.done {
    background: var(--gold);
    color: white;
  }

  .task-label {
    flex: 1;
    font-size: 14px;
  }

  .task-label.done {
    text-decoration: line-through;
    color: var(--muted);
  }

  .task-assignee {
    font-size: 12px;
    color: var(--muted);
    background: var(--cream);
    padding: 3px 10px;
    border-radius: 20px;
  }

  /* Vendors */
  .vendor-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 22px;
  }

  .vendor-role {
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--gold);
    font-weight: 500;
    margin-bottom: 6px;
  }

  .vendor-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .vendor-contact {
    font-size: 13px;
    color: var(--muted);
  }

  /* Collaborators */
  .collab-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(184,151,90,0.1);
  }

  .collab-item:last-child { border-bottom: none; }

  .avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--blush), var(--rose));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }

  .collab-info { flex: 1; }
  .collab-name { font-size: 15px; font-weight: 500; }
  .collab-role { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .access-badge {
    font-size: 11px;
    letter-spacing: 1px;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 500;
  }

  .access-full { background: #e8f5e9; color: #2e7d32; }
  .access-view { background: #e3f2fd; color: #1565c0; }

  /* Paywall */
  .paywall-card {
    background: linear-gradient(135deg, var(--deep) 0%, #5a3e3e 100%);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    margin-top: 24px;
  }

  .paywall-card h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 26px;
    font-weight: 300;
    color: var(--gold-light);
    margin-bottom: 10px;
    font-style: italic;
  }

  .paywall-card p {
    color: rgba(255,255,255,0.65);
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .btn-gold {
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
    color: var(--deep);
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    font-weight: 600;
    padding: 12px 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .stat-num {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 300;
    color: var(--gold);
    line-height: 1;
  }

  .stat-label {
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted);
    margin-top: 6px;
    font-weight: 500;
  }

  @media (max-width: 600px) {
    .main { padding: 20px; }
    .header { padding: 0 20px; }
    .tabs { padding: 0 20px; }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
  }
`;

const TABS = ["OVERVIEW", "GUESTS", "TASKS", "VENDORS", "TEAM"];

const initGuests = [
  { id: 1, name: "Emma & James Wilson", table: "Table 1", rsvp: "yes", email: "emma@example.com" },
  { id: 2, name: "Sarah Mitchell", table: "Table 2", rsvp: "pending", email: "sarah@example.com" },
  { id: 3, name: "Robert Chen", table: "Table 1", rsvp: "yes", email: "rchen@example.com" },
  { id: 4, name: "Linda Beaumont", table: "Table 3", rsvp: "no", email: "linda@example.com" },
];

const initTasks = [
  { id: 1, label: "Book the venue", done: true, assignee: "Bride" },
  { id: 2, label: "Send save-the-dates", done: true, assignee: "Planner" },
  { id: 3, label: "Confirm catering menu", done: false, assignee: "Groom" },
  { id: 4, label: "Final dress fitting", done: false, assignee: "Bride" },
  { id: 5, label: "Arrange rehearsal dinner", done: false, assignee: "Planner" },
  { id: 6, label: "Confirm DJ setlist", done: false, assignee: "DJ" },
];

const initVendors = [
  { id: 1, name: "Lumière Photography", role: "PHOTOGRAPHER", contact: "hello@lumiere.co" },
  { id: 2, name: "Blossom Florals", role: "FLORIST", contact: "orders@blossom.com" },
  { id: 3, name: "DJ Marcus B.", role: "ENTERTAINMENT", contact: "marcusb@djmix.com" },
];

const initCollabs = [
  { id: 1, name: "Olivia Hart", role: "Bride", access: "full" },
  { id: 2, name: "Ethan Hart", role: "Groom", access: "full" },
];

export default function WeddingPlanner() {
  const [tab, setTab] = useState("OVERVIEW");
  const [guests, setGuests] = useState(initGuests);
  const [tasks, setTasks] = useState(initTasks);
  const [vendors, setVendors] = useState(initVendors);
  const [collabs, setCollabs] = useState(initCollabs);

  const [guestName, setGuestName] = useState("");
  const [guestTable, setGuestTable] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [taskLabel, setTaskLabel] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [vendorName, setVendorName] = useState("");
  const [vendorRole, setVendorRole] = useState("");
  const [vendorContact, setVendorContact] = useState("");

  const [collabName, setCollabName] = useState("");
  const [collabRole, setCollabRole] = useState("");

  const addGuest = () => {
    if (!guestName) return;
    setGuests([...guests, { id: Date.now(), name: guestName, table: guestTable || "Unassigned", rsvp: "pending", email: guestEmail }]);
    setGuestName(""); setGuestTable(""); setGuestEmail("");
  };

  const addTask = () => {
    if (!taskLabel) return;
    setTasks([...tasks, { id: Date.now(), label: taskLabel, done: false, assignee: taskAssignee || "Unassigned" }]);
    setTaskLabel(""); setTaskAssignee("");
  };

  const addVendor = () => {
    if (!vendorName) return;
    setVendors([...vendors, { id: Date.now(), name: vendorName, role: vendorRole.toUpperCase() || "VENDOR", contact: vendorContact }]);
    setVendorName(""); setVendorRole(""); setVendorContact("");
  };

  const addCollab = () => {
    if (collabs.length >= 2) return;
    if (!collabName) return;
    setCollabs([...collabs, { id: Date.now(), name: collabName, role: collabRole || "Guest", access: "view" }]);
    setCollabName(""); setCollabRole("");
  };

  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeGuest = (id) => setGuests(guests.filter(g => g.id !== id));
  const removeVendor = (id) => setVendors(vendors.filter(v => v.id !== id));
  const removeTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  const doneTasks = tasks.filter(t => t.done).length;
  const yesGuests = guests.filter(g => g.rsvp === "yes").length;

  return (
    <>
      <style>{style}</style>
      <div className="app">
        <header className="header">
          <div className="logo"><span>✦</span> Amorí</div>
          <div className="wedding-badge">OLIVIA & ETHAN · JUNE 14, 2025</div>
        </header>

        <nav className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>

        <main className="main">
          {/* OVERVIEW */}
          {tab === "OVERVIEW" && (
            <div>
              <div className="section-title">Your Wedding at a Glance</div>
              <div className="section-subtitle">JUNE 14, 2025 · ROSEWOOD MANOR, SAVANNAH GA</div>

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-num">{guests.length}</div>
                  <div className="stat-label">GUESTS</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{yesGuests}</div>
                  <div className="stat-label">CONFIRMED</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{doneTasks}/{tasks.length}</div>
                  <div className="stat-label">TASKS DONE</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{vendors.length}</div>
                  <div className="stat-label">VENDORS</div>
                </div>
              </div>

              <div className="card-grid">
                <div className="card">
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 12, fontStyle: "italic" }}>Upcoming Tasks</div>
                  {tasks.filter(t => !t.done).slice(0, 3).map(t => (
                    <div key={t.id} className="task-item">
                      <div className="task-check" onClick={() => toggleTask(t.id)}>◦</div>
                      <div className="task-label">{t.label}</div>
                      <div className="task-assignee">{t.assignee}</div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setTab("TASKS")}>VIEW ALL TASKS</button>
                </div>
                <div className="card">
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, marginBottom: 12, fontStyle: "italic" }}>Recent RSVP's</div>
                  {guests.slice(0, 3).map(g => (
                    <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(184,151,90,0.1)" }}>
                      <div style={{ fontSize: 14 }}>{g.name}</div>
                      <span className={`rsvp-badge rsvp-${g.rsvp}`}>{g.rsvp.toUpperCase()}</span>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setTab("GUESTS")}>VIEW ALL GUESTS</button>
                </div>
              </div>
            </div>
          )}

          {/* GUESTS */}
          {tab === "GUESTS" && (
            <div>
              <div className="section-title">Guest List</div>
              <div className="section-subtitle">{guests.length} GUESTS · {yesGuests} CONFIRMED</div>

              <div className="card">
                <div className="input-row">
                  <input type="text" placeholder="Guest name" value={guestName} onChange={e => setGuestName(e.target.value)} />
                  <input type="email" placeholder="Email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                  <input type="text" placeholder="Table (e.g. Table 1)" value={guestTable} onChange={e => setGuestTable(e.target.value)} />
                  <button className="btn btn-primary" onClick={addGuest}>ADD GUEST</button>
                </div>

                <table className="guest-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>EMAIL</th>
                      <th>TABLE</th>
                      <th>RSVP</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map(g => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 500 }}>{g.name}</td>
                        <td style={{ color: "var(--muted)" }}>{g.email}</td>
                        <td>{g.table}</td>
                        <td><span className={`rsvp-badge rsvp-${g.rsvp}`}>{g.rsvp.toUpperCase()}</span></td>
                        <td><button className="btn-danger" onClick={() => removeGuest(g.id)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TASKS */}
          {tab === "TASKS" && (
            <div>
              <div className="section-title">Tasks & Checklist</div>
              <div className="section-subtitle">{doneTasks} OF {tasks.length} COMPLETE</div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="input-row">
                  <input type="text" placeholder="New task" value={taskLabel} onChange={e => setTaskLabel(e.target.value)} />
                  <input type="text" placeholder="Assign to" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} />
                  <button className="btn btn-primary" onClick={addTask}>ADD TASK</button>
                </div>
              </div>

              <div className="card">
                {tasks.map(t => (
                  <div key={t.id} className="task-item">
                    <div className={`task-check ${t.done ? "done" : ""}`} onClick={() => toggleTask(t.id)}>
                      {t.done ? "✓" : ""}
                    </div>
                    <div className={`task-label ${t.done ? "done" : ""}`}>{t.label}</div>
                    <div className="task-assignee">{t.assignee}</div>
                    <button className="btn-danger" onClick={() => removeTask(t.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VENDORS */}
          {tab === "VENDORS" && (
            <div>
              <div className="section-title">Vendor Hub</div>
              <div className="section-subtitle">{vendors.length} VENDORS HIRED</div>

              <div className="card" style={{ marginBottom: 24 }}>
                <div className="input-row">
                  <input type="text" placeholder="Vendor name" value={vendorName} onChange={e => setVendorName(e.target.value)} />
                  <input type="text" placeholder="Role (e.g. Florist)" value={vendorRole} onChange={e => setVendorRole(e.target.value)} />
                  <input type="email" placeholder="Contact email" value={vendorContact} onChange={e => setVendorContact(e.target.value)} />
                  <button className="btn btn-primary" onClick={addVendor}>ADD VENDOR</button>
                </div>
              </div>

              <div className="card-grid">
                {vendors.map(v => (
                  <div className="vendor-card" key={v.id}>
                    <div className="vendor-role">{v.role}</div>
                    <div className="vendor-name">{v.name}</div>
                    <div className="vendor-contact">{v.contact}</div>
                    <button className="btn-danger" style={{ marginTop: 12 }} onClick={() => removeVendor(v.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEAM */}
          {tab === "TEAM" && (
            <div>
              <div className="section-title">Your Team</div>
              <div className="section-subtitle">FREE PLAN · {collabs.length}/2 COLLABORATORS</div>

              <div className="card" style={{ marginBottom: 24 }}>
                {collabs.map(c => (
                  <div className="collab-item" key={c.id}>
                    <div className="avatar">{c.name.charAt(0)}</div>
                    <div className="collab-info">
                      <div className="collab-name">{c.name}</div>
                      <div className="collab-role">{c.role}</div>
                    </div>
                    <span className={`access-badge ${c.access === "full" ? "access-full" : "access-view"}`}>
                      {c.access === "full" ? "FULL ACCESS" : "VIEW ONLY"}
                    </span>
                  </div>
                ))}

                {collabs.length < 2 && (
                  <div style={{ marginTop: 20 }}>
                    <div className="input-row">
                      <input type="text" placeholder="Name" value={collabName} onChange={e => setCollabName(e.target.value)} />
                      <input type="text" placeholder="Role (e.g. Planner)" value={collabRole} onChange={e => setCollabRole(e.target.value)} />
                      <button className="btn btn-primary" onClick={addCollab}>INVITE</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="paywall-card">
                <h3>Invite Your Whole Wedding Village</h3>
                <p>
                  Upgrade to Pro to add unlimited collaborators — your wedding planner,<br />
                  photographer, DJ, both families, and anyone else who needs access.
                </p>
                <button className="btn-gold">UPGRADE TO PRO · $19/MO</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
