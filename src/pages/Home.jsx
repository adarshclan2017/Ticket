import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../apiConfig';
import './Home.css';

function Home() {
  // Read role set by RoleSelect page
  const userRole = localStorage.getItem('userRole') || 'employee'; // default to employee
  const isCustomer = userRole === 'customer';
  const navigate = useNavigate();

  // Redirect employee to pending tickets immediately
  React.useEffect(() => {
    if (!isCustomer) {
      navigate('/pending-tickets', { replace: true });
    }
  }, [isCustomer, navigate]);
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
  const [activeTab, setActiveTab] = useState('Home');
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  // Support Type dropdown state
  const [supportTypes, setSupportTypes] = useState([]);
  const [isSupportTypesLoading, setIsSupportTypesLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  // State for Sidebar Toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 1024);

  // State for Recent Records Panel
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', damping: 20, stiffness: 140 } 
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 25 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: 'spring', damping: 24, stiffness: 280 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.94, 
      y: 20, 
      transition: { duration: 0.18 } 
    }
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
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const stringNode = xmlDoc.getElementsByTagName('string')[0];
        const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;
        
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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            icon: '/infolab.png'
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
      icon: '/infolab.png',
      badge: '/infolab.png',
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
      try { new Notification(title, options); } catch (_) { }
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
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const params = new URLSearchParams({
        InternalUserID: userData.internal_user_id || '4',
        UserName: advancedSettings.userName || userData.user_name || 'Admin',
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
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;

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
        phone: formData.phoneNumber,
        category: formData.category,
        branch: advancedSettings.branchName || 'INFOLAB TECHNOLOGIES HO',
        remarks: formData.remarks,
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
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const internalUserId = userData.internal_user_id || '4';
      const res = await fetch(`${API_BASE}/unniService.asmx/loadRaisedSupportTickets?InternalUserID=${internalUserId}`);
      const text = await res.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];
      const jsonStr = stringNode ? stringNode.textContent || stringNode.innerText : text;
      
      const data = JSON.parse(jsonStr);
      // SupportTickets is the expected key based on API tests
      setRecentTickets(data.SupportTickets || []);
      console.log('Tickets received:', data.SupportTickets);
    } catch (err) {
      console.error('Failed to load recent tickets:', err);
      setRecentError('Failed to load tickets. Please try again.');
    } finally {
      setIsRecentLoading(false);
    }
  };

  const allNavItems = [
    { name: 'Home', icon: 'fa-house' },
    { name: 'Agent Status', icon: 'fa-user-group', href: '/agent-status' },
    { name: 'Pending Tickets', icon: 'fa-ticket', href: '/pending-tickets' },
    { name: 'Recent Records', icon: 'fa-clock-rotate-left' },
  ];

  // Employees see only Pending Tickets & Recent Records
  // Customers see Home, Agent Status & Recent Records
  const navItems = isCustomer
    ? allNavItems.filter(item => item.name !== 'Pending Tickets')
    : allNavItems.filter(item => item.name !== 'Home' && item.name !== 'Agent Status');

  // Status badge config
  const getStatusConfig = (statusText) => {
    switch ((statusText || '').toLowerCase()) {
      case 'raised': return { color: '#f59e0b', bg: '#fef3c7', icon: 'fa-circle-exclamation' };
      case 'assigned': return { color: '#3b82f6', bg: '#eff6ff', icon: 'fa-user-check' };
      case 'resolved': return { color: '#10b981', bg: '#d1fae5', icon: 'fa-circle-check' };
      case 'closed': return { color: '#6b7280', bg: '#f3f4f6', icon: 'fa-circle-xmark' };
      default: return { color: '#8b5cf6', bg: '#ede9fe', icon: 'fa-circle-dot' };
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
                onClick={() => {
                  setActiveTab(item.name);
                  if (item.name === 'Recent Records') fetchRecentTickets();
                }}
                title={isSidebarCollapsed ? item.name : ''}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </div>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <a
            href="/"
            onClick={() => {
              localStorage.removeItem('userData');
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('userRole');
            }}
            className="nav-item"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', width: '100%' }}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            {!isSidebarCollapsed && <span>Logout</span>}
          </a>
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

          </div>
        </header>

        <div className="form-grid">
          {/* Main Form Column */}
          <div className="form-main-card">
            <motion.div className="feature-card-v2" variants={itemVariants}>
              <div className="feature-info">
                <span className="tiny-label">New Incident</span>
                <h3>File a support ticket</h3>

              </div>
              <div className="feature-icon-v2">
                <i className="fa-solid fa-ticket-simple"></i>
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="vertical-form-flow">
              <motion.div className="section-label-v2" variants={itemVariants}>Core Incident Details</motion.div>

              <motion.div className="input-group-v2" variants={itemVariants}>
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

                  <div className="custom-dropdown" ref={dropdownRef}>
                    <div
                      className={`input-box-v2 dropdown-trigger no-icon-trigger ${isDropdownOpen ? 'active' : ''}`}
                      onClick={() => !isSupportTypesLoading && setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="input-content-v2">
                        <label>Ticket Category</label>
                        <div className={`selected-value ${!formData.category ? 'placeholder' : ''}`}>
                          {isSupportTypesLoading ? 'Loading...' : formData.category || 'Select category'}
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-down select-arrow ${isDropdownOpen ? 'rotated' : ''}`}></i>
                    </div>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          className="dropdown-menu-v2"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <div className="dropdown-scroll-area">
                            {supportTypes.length === 0 ? (
                              <div className="dropdown-empty">No categories found</div>
                            ) : (
                              supportTypes.map((item) => (
                                <div
                                  key={item.internal_lookup_id}
                                  className={`dropdown-item-v2 text-only ${formData.categoryId === item.internal_lookup_id.toString() ? 'selected' : ''}`}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      category: item.lookup_data,
                                      categoryId: item.internal_lookup_id.toString()
                                    }));
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <div className="item-text">
                                    <span>{item.lookup_data}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              </motion.div>

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
            <motion.div className="section-label-v2" variants={itemVariants}>System Environment</motion.div>
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

            <>
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
            </>


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
              className="recent-backdrop"
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
                      onClick={() => { setSelectedTicket(ticket); setIsRecentOpen(false); }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Card Header */}
                      <div className="rtc-header">
                        <div className="rtc-ticket-no">
                          <span className="hash-icon">#</span> {ticket.TicketNo}
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
                          <i className="fa-solid fa-user" style={{ color: '#8b5cf6' }}></i>
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

                      {/* Remarks Section */}
                      {ticket.Remarks && (
                        <div className="rtc-remarks-box">
                          <div className="rtc-remarks-icon">
                            <i className="fa-solid fa-comment-dots"></i>
                          </div>
                          <div className="rtc-remarks-text">{ticket.Remarks}</div>
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="rtc-footer">
                        <div className="rtc-footer-item">
                          <i className="fa-regular fa-calendar"></i>
                          <span>{ticket.CreationDate}</span>
                        </div>
                        {ticket.Delay && ticket.Delay !== '0' && (
                          <div className="rtc-duration-pill">
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

      {/* Ticket Details Popup Page */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
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
                    color: getStatusConfig(selectedTicket.CallStatusText).color,
                    background: getStatusConfig(selectedTicket.CallStatusText).bg
                  }}>
                    <i className={`fa-solid ${getStatusConfig(selectedTicket.CallStatusText).icon}`}></i>
                    {selectedTicket.CallStatusText}
                  </div>
                  <h2>Ticket #{selectedTicket.TicketNo}</h2>
                </div>
                <button className="detail-close-btn" onClick={() => setSelectedTicket(null)}>
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
                        <span>{selectedTicket.UserName}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-building"></i>
                      <div className="info-text">
                        <label>Branch</label>
                        <span>{selectedTicket.BranchName}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-phone"></i>
                      <div className="info-text">
                        <label>Phone</label>
                        <span>{selectedTicket.Phone}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <i className="fa-solid fa-layer-group"></i>
                      <div className="info-text">
                        <label>Category</label>
                        <span>{selectedTicket.Type}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-label">Problem Remarks</h4>
                  <div className="detail-remarks-box">
                    <i className="fa-solid fa-quote-left"></i>
                    <p>{selectedTicket.Remarks || 'No remarks provided.'}</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-label">Timeline Details</h4>
                  <div className="detail-meta-row">
                    <div className="meta-sub-item">
                      <i className="fa-regular fa-calendar"></i>
                      <span>Created: {selectedTicket.CreationDate}</span>
                    </div>
                    {selectedTicket.Delay && selectedTicket.Delay !== '0' && (
                      <div className="meta-sub-item delay">
                        <i className="fa-solid fa-clock"></i>
                        <span>Resolution Delay: {selectedTicket.Delay}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-footer">
                <button className="detail-primary-btn" onClick={() => setSelectedTicket(null)}>
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Nav for responsiveness */}
      <div className="mobile-nav-v2">
        {navItems.map(item => (
          item.href ? (
            <a key={item.name} className="mobile-nav-item" href={item.href} style={{ textDecoration: 'none' }}>
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.name}</span>
            </a>
          ) : (
            <div key={item.name} className={`mobile-nav-item ${activeTab === item.name ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.name);
                if (item.name === 'Recent Records') {
                  fetchRecentTickets();
                } else if (item.name === 'Home') {
                  setIsRecentOpen(false);
                }
              }}>
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.name}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default Home;