import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './Home.css';

function Home() {
  // State for form fields
  const [formData, setFormData] = useState({
    phoneNumber: '',
    category: '',
    categoryId: '',
    remarks: ''
  });

  // State for Advanced Settings (Technical Provisioning)
  const [advancedSettings, setAdvancedSettings] = useState({
    branchId: '',
    branchName: '',
    userName: '',
    remoteId: '',
    remotePassword: '',
    dbName: '',
    instanceName: ''
  });

  // State for UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  // Support Type dropdown state
  const [supportTypes, setSupportTypes] = useState([]);
  const [isSupportTypesLoading, setIsSupportTypesLoading] = useState(false);

  // State for Sidebar Toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State for Recent Records Panel
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Special handler for category select — captures both name and id
  const handleCategoryChange = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    setFormData(prev => ({
      ...prev,
      category: selectedOption.text === 'Select category' ? '' : selectedOption.text,
      categoryId: e.target.value,
    }));
  };

  const handleAdvancedChange = (e) => {
    const { name, value } = e.target;
    setAdvancedSettings(prev => ({ ...prev, [name]: value }));
  };

  // State for Notification Permission and SW Registration
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [swRegistration, setSwRegistration] = useState(null);

  // Fetch Support Types from API
  React.useEffect(() => {
    const fetchSupportTypes = async () => {
      setIsSupportTypesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/unniService.asmx/loadSupportType`);
        const text = await res.text();
        // The API returns JSON wrapped in XML <string> tags
        const match = text.match(/<string[^>]*>(.*)<\/string>/s);
        const jsonStr = match ? match[1] : text;
        const data = JSON.parse(jsonStr);
        setSupportTypes(data.SupportType || []);
      } catch (err) {
        console.error('Failed to load support types:', err);
      } finally {
        setIsSupportTypesLoading(false);
      }
    };
    fetchSupportTypes();
  }, []);

  // Register Service Worker and Request permission on mount
  React.useEffect(() => {
    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW Registered:', registration);
          setSwRegistration(registration);
        })
        .catch(err => console.error('SW Registration Failed:', err));
    }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked by your browser. Please enable them in your browser settings (click the lock icon in the address bar).');
        return;
      }

      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          const title = 'Notifications Enabled!';
          const options = {
            body: 'You will now receive updates about your tickets.',
            icon: '/favicon.svg'
          };

          if (swRegistration) {
            swRegistration.showNotification(title, options);
          } else {
            new Notification(title, options);
          }
        }
      });
    }
  };

  const showPushNotification = async (ticketData = {}) => {
    console.log('Attempting to show notification...', Notification.permission);

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted:', Notification.permission);
      return;
    }

    const { phone, category } = ticketData;

    const title = '✅ Ticket Submitted';
    const body = `Type: ${category || 'N/A'} | Phone: ${phone || 'N/A'}`;

    const options = {
      body: body || 'Your support ticket has been created.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'ticket-submit',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { dateOfArrival: Date.now() }
    };

    try {
      let reg = swRegistration;
      if (!reg && 'serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.ready;
        setSwRegistration(reg);
      }

      if (reg && reg.active) {
        await reg.showNotification(title, options);
        console.log('SW notification shown.');
      } else {
        new Notification(title, options);
        console.log('Fallback Notification shown.');
      }
    } catch (err) {
      console.error('Notification error:', err);
      try { new Notification(title, options); } catch (_) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber || !formData.categoryId || !formData.remarks) {
      alert('Please fill in all required fields: Phone Number, Ticket Category, and Problem Remarks.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build query parameters from form data and advanced settings
      const params = new URLSearchParams({
        InternalUserID: '4',
        UserName: advancedSettings.userName || 'Admin',
        BranchID: advancedSettings.branchId || 'SYSTEL',
        BranchName: advancedSettings.branchName || 'INFOLAB TECHNOLOGIES HO',
        InstanceName: advancedSettings.instanceName || '',
        DBName: advancedSettings.dbName || '',
        Phone: formData.phoneNumber,
        InternalTypeID: formData.categoryId,
        Remarks: formData.remarks,
      });

      const url = `${API_BASE}/unniService.asmx/SaveSupportTicket?${params.toString()}`;
      console.log('Submitting ticket to:', url);

      const res = await fetch(url);
      const text = await res.text();
      console.log('API Response:', text);

      // Parse JSON from XML <string> wrapper
      const match = text.match(/<string[^>]*>(.*)<\/string>/s);
      const jsonStr = match ? match[1] : text;

      let result = null;
      try {
        result = JSON.parse(jsonStr);
      } catch {
        // If not JSON, treat raw text as the response
        result = { message: jsonStr };
      }

      if (!res.ok) {
        throw new Error(result?.message || `Server error: ${res.status}`);
      }

      // Success — pass the submitted details into the notification
      setIsSuccess(true);
      console.log('Ticket submission successful:', result);
      await showPushNotification({
        phone:    formData.phoneNumber,
        category: formData.category,
        branch:   advancedSettings.branchName || 'INFOLAB TECHNOLOGIES HO',
        remarks:  formData.remarks,
      });

      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ phoneNumber: '', category: '', categoryId: '', remarks: '' });
      }, 3000);

    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert(`Failed to submit ticket: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch raised support tickets
  const fetchRecentTickets = async () => {
    setIsRecentOpen(true);
    setIsRecentLoading(true);
    setRecentError(null);
    try {
      const res = await fetch(`${API_BASE}/unniService.asmx/loadRaisedSupportTickets?InternalUserID=4`);
      const text = await res.text();
      const match = text.match(/<string[^>]*>(.*)<\/string>/s);
      const jsonStr = match ? match[1] : text;
      const data = JSON.parse(jsonStr);
      // Safely extract the first array found in the response, whatever key it uses
      let tickets = [];
      if (Array.isArray(data)) {
        tickets = data;
      } else if (data && typeof data === 'object') {
        const arr = Object.values(data).find(v => Array.isArray(v));
        tickets = arr || [];
      }
      console.log('Tickets received:', tickets);
      setRecentTickets(tickets);
    } catch (err) {
      console.error('Failed to load recent tickets:', err);
      setRecentError('Failed to load tickets. Please try again.');
    } finally {
      setIsRecentLoading(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: 'fa-house' },
    { name: 'Tickets', icon: 'fa-ticket' },
    { name: 'Agent Status', icon: 'fa-user-group', href: '/agent-status' },
    { name: 'Recent Records', icon: 'fa-clock-rotate-left' },
    { name: 'Analytics', icon: 'fa-chart-line' },
    { name: 'Settings', icon: 'fa-gears' },
  ];

  // Status badge config
  const getStatusConfig = (statusText) => {
    switch ((statusText || '').toLowerCase()) {
      case 'raised':    return { color: '#f59e0b', bg: '#fef3c7', icon: 'fa-circle-exclamation' };
      case 'assigned':  return { color: '#3b82f6', bg: '#eff6ff', icon: 'fa-user-check' };
      case 'resolved':  return { color: '#10b981', bg: '#d1fae5', icon: 'fa-circle-check' };
      case 'closed':    return { color: '#6b7280', bg: '#f3f4f6', icon: 'fa-circle-xmark' };
      default:          return { color: '#8b5cf6', bg: '#ede9fe', icon: 'fa-circle-dot' };
    }
  };

  return (
    <div className={`home-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar for Desktop UI */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <i className="fa-solid fa-headset"></i>
          </div>
          {!isSidebarCollapsed && <span className="logo-text">Inpack</span>}
          <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            item.href ? (
              <a
                key={item.name}
                className="nav-item"
                href={item.href}
                title={isSidebarCollapsed ? item.name : ''}
                style={{ textDecoration: 'none' }}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </a>
            ) : (
              <div
                key={item.name}
                className={`nav-item ${activeTab === item.name ? 'active' : ''}`}
                onClick={() => setActiveTab(item.name)}
                title={isSidebarCollapsed ? item.name : ''}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </div>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item">
            <i className="fa-solid fa-right-from-bracket"></i>
            {!isSidebarCollapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <motion.main
        className="main-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="content-header">
          <div className="header-left">
            <motion.h1 variants={itemVariants}>Support Desk</motion.h1>
            <motion.p variants={itemVariants}>Manage and track your technical support incidents</motion.p>
          </div>
          <div className="header-right-group">
            {notificationPermission !== 'granted' && (
              <motion.button
                className="notification-status-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={requestNotificationPermission}
                title="Enable Push Notifications"
              >
                <i className={`fa-solid ${notificationPermission === 'denied' ? 'fa-bell-slash' : 'fa-bell'}`}></i>
              </motion.button>
            )}
            <div className="user-profile">
              <div className="user-avatar"></div>
              <div className="user-info">
                <div style={{ fontSize: '14px', fontWeight: '700' }}>Adarsh Clan</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Administrator</div>
              </div>
            </div>
          </div>
        </header>

        <div className="form-grid">
          {/* Main Form Column */}
          <div className="form-main-card">
            <motion.div className="feature-card-v2" variants={itemVariants}>
              <div className="feature-info">
                <span className="tiny-label">New Incident</span>
                <h3>File a support ticket</h3>
                <p>Fill in all required fields for faster resolution</p>
              </div>
              <div className="feature-icon-v2">
                <i className="fa-solid fa-ticket-simple"></i>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="vertical-form-flow">
              <div className="section-label-v2">Core Incident Details</div>

              <div className="input-group-v2">
                <div className="input-row">
                  <div className="input-box-v2">
                    <div className="input-icon-v2">
                      <i className="fa-solid fa-mobile-button"></i>
                    </div>
                    <div className="input-content-v2">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="+91 ______________"
                        required
                      />
                    </div>
                  </div>

                    <div className="input-box-v2">
                      <div className="input-icon-v2">
                        <i className="fa-solid fa-layer-group"></i>
                      </div>
                      <div className="input-content-v2">
                        <label>Ticket Category</label>
                        <select
                          name="category"
                          value={formData.categoryId}
                          onChange={handleCategoryChange}
                          required
                          disabled={isSupportTypesLoading}
                        >
                          <option value="">
                            {isSupportTypesLoading ? 'Loading...' : 'Select category'}
                          </option>
                          {supportTypes.map((item) => (
                            <option key={item.internal_lookup_id} value={item.internal_lookup_id}>
                              {item.lookup_data}
                            </option>
                          ))}
                        </select>
                      </div>
                      <i className="fa-solid fa-chevron-down select-arrow"></i>
                    </div>
                </div>

                <div className="input-box-v2 textarea-box">
                  <div className="input-content-v2 no-icon">
                    <label>Problem Remarks</label>
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      placeholder="Describe the issue in detail..."
                      required
                    ></textarea>
                  </div>
                </div>
              </div>

              <motion.button
                type="submit"
                className="primary-action-btn-v2"
                disabled={isSubmitting}
                style={{ marginTop: '32px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : 'Initialize Ticket'}
              </motion.button>
            </form>
          </div>

          {/* Sidebar Area within Grid */}
          <div className="form-side-cards">
            <div className="section-label-v2">System Environment</div>
            <motion.div
              className="advanced-settings-card-v2"
              variants={itemVariants}
              onClick={() => setIsAdvancedModalOpen(true)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="adv-left">
                <div className="adv-icon-box">
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>
                <div className="adv-text">
                  <h4>Advanced Settings</h4>
                  <p>Branch, DB & Server</p>
                </div>
              </div>
              <div className="adv-right">
                <div className="adv-plus-btn">
                  <i className="fa-solid fa-plus"></i>
                </div>
              </div>
            </motion.div>

            <div className="section-label-v2">Recent Activity</div>
            <motion.div
              className="history-link-card-v2"
              variants={itemVariants}
              whileHover={{ x: 5 }}
              onClick={fetchRecentTickets}
              style={{ cursor: 'pointer' }}
            >
              <div className="hist-left">
                <i className="fa-solid fa-clock-rotate-left"></i>
                <span>Recent Records</span>
              </div>
              <i className="fa-solid fa-chevron-right"></i>
            </motion.div>

            <motion.div className="side-card-v2 tips-card" variants={itemVariants}>
              <span className="tiny-label">Quick Tip</span>
              <p>Including detailed remarks can speed up resolution by 40%.</p>
            </motion.div>
          </div>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              className="success-toast-v2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <i className="fa-solid fa-circle-check"></i>
              Ticket Created Successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Advanced Settings Modal (Technical Provisioning) */}
      <AnimatePresence>
        {isAdvancedModalOpen && (
          <div className="modal-overlay" onClick={() => setIsAdvancedModalOpen(false)}>
            <motion.div
              className="advanced-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-v2">
                <div className="header-v2-main">
                  <div className="header-v2-icon">
                    <i className="fa-solid fa-laptop-code"></i>
                  </div>
                  <div className="header-v2-text">
                    <h2>Technical Provisioning</h2>
                    <p>System Configuration</p>
                  </div>
                </div>
                <button className="modal-close-v2" onClick={() => setIsAdvancedModalOpen(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="modal-scroll-area">
                <div className="modal-section">
                  <h4 className="modal-section-title">Branch Information</h4>
                  <div className="settings-grid-v2">
                    <div className="modal-input-v2">
                      <label>Branch ID <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="branchId" value={advancedSettings.branchId} onChange={handleAdvancedChange} placeholder="Enter ID..." />
                    </div>
                    <div className="modal-input-v2">
                      <label>Branch Name <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="branchName" value={advancedSettings.branchName} onChange={handleAdvancedChange} placeholder="Enter name..." />
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4 className="modal-section-title">User & Access</h4>
                  <div className="settings-grid-v2">
                    <div className="modal-input-v2 full-width">
                      <label>User Name <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="userName" value={advancedSettings.userName} onChange={handleAdvancedChange} placeholder="Enter user..." />
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4 className="modal-section-title">Remote Connectivity</h4>
                  <div className="settings-grid-v2">
                    <div className="modal-input-v2">
                      <label>Remote ID <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="remoteId" value={advancedSettings.remoteId} onChange={handleAdvancedChange} placeholder="Enter ID..." />
                    </div>
                    <div className="modal-input-v2">
                      <label>Remote Password <span className="optional-tag">(Optional)</span></label>
                      <input type="password" name="remotePassword" value={advancedSettings.remotePassword} onChange={handleAdvancedChange} placeholder="********" />
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4 className="modal-section-title">Database Configuration</h4>
                  <div className="settings-grid-v2">
                    <div className="modal-input-v2">
                      <label>DB Name <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="dbName" value={advancedSettings.dbName} onChange={handleAdvancedChange} placeholder="Database..." />
                    </div>
                    <div className="modal-input-v2">
                      <label>Instance Name <span className="optional-tag">(Optional)</span></label>
                      <input type="text" name="instanceName" value={advancedSettings.instanceName} onChange={handleAdvancedChange} placeholder="Instance ID..." />
                    </div>
                  </div>
                </div>
              </div>

              <button className="modal-save-btn-v2" onClick={() => setIsAdvancedModalOpen(false)}>
                Save Configuration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recent Records Slide-in Panel */}
      <AnimatePresence>
        {isRecentOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRecentOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              className="recent-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Panel Header */}
              <div className="recent-panel-header">
                <div className="recent-panel-title">
                  <div className="recent-panel-icon">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <div>
                    <h2>Recent Records</h2>
                    <p>Raised support tickets</p>
                  </div>
                </div>
                <button className="modal-close-v2" onClick={() => setIsRecentOpen(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Panel Body */}
              <div className="recent-panel-body">
                {isRecentLoading && (
                  <div className="recent-loading">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Loading tickets...</span>
                  </div>
                )}

                {recentError && !isRecentLoading && (
                  <div className="recent-error">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{recentError}</span>
                  </div>
                )}

                {!isRecentLoading && !recentError && recentTickets.length === 0 && (
                  <div className="recent-empty">
                    <i className="fa-solid fa-inbox"></i>
                    <span>No tickets found</span>
                  </div>
                )}

                {!isRecentLoading && !recentError && recentTickets.map((ticket, idx) => {
                  const status = getStatusConfig(ticket.CallStatusText);
                  return (
                    <motion.div
                      key={ticket.InternalTicketID || idx}
                      className="recent-ticket-card"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {/* Card Top Row */}
                      <div className="rtc-top">
                        <div className="rtc-ticket-no">
                          <i className="fa-solid fa-hashtag"></i>
                          {ticket.TicketNo}
                        </div>
                        <span
                          className="rtc-status-badge"
                          style={{ color: status.color, background: status.bg }}
                        >
                          <i className={`fa-solid ${status.icon}`}></i>
                          {ticket.CallStatusText}
                        </span>
                      </div>

                      {/* Meta Grid */}
                      <div className="rtc-meta-grid">
                        <div className="rtc-meta-item">
                          <i className="fa-solid fa-user" style={{ color: '#6366f1' }}></i>
                          <span>{ticket.UserName}</span>
                        </div>
                        <div className="rtc-meta-item">
                          <i className="fa-solid fa-building" style={{ color: '#0ea5e9' }}></i>
                          <span>{ticket.BranchName}</span>
                        </div>
                        <div className="rtc-meta-item">
                          <i className="fa-solid fa-phone" style={{ color: '#10b981' }}></i>
                          <span>{ticket.Phone}</span>
                        </div>
                        <div className="rtc-meta-item">
                          <i className="fa-solid fa-tag" style={{ color: '#f59e0b' }}></i>
                          <span>{ticket.Type}</span>
                        </div>
                      </div>

                      {/* Remarks */}
                      {ticket.Remarks && (
                        <div className="rtc-remarks">
                          <i className="fa-solid fa-comment-dots"></i>
                          <span>{ticket.Remarks}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="rtc-footer">
                        <div className="rtc-footer-item">
                          <i className="fa-regular fa-calendar"></i>
                          <span>{ticket.CreationDate}</span>
                        </div>
                        {ticket.Delay && ticket.Delay !== '0' && (
                          <div className="rtc-delay">
                            <i className="fa-solid fa-clock"></i>
                            <span>{ticket.Delay}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Panel Footer */}
              {!isRecentLoading && recentTickets.length > 0 && (
                <div className="recent-panel-footer">
                  <span>{recentTickets.length} ticket{recentTickets.length !== 1 ? 's' : ''} found</span>
                  <button className="recent-refresh-btn" onClick={fetchRecentTickets}>
                    <i className="fa-solid fa-rotate-right"></i> Refresh
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Nav for responsiveness */}
      <div className="mobile-nav-v2">
        {navItems.slice(0, 4).map(item => (
          <div key={item.name} className={`mobile-nav-item ${activeTab === item.name ? 'active' : ''}`} onClick={() => setActiveTab(item.name)}>
            <i className={`fa-solid ${item.icon}`}></i>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;