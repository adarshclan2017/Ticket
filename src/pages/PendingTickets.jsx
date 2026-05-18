import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './PendingTickets.css';

// Role helper
const userRole = localStorage.getItem('userRole') || 'employee';
const isEmployee = userRole === 'employee';

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

function getRecentStatusConfig(statusText) {
  switch ((statusText || '').toLowerCase()) {
    case 'raised': return { color: '#b45309', bg: '#fef3c7', icon: 'fa-circle-exclamation' };
    case 'assigned': return { color: '#1d4ed8', bg: '#dbeafe', icon: 'fa-user-check' };
    case 'resolved': return { color: '#065f46', bg: '#d1fae5', icon: 'fa-circle-check' };
    case 'closed': return { color: '#374151', bg: '#f3f4f6', icon: 'fa-circle-xmark' };
    default: return { color: '#6d28d9', bg: '#ede9fe', icon: 'fa-circle-dot' };
  }
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
  const [agents, setAgents] = useState([]);
  const [viewType, setViewType] = useState('assigned'); // 'assigned' | 'pending'
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [isTlDropdownOpen, setIsTlDropdownOpen] = useState(false);
  const empDropdownRef = React.useRef(null);
  const tlDropdownRef = React.useRef(null);

  // Recent Records panel state (employee only)
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [touchDraggedTicket, setTouchDraggedTicket] = useState(null);
  const [touchCoords, setTouchCoords] = useState(null);

  const navItems = [
    { name: 'Home', icon: 'fa-house', href: '/home' },
    { name: 'Agent Status', icon: 'fa-user-group', href: '/agent-status' },
    { name: 'Pending Tickets', icon: 'fa-ticket', href: '/pending-tickets', active: true },
  ];

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, [viewType]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
      if (tlDropdownRef.current && !tlDropdownRef.current.contains(event.target)) {
        setIsTlDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll Kanban board and employee drawer while dragging near edges
  useEffect(() => {
    if (!draggedTicket) return;

    let boardSpeed = 0;
    let drawerSpeed = 0;
    let scrollInterval = null;

    const handleDragOver = (e) => {
      e.preventDefault(); // Necessary to ensure continuous dragover events
      const threshold = 120; // threshold in pixels from edge
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 1. Kanban Board Horizontal Auto-scroll
      const kanbanBoard = document.querySelector('.pt-kanban-board');
      if (kanbanBoard) {
        const rect = kanbanBoard.getBoundingClientRect();
        // Expand the Y-axis check so if the user drags slightly above/below, it still scrolls
        if (mouseY >= rect.top - 100 && mouseY <= rect.bottom + 100) {
          const distToLeft = mouseX - rect.left;
          const distToRight = rect.right - mouseX;

          if (distToRight < threshold && distToRight > 0) {
            boardSpeed = Math.min(20, (threshold - distToRight) * 0.18);
          } else if (distToLeft < threshold && distToLeft > 0) {
            boardSpeed = -Math.min(20, (threshold - distToLeft) * 0.18);
          } else {
            boardSpeed = 0;
          }
        } else {
          boardSpeed = 0;
        }
      }

      // 2. Employee Drawer Horizontal Auto-scroll (Desktop view)
      const drawerEmployees = document.querySelector('.pt-drawer-employees');
      if (drawerEmployees) {
        const rect = drawerEmployees.getBoundingClientRect();
        if (mouseY >= rect.top - 100 && mouseY <= rect.bottom + 100) {
          const distToLeft = mouseX - rect.left;
          const distToRight = rect.right - mouseX;

          if (distToRight < threshold && distToRight > 0) {
            drawerSpeed = Math.min(15, (threshold - distToRight) * 0.15);
          } else if (distToLeft < threshold && distToLeft > 0) {
            drawerSpeed = -Math.min(15, (threshold - distToLeft) * 0.15);
          } else {
            drawerSpeed = 0;
          }
        } else {
          drawerSpeed = 0;
        }
      }
    };

    const startScrolling = () => {
      scrollInterval = setInterval(() => {
        const kanbanBoard = document.querySelector('.pt-kanban-board');
        const drawerEmployees = document.querySelector('.pt-drawer-employees');

        if (kanbanBoard && boardSpeed !== 0) {
          kanbanBoard.scrollLeft += boardSpeed;
        }
        if (drawerEmployees && drawerSpeed !== 0) {
          drawerEmployees.scrollLeft += drawerSpeed;
        }
      }, 16);
    };

    const stopScrolling = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };

    window.addEventListener('dragover', handleDragOver);
    startScrolling();

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      stopScrolling();
    };
  }, [draggedTicket]);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/unniService.asmx/loadAgents`);
      const text = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;
      const data = JSON.parse(jsonStr);
      if (data.success) {
        setAgents(data.Agents || []);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const fetchRecentTickets = async () => {
    setIsRecentOpen(true);
    setIsRecentLoading(true);
    setRecentError(null);
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const internalUserId = userData.internal_user_id || '4';

      const res = await fetch(`${API_BASE}/unniService.asmx/loadRaisedSupportTickets?InternalUserID=${internalUserId}`);
      const text = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;

      const data = JSON.parse(jsonStr);
      setRecentTickets(data.SupportTickets || []);
    } catch (err) {
      setRecentError('Failed to load tickets. Please try again.');
    } finally {
      setIsRecentLoading(false);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const internalEmployeeId = userData.internal_employee_id || '82';
      const internalEntryFromId = '11';

      // Switch API based on viewType
      const endpoint = viewType === 'pending'
        ? 'loadRaisedSupportTicketsForTL'
        : 'loadAgentsTickets';

      const res = await fetch(
        `${API_BASE}/unniService.asmx/${endpoint}?InternalEmployeeID=${internalEmployeeId}&InternalEntryFromID=${internalEntryFromId}`
      );
      const text = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;

      const responseData = JSON.parse(jsonStr);

      if (responseData.success) {
        let groups = [];
        if (viewType === 'pending') {
          // Group unassigned tickets
          const raw = responseData.SupportTickets || [];
          groups = [{
            agentName: 'Pending Assignment',
            tickets: raw.map(t => ({ ...t, CreationDate: t.RaisedTime || t.CreationDate }))
          }];
        } else {
          // Grouped by agent from API
          if (responseData.data) {
            groups = Object.entries(responseData.data).map(([name, list]) => ({
              agentName: name,
              tickets: list.map(t => ({
                ...t,
                CreationDate: t.RaisedTime || t.CreationDate
              }))
            }));
          }
        }
        setTickets(groups);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError('Failed to load tickets. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open modal
  const openAssignModal = (ticket) => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    setAssignForm({
      ...defaultAssignForm,
      tlId: userData.internal_employee_id || '',
    });
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
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;

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

  const getAgentIdByName = (name) => {
    const agent = agents.find(a => a.EmployeeName === name);
    return agent ? agent.InternalEmployeeID : null;
  };

  const handleDropAssignment = async (ticket, targetAgentName) => {
    setDraggedTicket(null); // Clear dragging state instantly to hide drawer
    // If dropped on "Pending Assignment", we don't assign it to a specific person
    if (targetAgentName === 'Pending Assignment') return;

    const targetAgentId = getAgentIdByName(targetAgentName);
    if (!targetAgentId) {
      showToast(`❌ Could not find ID for agent: ${targetAgentName}`);
      return;
    }

    // Check if already assigned to this agent (to avoid redundant API calls)
    if (ticket.AssignedTo === targetAgentName) return;

    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const tlId = userData.internal_employee_id || '82';

      const params = new URLSearchParams({
        InternalTicketID: ticket.InternalTicketID,
        AssignedTo: targetAgentId,
        AssignedBy: tlId,
        Priority: ticket.Priority || 1,
        TLRemarks: 'Re-assigned via drag and drop',
      });

      const res = await fetch(
        `${API_BASE}/unniService.asmx/SaveSupportTicketAssigningByTL?${params.toString()}`
      );
      const text = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;

      let result = null;
      try { result = JSON.parse(jsonStr); } catch { result = { message: jsonStr }; }

      if (!res.ok) {
        throw new Error(result?.message || `Server error: ${res.status}`);
      }

      showToast(`✅ Ticket #${ticket.TicketNo} assigned to ${targetAgentName}`);
      fetchTickets(); // Refresh list to reflect changes
    } catch (err) {
      console.error('Drag assignment failed:', err);
      showToast(`❌ Assignment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => {
    let processedGroups = tickets.map(group => {
      let result = group.tickets;

      // Status Filter (All, Assigned, Unassigned)
      if (filterStatus !== 'all') {
        result = result.filter(t => {
          const isAssigned = (t.CallStatus === '1' || t.CallStatus === 'Assigned') || assignedIds.has(t.InternalTicketID);
          return filterStatus === 'assigned' ? isAssigned : !isAssigned;
        });
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(t =>
          (t.TicketNo || '').toLowerCase().includes(q) ||
          (t.UserName || '').toLowerCase().includes(q) ||
          (t.BranchName || '').toLowerCase().includes(q) ||
          (t.Remarks || '').toLowerCase().includes(q) ||
          (t.Type || '').toLowerCase().includes(q)
        );
      }
      return { ...group, tickets: result };
    });

    if (viewType === 'pending') {
      return processedGroups.filter(group => group.tickets.length > 0);
    } else {
      return processedGroups.filter(group => group.tickets.length > 0);
    }
  }, [tickets, filterStatus, searchQuery, assignedIds, viewType, agents]);

  const stats = useMemo(() => {
    let total = 0;
    let assigned = 0;

    tickets.forEach(group => {
      total += group.tickets.length;
      group.tickets.forEach(t => {
        if (t.CallStatus === '1' || t.CallStatus === 'Assigned' || assignedIds.has(t.InternalTicketID)) {
          assigned++;
        }
      });
    });

    return {
      total,
      assigned,
      pending: total - assigned
    };
  }, [tickets, assignedIds]);

  const { total: totalCount, assigned: assignedCount, pending: pendingCount } = stats;

  return (
    <div className={`pt-container ${isEmployee ? 'pt-no-sidebar' : isSidebarCollapsed ? 'pt-sidebar-collapsed' : ''}`}>

      {/* ── Sidebar (hidden for employees) ── */}
      {!isEmployee && (
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
      )}

      {/* ── Main ── */}
      <main className="pt-main">
        {/* Header */}
        <div className="pt-header">
          <div className="pt-header-left">
            <div className="pt-header-icon">
              <i className={`fa-solid ${viewType === 'pending' ? 'fa-ticket' : 'fa-user-check'}`}></i>
            </div>
            <div>
              <h1>{viewType === 'pending' ? 'Pending Tickets' : 'My Tasks'}</h1>
              <p>{viewType === 'pending' ? 'Unassigned support requests' : 'Tickets assigned to you'}</p>
            </div>
          </div>

          <div className="pt-view-toggle-group">
            <button
              className={`pt-toggle-btn ${viewType === 'assigned' ? 'active' : ''}`}
              onClick={() => setViewType('assigned')}
            >
              <i className="fa-solid fa-user-check"></i>
              My Tasks
            </button>
            <button
              className={`pt-toggle-btn ${viewType === 'pending' ? 'active' : ''}`}
              onClick={() => setViewType('pending')}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              Pending
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isEmployee && (
              <button className="pt-recent-btn" onClick={fetchRecentTickets}>
                <i className="fa-solid fa-clock-rotate-left"></i>
                Recent Records
              </button>
            )}
            <button className="pt-refresh-btn" onClick={fetchTickets} disabled={loading}>
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
              {!loading ? 'Refresh' : 'Loading...'}
            </button>
          </div>
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
        {!loading && !error && filtered.length > 0 && (viewType === 'pending' ? (
          /* ── PENDING: original auto-fill grid layout ── */
          <div className="pt-pending-section">
            {filtered.map((group) => (
              <motion.div
                key={group.agentName}
                className="pt-cards-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {group.tickets.map((ticket) => {
                  const isAssigned = (ticket.CallStatus === '1' || ticket.CallStatus === 'Assigned') || assignedIds.has(ticket.InternalTicketID);
                  const typeStyle = getTypeStyle(ticket.Type);
                  return (
                    <motion.div
                      key={ticket.InternalTicketID}
                      className={`pt-card ${isAssigned ? 'assigned' : 'pending'}`}
                      variants={cardVariants}
                      whileHover={{ y: -8 }}
                      layout
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('ticket', JSON.stringify(ticket));
                        e.currentTarget.classList.add('dragging');
                        setDraggedTicket(ticket);
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('dragging');
                        setDraggedTicket(null);
                      }}
                      onClick={() => setViewTicket(ticket)}
                    >
                      <div className="pt-card-header">
                        <div className="pt-card-id-row">
                          <span className="pt-card-id">#{ticket.TicketNo}</span>
                          <span className="pt-card-type" style={{ color: typeStyle.color, background: typeStyle.bg }}>{ticket.Type}</span>
                        </div>
                        <div className={`pt-card-status ${isAssigned ? 'assigned' : 'pending'}`}>
                          <div className="pt-status-dot"></div>
                          {isAssigned ? 'Assigned' : 'Pending'}
                        </div>
                      </div>
                      <div className="pt-card-body">
                        <div className="pt-card-meta-grid">
                          <div className="pt-card-meta-item"><i className="fa-solid fa-user"></i><div className="pt-meta-content"><label>Raised By</label><span>{ticket.UserName || '—'}</span></div></div>
                          <div className="pt-card-meta-item"><i className="fa-solid fa-building"></i><div className="pt-meta-content"><label>Branch</label><span title={ticket.BranchName}>{ticket.BranchName}</span></div></div>
                          <div className="pt-card-meta-item"><i className="fa-solid fa-phone"></i><div className="pt-meta-content"><label>Contact</label><span>{ticket.Phone}</span></div></div>
                          <div className="pt-card-meta-item"><i className="fa-solid fa-clock"></i><div className="pt-meta-content"><label>Delay</label><span className={ticket.Delay ? 'pt-delay-warn' : ''}>{ticket.Delay || '—'}</span></div></div>
                        </div>
                        {ticket.Remarks && (<div className="pt-card-remarks"><i className="fa-solid fa-quote-left"></i><p>{ticket.Remarks}</p></div>)}
                      </div>
                      <div className="pt-card-footer">
                        <div className="pt-card-footer-top">
                          <div className="pt-card-date"><i className="fa-regular fa-calendar-days"></i><span>{formatDate(ticket.CreationDate)}</span></div>
                          <div className="pt-card-serial-small">SN: {ticket.SerialNo}</div>
                        </div>
                        {isAssigned ? (
                          <div className="pt-card-assigned-pill">
                            <div className="pt-assigned-avatar">{ticket.AssignedTo?.charAt(0) || 'A'}</div>
                            <div className="pt-assigned-details"><span>Assigned to</span><strong>{ticket.AssignedTo}</strong></div>
                          </div>
                        ) : (
                          <motion.button className="pt-card-assign-btn" onClick={(e) => { e.stopPropagation(); openAssignModal(ticket); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <i className="fa-solid fa-user-plus"></i><span>Assign Task</span>
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ))}
          </div>
        ) : (
          /* ── MY TASKS: Responsive Grid Layout Grouped by Agent ── */
          <div className="pt-assigned-grid-section" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
            {filtered.map((group) => (
              <div 
                key={group.agentName} 
                className="pt-agent-group-grid-container"
              >
                {/* Agent Header */}
                <div className="pt-kanban-col-header" style={{ marginBottom: '16px', borderRadius: '16px', border: '2px solid #e2e8f0' }}>
                  <div className="pt-kanban-avatar">
                    {group.agentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="pt-kanban-col-info">
                    <h3>{group.agentName}</h3>
                    <div className="pt-kanban-col-meta">
                      <span className="pt-kanban-count">
                        <i className="fa-solid fa-layer-group"></i>
                        {group.tickets.length} {group.tickets.length === 1 ? 'Ticket' : 'Tickets'}
                      </span>
                      <div className="pt-kanban-active-dot" title="Active"></div>
                    </div>
                  </div>
                </div>

                {/* Grid Wrapper with drag/drop handlers */}
                <motion.div
                  className="pt-cards-grid"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    try {
                      const ticketData = e.dataTransfer.getData('ticket');
                      if (ticketData) {
                        const ticket = JSON.parse(ticketData);
                        handleDropAssignment(ticket, group.agentName);
                      }
                    } catch (err) {
                      console.error('Drop error:', err);
                    }
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '16px',
                    transition: 'all 0.2s ease',
                    minHeight: '100px'
                  }}
                >
                  {group.tickets.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', border: '2px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                      Drop ticket here to assign to {group.agentName}
                    </div>
                  )}
                  {group.tickets.map((ticket) => {
                    const isAssigned = (ticket.CallStatus === '1' || ticket.CallStatus === 'Assigned') || assignedIds.has(ticket.InternalTicketID);
                    const typeStyle = getTypeStyle(ticket.Type);

                    return (
                      <motion.div
                        key={ticket.InternalTicketID}
                        className={`pt-card ${isAssigned ? 'assigned' : 'pending'}`}
                        variants={cardVariants}
                        layout
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('ticket', JSON.stringify(ticket));
                          e.currentTarget.classList.add('dragging');
                          setDraggedTicket(ticket);
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.classList.remove('dragging');
                          setDraggedTicket(null);
                        }}
                        onTouchStart={(e) => {
                          if (window.innerWidth > 768) return;
                          const touch = e.touches[0];
                          setDraggedTicket(ticket);
                          setTouchDraggedTicket(ticket);
                          setTouchCoords({ x: touch.clientX, y: touch.clientY });
                        }}
                        onTouchMove={(e) => {
                          if (!touchDraggedTicket) return;
                          const touch = e.touches[0];
                          setTouchCoords({ x: touch.clientX, y: touch.clientY });
                          
                          // Highlight employee pill dropzone under touch finger
                          const element = document.elementFromPoint(touch.clientX, touch.clientY);
                          const pill = element?.closest('.pt-drawer-employee-pill');
                          
                          document.querySelectorAll('.pt-drawer-employee-pill').forEach(el => {
                            el.classList.remove('drag-active');
                          });
                          if (pill) {
                            pill.classList.add('drag-active');
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (!touchDraggedTicket) return;
                          const touch = e.changedTouches[0];
                          const element = document.elementFromPoint(touch.clientX, touch.clientY);
                          const pill = element?.closest('.pt-drawer-employee-pill');
                          
                          if (pill) {
                            const agentName = pill.getAttribute('data-agent-name');
                            if (agentName) {
                              handleDropAssignment(touchDraggedTicket, agentName);
                            }
                          }
                          
                          setDraggedTicket(null);
                          setTouchDraggedTicket(null);
                          setTouchCoords(null);
                          document.querySelectorAll('.pt-drawer-employee-pill').forEach(el => {
                            el.classList.remove('drag-active');
                          });
                        }}
                        onClick={() => setViewTicket(ticket)}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(ticket);
                              }}
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
              </div>
            ))}
          </div>
        ))}


        {/* Results */}
        {!loading && !error && filtered.length > 0 && (
          <div className="pt-results-label">
            Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> tickets
          </div>
        )}
      </main>

      {/* ── Mobile Nav (hidden for employees) ── */}
      {!isEmployee && (
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
      )}

      {/* ── Recent Records Slide-in Panel ── */}
      <AnimatePresence>
        {isRecentOpen && (
          <>
            <motion.div
              className="pt-recent-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRecentOpen(false)}
            />
            <motion.div
              className="pt-recent-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="pt-recent-header">
                <div className="pt-recent-title">
                  <div className="pt-recent-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
                  <div>
                    <h2>Recent Records</h2>
                    <p>Raised support tickets</p>
                  </div>
                </div>
                <button className="pt-recent-close" onClick={() => setIsRecentOpen(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="pt-recent-body">
                {isRecentLoading && (
                  <div className="pt-recent-loader">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Loading tickets...</span>
                  </div>
                )}
                {recentError && !isRecentLoading && (
                  <div className="pt-recent-error">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{recentError}</span>
                  </div>
                )}
                {!isRecentLoading && !recentError && recentTickets.length === 0 && (
                  <div className="pt-recent-empty">
                    <i className="fa-solid fa-inbox"></i>
                    <span>No tickets found</span>
                  </div>
                )}
                {!isRecentLoading && !recentError && recentTickets.length > 0 && (
                  <div className="pt-recent-cards-grid">
                    {recentTickets.map((ticket, idx) => {
                      const st = getRecentStatusConfig(ticket.CallStatusText);
                      return (
                        <motion.div
                          key={ticket.InternalTicketID || idx}
                          className="pt-recent-grid-card"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => setViewTicket(ticket)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Card Header */}
                          <div className="pt-rg-header">
                            <div className="pt-rg-ticket-no">
                              <span className="hash-icon">#</span> {ticket.TicketNo}
                            </div>
                            <span className="pt-rg-status-badge" style={{ color: st.color, background: st.bg }}>
                              <i className={`fa-solid ${st.icon}`}></i> {ticket.CallStatusText}
                            </span>
                          </div>

                          {/* Meta Grid */}
                          <div className="pt-rg-meta-grid">
                            <div className="pt-rg-meta-item">
                              <i className="fa-solid fa-user" style={{ color: '#8b5cf6' }}></i>
                              <span title={ticket.UserName}>{ticket.UserName || '—'}</span>
                            </div>
                            <div className="pt-rg-meta-item">
                              <i className="fa-solid fa-building" style={{ color: '#0ea5e9' }}></i>
                              <span title={ticket.BranchName}>{ticket.BranchName || '—'}</span>
                            </div>
                            <div className="pt-rg-meta-item">
                              <i className="fa-solid fa-phone" style={{ color: '#10b981' }}></i>
                              <span title={ticket.Phone}>{ticket.Phone || '—'}</span>
                            </div>
                            <div className="pt-rg-meta-item">
                              <i className="fa-solid fa-tag" style={{ color: '#f59e0b' }}></i>
                              <span title={ticket.Type}>{ticket.Type || '—'}</span>
                            </div>
                          </div>

                          {/* Remarks Section */}
                          {ticket.Remarks && (
                            <div className="pt-rg-remarks-box">
                              <div className="pt-rg-remarks-icon">
                                <i className="fa-solid fa-comment-dots"></i>
                              </div>
                              <div className="pt-rg-remarks-text">{ticket.Remarks}</div>
                            </div>
                          )}

                          {/* Card Footer */}
                          <div className="pt-rg-footer">
                            <div className="pt-rg-date">
                              <i className="fa-regular fa-calendar"></i> {ticket.CreationDate || '—'}
                            </div>
                            {ticket.Delay && ticket.Delay !== '0' && (
                              <div className="pt-rg-duration-pill">
                                <i className="fa-solid fa-clock"></i> {ticket.Delay}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isRecentLoading && recentTickets.length > 0 && (
                <div className="pt-recent-footer">
                  <span>{recentTickets.length} ticket{recentTickets.length !== 1 ? 's' : ''}</span>
                  <button onClick={fetchRecentTickets}><i className="fa-solid fa-rotate-right"></i> Refresh</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

                {/* Employee ID Dropdown */}
                <div className="at-field">
                  <label className="at-label">Employee ID</label>
                  <div className="custom-dropdown" ref={empDropdownRef}>
                    <div
                      className={`dropdown-trigger ${isEmpDropdownOpen ? 'active' : ''}`}
                      onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                    >
                      <i className="fa-solid fa-user-tie at-input-icon"></i>
                      <div className="selected-value-container">
                        <div className={`selected-value ${!assignForm.employeeId ? 'placeholder' : ''}`}>
                          {agents.find(a => a.InternalEmployeeID === assignForm.employeeId)
                            ? `${agents.find(a => a.InternalEmployeeID === assignForm.employeeId).EmployeeName} (ID: ${assignForm.employeeId})`
                            : 'Select Employee'}
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-down select-arrow ${isEmpDropdownOpen ? 'rotated' : ''}`}></i>
                    </div>

                    <AnimatePresence>
                      {isEmpDropdownOpen && (
                        <motion.div
                          className="dropdown-menu-v2"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="dropdown-scroll-area">
                            {agents.map((agent) => (
                              <div
                                key={agent.InternalEmployeeID}
                                className={`dropdown-item-v2 ${assignForm.employeeId === agent.InternalEmployeeID ? 'selected' : ''}`}
                                onClick={() => {
                                  setAssignForm(prev => ({ ...prev, employeeId: agent.InternalEmployeeID }));
                                  setIsEmpDropdownOpen(false);
                                }}
                              >
                                <span>{agent.EmployeeName}</span>
                                {assignForm.employeeId === agent.InternalEmployeeID && (
                                  <i className="fa-solid fa-check check-icon"></i>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* TL ID Dropdown */}
                <div className="at-field">
                  <label className="at-label">TL ID</label>
                  <div className="custom-dropdown" ref={tlDropdownRef}>
                    <div
                      className={`dropdown-trigger ${isTlDropdownOpen ? 'active' : ''}`}
                      onClick={() => setIsTlDropdownOpen(!isTlDropdownOpen)}
                    >
                      <i className="fa-solid fa-shield-halved at-input-icon"></i>
                      <div className="selected-value-container">
                        <div className={`selected-value ${!assignForm.tlId ? 'placeholder' : ''}`}>
                          {agents.find(a => a.InternalEmployeeID === assignForm.tlId)
                            ? `${agents.find(a => a.InternalEmployeeID === assignForm.tlId).EmployeeName} (ID: ${assignForm.tlId})`
                            : 'Select TL'}
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-down select-arrow ${isTlDropdownOpen ? 'rotated' : ''}`}></i>
                    </div>

                    <AnimatePresence>
                      {isTlDropdownOpen && (
                        <motion.div
                          className="dropdown-menu-v2"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="dropdown-scroll-area">
                            {agents.map((agent) => (
                              <div
                                key={agent.InternalEmployeeID}
                                className={`dropdown-item-v2 ${assignForm.tlId === agent.InternalEmployeeID ? 'selected' : ''}`}
                                onClick={() => {
                                  setAssignForm(prev => ({ ...prev, tlId: agent.InternalEmployeeID }));
                                  setIsTlDropdownOpen(false);
                                }}
                              >
                                <span>{agent.EmployeeName}</span>
                                {assignForm.tlId === agent.InternalEmployeeID && (
                                  <i className="fa-solid fa-check check-icon"></i>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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

      {/* Drag & Drop Drawer Dropzone */}
      <AnimatePresence>
        {draggedTicket && viewType !== 'pending' && (
          <motion.div
            className="pt-drag-drop-drawer"
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
          >
            <div className="pt-drawer-header">
              <i className="fa-solid fa-people-arrows"></i>
              <span>Drop Ticket #{draggedTicket.TicketNo} on an Employee to Assign:</span>
            </div>
            <div className="pt-drawer-employees">
              {agents.map((agent) => (
                <div
                  key={agent.InternalEmployeeID}
                  className="pt-drawer-employee-pill"
                  data-agent-name={agent.EmployeeName}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-active');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-active');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-active');
                    setDraggedTicket(null); // Close drawer instantly
                    handleDropAssignment(draggedTicket, agent.EmployeeName);
                  }}
                >
                  <div className="pt-pill-avatar">
                    {agent.EmployeeName.charAt(0).toUpperCase()}
                  </div>
                  <span>{agent.EmployeeName}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className="pt-toast"
            initial={{ opacity: 0, x: "-50%", y: 24 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 24 }}
            style={{ left: '50%' }}>
            <i className="fa-solid fa-circle-check"></i>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch Drag Ghost Card */}
      {touchDraggedTicket && touchCoords && (
        <div 
          className="pt-card touch-ghost-card"
          style={{
            position: 'fixed',
            left: `${touchCoords.x - 80}px`,
            top: `${touchCoords.y - 60}px`,
            width: '160px',
            opacity: 0.85,
            pointerEvents: 'none',
            zIndex: 99999,
            transform: 'scale(0.95) rotate(3deg)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
            border: '2px solid #00bcd4',
            background: '#fff',
            borderRadius: '12px',
            padding: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800 }}>#{touchDraggedTicket.TicketNo}</span>
            <span style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '4px', background: '#e0f2fe', color: '#0284c7', fontWeight: 800 }}>
              {touchDraggedTicket.Type}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
            <i className="fa-solid fa-people-arrows" style={{ color: '#00bcd4', marginRight: '6px' }}></i>
            Assigning ticket...
          </div>
        </div>
      )}

      {/* View Ticket Data Modal */}
      <AnimatePresence>
        {viewTicket && (
          <div className="modal-overlay" onClick={() => setViewTicket(null)}>
            <motion.div
              className="detail-popup-page"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="detail-drag-handle"></div>
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-status-pill" style={{
                    color: getRecentStatusConfig(viewTicket.CallStatusText || viewTicket.CallStatus || 'Assigned').color,
                    background: getRecentStatusConfig(viewTicket.CallStatusText || viewTicket.CallStatus || 'Assigned').bg
                  }}>
                    <i className={`fa-solid ${getRecentStatusConfig(viewTicket.CallStatusText || viewTicket.CallStatus || 'Assigned').icon}`}></i>
                    {viewTicket.CallStatusText || viewTicket.CallStatus || 'Assigned'}
                  </div>
                  <h2>Ticket #{viewTicket.TicketNo}</h2>
                </div>
                <button className="detail-close-btn" onClick={() => setViewTicket(null)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="detail-scroll-content">
                <div className="detail-section">
                  <h4 className="detail-label">Incident Overview</h4>
                  <div className="detail-info-grid">
                    <div className="detail-info-item">
                      <i className="fa-solid fa-user"></i>
                      <div className="info-text">
                        <label>User</label>
                        <span>{viewTicket.UserName || '—'}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-building"></i>
                      <div className="info-text">
                        <label>Branch</label>
                        <span>{viewTicket.BranchName || '—'}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-phone"></i>
                      <div className="info-text">
                        <label>Phone</label>
                        <span>{viewTicket.Phone || '—'}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-layer-group"></i>
                      <div className="info-text">
                        <label>Category</label>
                        <span>{viewTicket.Type || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-label">Problem Remarks</h4>
                  <div className="detail-remarks-box">
                    <i className="fa-solid fa-quote-left"></i>
                    <p>{viewTicket.Remarks || 'No remarks provided.'}</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-label">Timeline Details</h4>
                  <div className="detail-meta-row">
                    <div className="meta-sub-item">
                      <i className="fa-regular fa-calendar"></i>
                      <span>Created: {viewTicket.CreationDate || '—'}</span>
                    </div>
                    {viewTicket.Delay && viewTicket.Delay !== '0' && (
                      <div className="meta-sub-item delay">
                        <i className="fa-solid fa-clock"></i>
                        <span>Resolution Delay: {viewTicket.Delay}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-footer">
                <button className="detail-primary-btn" onClick={() => setViewTicket(null)}>
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
