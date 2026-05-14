import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './PendingTickets.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 320 } },
  exit: { opacity: 0, scale: 0.92, y: 30, transition: { duration: 0.18 } },
};

const typeColors = {
  Eway: { color: '#7c3aed', bg: '#ede9fe' },
  StockError: { color: '#dc2626', bg: '#fee2e2' },
  EInvoice: { color: '#0284c7', bg: '#e0f2fe' },
  ReportError: { color: '#d97706', bg: '#fef3c7' },
};

function getTypeStyle(type) {
  return typeColors[type] || { color: '#6b7280', bg: '#f3f4f6' };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const defaultAssignForm = {
  employeeId: '',
  tlId: '',
  priority: 'High',
  tlRemarks: '',
};

export default function PendingTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 1024);
  const [toast, setToast] = useState(null);

  // Assign Modal state
  const [assignModalTicket, setAssignModalTicket] = useState(null);
  const [assignForm, setAssignForm] = useState(defaultAssignForm);
  const [isConfirming, setIsConfirming] = useState(false);

  const navItems = [
    { name: 'Home', icon: 'fa-house', href: '/home' },
    { name: 'Agent Status', icon: 'fa-user-group', href: '/agent-status' },
    { name: 'Pending Tickets', icon: 'fa-ticket', href: '/pending-tickets', active: true },
  ];

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/unniService.asmx/loadRaisedSupportTicketsForTL?InternalEmployeeID=82&InternalEntryFromID=11`
      );
      const text = await res.text();
      const match = text.match(/<string[^>]*>(.*)<\/string>/s);
      const jsonStr = match ? match[1] : text;
      const data = JSON.parse(jsonStr);
      setTickets(data.SupportTickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError('Failed to load tickets. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open modal
  const openAssignModal = (ticket) => {
    setAssignForm(defaultAssignForm);
    setAssignModalTicket(ticket);
  };

  // Close modal
  const closeAssignModal = () => {
    if (isConfirming) return;
    setAssignModalTicket(null);
  };

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setAssignForm(prev => ({ ...prev, [name]: value }));
  };

  // Priority label → numeric value
  const priorityMap = { High: 1, Med: 2, Low: 3 };

  // Confirm assignment — calls SaveSupportTicketAssigningByTL API
  const handleConfirm = async () => {
    if (!assignForm.employeeId.trim() || !assignForm.tlId.trim()) {
      showToast('⚠️ Please fill in Employee ID and TL ID.');
      return;
    }
    setIsConfirming(true);
    try {
      const params = new URLSearchParams({
        InternalTicketID: assignModalTicket.InternalTicketID,
        AssignedTo: assignForm.employeeId.trim(),
        AssignedBy: assignForm.tlId.trim(),
        Priority: priorityMap[assignForm.priority] ?? 1,
        TLRemarks: assignForm.tlRemarks.trim(),
      });

      const res = await fetch(
        `${API_BASE}/unniService.asmx/SaveSupportTicketAssigningByTL?${params.toString()}`
      );
      const text = await res.text();

      // Parse JSON from XML <string> wrapper
      const match = text.match(/<string[^>]*>(.*)<\/string>/s);
      const jsonStr = match ? match[1] : text;

      let result = null;
      try { result = JSON.parse(jsonStr); } catch { result = { message: jsonStr }; }

      if (!res.ok) {
        throw new Error(result?.message || `Server error: ${res.status}`);
      }

      // Mark as assigned locally
      setAssignedIds(prev => new Set(prev).add(assignModalTicket.InternalTicketID));
      setAssignModalTicket(null);
      showToast(`✅ Ticket #${assignModalTicket.TicketNo} assigned successfully!`);
    } catch (err) {
      console.error('Assign failed:', err);
      showToast(`❌ Failed to assign: ${err.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.TicketNo?.toLowerCase().includes(q) ||
      t.UserName?.toLowerCase().includes(q) ||
      t.BranchName?.toLowerCase().includes(q) ||
      t.Phone?.toLowerCase().includes(q) ||
      t.Type?.toLowerCase().includes(q) ||
      t.Remarks?.toLowerCase().includes(q);

    const isAssigned = t.CallStatus === '1' || assignedIds.has(t.InternalTicketID);
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'assigned' && isAssigned) ||
      (filterStatus === 'unassigned' && !isAssigned);

    return matchesSearch && matchesFilter;
  });

  const totalCount = tickets.length;
  const assignedCount = tickets.filter(t => t.CallStatus === '1' || assignedIds.has(t.InternalTicketID)).length;
  const pendingCount = tickets.filter(t => t.CallStatus === '0' && !assignedIds.has(t.InternalTicketID)).length;

  return (
    <div className={`pt-container ${isSidebarCollapsed ? 'pt-sidebar-collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className={`pt-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="pt-sidebar-logo">
          <div className="pt-logo-icon"><i className="fa-solid fa-headset"></i></div>
          {!isSidebarCollapsed && <span className="pt-logo-text">Inpack</span>}
          <button className="pt-sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <nav className="pt-nav-links">
          {navItems.map((item) => (
            <a key={item.name} href={item.href}
              className={`pt-nav-item ${item.active ? 'active' : ''}`}
              title={isSidebarCollapsed ? item.name : ''}
              style={{ textDecoration: 'none' }}>
              <i className={`fa-solid ${item.icon}`}></i>
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </a>
          ))}
        </nav>

        <div className="pt-sidebar-footer">
          <a href="/home" className="pt-nav-item" style={{ textDecoration: 'none' }}>
            <i className="fa-solid fa-right-from-bracket"></i>
            {!isSidebarCollapsed && <span>Logout</span>}
          </a>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="pt-main">
        {/* Header */}
        <div className="pt-header">
          <div className="pt-header-left">
            <div className="pt-header-icon"><i className="fa-solid fa-ticket"></i></div>
            <div>
              <h1>Pending Tickets</h1>
              <p>Manage and assign support tickets raised by customers</p>
            </div>
          </div>
          <button className="pt-refresh-btn" onClick={fetchTickets} disabled={loading}>
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            {!loading ? 'Refresh' : 'Loading...'}
          </button>
        </div>

        {/* Stats */}
        <div className="pt-stats-row">
          <div className="pt-stat-card total">
            <i className="fa-solid fa-layer-group"></i>
            <div>
              <span className="pt-stat-num">{totalCount}</span>
              <span className="pt-stat-label">Total Tickets</span>
            </div>
          </div>
          <div className="pt-stat-card pending">
            <i className="fa-solid fa-hourglass-half"></i>
            <div>
              <span className="pt-stat-num">{pendingCount}</span>
              <span className="pt-stat-label">Unassigned</span>
            </div>
          </div>
          <div className="pt-stat-card assigned">
            <i className="fa-solid fa-user-check"></i>
            <div>
              <span className="pt-stat-num">{assignedCount}</span>
              <span className="pt-stat-label">Assigned</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pt-toolbar">
          <div className="pt-search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search by ticket no, name, branch, type..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button className="pt-clear-btn" onClick={() => setSearchQuery('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <div className="pt-filter-tabs">
            {['all', 'unassigned', 'assigned'].map((f) => (
              <button key={f} className={`pt-filter-tab ${filterStatus === f ? 'active' : ''}`}
                onClick={() => setFilterStatus(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="pt-loader">
            <div className="pt-spinner"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
            <p>Fetching tickets from server...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="pt-error-box">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong>Unable to load tickets</strong>
              <p>{error}</p>
            </div>
            <button onClick={fetchTickets}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="pt-empty">
            <i className="fa-solid fa-inbox"></i>
            <h3>No tickets found</h3>
            <p>{searchQuery ? 'Try a different search term.' : 'No tickets match the selected filter.'}</p>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && filtered.length > 0 && (
          <motion.div className="pt-cards-grid" variants={containerVariants} initial="hidden" animate="visible">
            {filtered.map((ticket) => {
              const isAssigned = ticket.CallStatus === '1' || assignedIds.has(ticket.InternalTicketID);
              const typeStyle = getTypeStyle(ticket.Type);

              return (
                <motion.div
                  key={ticket.InternalTicketID}
                  className={`pt-card ${isAssigned ? 'assigned' : 'pending'}`}
                  variants={cardVariants}
                  whileHover={{ y: -8 }}
                  layout
                >
                  <div className="pt-card-header">
                    <div className="pt-card-id-row">
                      <span className="pt-card-id">#{ticket.TicketNo}</span>
                      <span className="pt-card-type" style={{ color: typeStyle.color, background: typeStyle.bg }}>
                        {ticket.Type}
                      </span>
                    </div>
                    <div className={`pt-card-status ${isAssigned ? 'assigned' : 'pending'}`}>
                      <div className="pt-status-dot"></div>
                      {isAssigned ? 'Assigned' : 'Pending'}
                    </div>
                  </div>

                  <div className="pt-card-body">
                    <div className="pt-card-meta-grid">
                      <div className="pt-card-meta-item">
                        <i className="fa-solid fa-user"></i>
                        <div className="pt-meta-content">
                          <label>Raised By</label>
                          <span>{ticket.UserName || '—'}</span>
                        </div>
                      </div>
                      <div className="pt-card-meta-item">
                        <i className="fa-solid fa-building"></i>
                        <div className="pt-meta-content">
                          <label>Branch</label>
                          <span title={ticket.BranchName}>{ticket.BranchName}</span>
                        </div>
                      </div>
                      <div className="pt-card-meta-item">
                        <i className="fa-solid fa-phone"></i>
                        <div className="pt-meta-content">
                          <label>Contact</label>
                          <span>{ticket.Phone}</span>
                        </div>
                      </div>
                      <div className="pt-card-meta-item">
                        <i className="fa-solid fa-clock"></i>
                        <div className="pt-meta-content">
                          <label>Delay</label>
                          <span className={ticket.Delay ? 'pt-delay-warn' : ''}>{ticket.Delay || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {ticket.Remarks && (
                      <div className="pt-card-remarks">
                        <i className="fa-solid fa-quote-left"></i>
                        <p>{ticket.Remarks}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-card-footer">
                    <div className="pt-card-footer-top">
                      <div className="pt-card-date">
                        <i className="fa-regular fa-calendar-days"></i>
                        <span>{formatDate(ticket.CreationDate)}</span>
                      </div>
                      <div className="pt-card-serial-small">SN: {ticket.SerialNo}</div>
                    </div>

                    {isAssigned ? (
                      <div className="pt-card-assigned-pill">
                        <div className="pt-assigned-avatar">{ticket.AssignedTo?.charAt(0) || 'A'}</div>
                        <div className="pt-assigned-details">
                          <span>Assigned to</span>
                          <strong>{ticket.AssignedTo}</strong>
                        </div>
                      </div>
                    ) : (
                      <motion.button 
                        className="pt-card-assign-btn"
                        onClick={() => openAssignModal(ticket)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <i className="fa-solid fa-user-plus"></i>
                        <span>Assign Task</span>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Results */}
        {!loading && !error && filtered.length > 0 && (
          <div className="pt-results-label">
            Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> tickets
          </div>
        )}
      </main>

      {/* ── Mobile Nav ── */}
      <div className="pt-mobile-nav">
        {navItems.map((item) => (
          <a key={item.name} href={item.href}
            className={`pt-mobile-nav-item ${item.active ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}>
            <i className={`fa-solid ${item.icon}`}></i>
            <span>{item.name}</span>
          </a>
        ))}
      </div>

      {/* ── Assign Task Modal ── */}
      <AnimatePresence>
        {assignModalTicket && (
          <motion.div
            className="at-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAssignModal}
          >
            <motion.div
              className="at-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="at-header">
                <div className="at-header-icon">
                  <i className="fa-solid fa-paper-plane"></i>
                </div>
                <div className="at-header-text">
                  <h2>Assign Task</h2>
                  <p>Ticket #{assignModalTicket.TicketNo}</p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="at-body">

                {/* Employee ID */}
                <div className="at-field">
                  <label className="at-label">Employee ID</label>
                  <div className="at-input-wrap">
                    <i className="fa-solid fa-user-tie at-input-icon"></i>
                    <input
                      type="text"
                      name="employeeId"
                      value={assignForm.employeeId}
                      onChange={handleFormChange}
                      placeholder="Enter Employee ID"
                      className="at-input"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* TL ID */}
                <div className="at-field">
                  <label className="at-label">TL ID</label>
                  <div className="at-input-wrap">
                    <i className="fa-solid fa-shield-halved at-input-icon"></i>
                    <input
                      type="text"
                      name="tlId"
                      value={assignForm.tlId}
                      onChange={handleFormChange}
                      placeholder="Enter Your ID"
                      className="at-input"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Priority Level */}
                <div className="at-field">
                  <label className="at-label">Priority Level</label>
                  <div className="at-radio-group">
                    {['High', 'Med', 'Low'].map((level) => (
                      <label key={level} className={`at-radio-label ${assignForm.priority === level ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="priority"
                          value={level}
                          checked={assignForm.priority === level}
                          onChange={handleFormChange}
                          className="at-radio-input"
                        />
                        <span className={`at-radio-dot ${assignForm.priority === level ? 'active' : ''}`}></span>
                        <span className="at-radio-text">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* TL Remarks */}
                <div className="at-field">
                  <label className="at-label">TL Remarks</label>
                  <div className="at-textarea-wrap">
                    <i className="fa-solid fa-bars at-textarea-icon"></i>
                    <textarea
                      name="tlRemarks"
                      value={assignForm.tlRemarks}
                      onChange={handleFormChange}
                      placeholder="Special instructions..."
                      className="at-textarea"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="at-footer">
                <button className="at-discard-btn" onClick={closeAssignModal} disabled={isConfirming}>
                  Discard
                </button>
                <motion.button
                  className="at-confirm-btn"
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isConfirming ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Confirming...</>
                  ) : (
                    'Confirm'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className="pt-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}>
            <i className="fa-solid fa-circle-check"></i>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
