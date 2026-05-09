import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './AgentStatus.css';

/* ── Utility: initials from full name ───────── */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

/* ── Gradient palette per-agent index ───────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff9a9e 100%)',
  'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
];

function AgentStatus() {
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [lastFetched, setLastFetched] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const navItems = [
    { name: 'Dashboard', icon: 'fa-house', href: '/home' },
    { name: 'Agent Status', icon: 'fa-user-group', href: '/agent-status' },
  ];

  /* ── Fetch ──────────────────────────────────── */
  const fetchAgentStatus = useCallback(async (date) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/unniService.asmx/loadAgentStatus?EntryDate=${date}`);
      const text = await res.text();
      const match = text.match(/<string[^>]*>(.*)<\/string>/s);
      const jsonStr = match ? match[1] : text;
      const data = JSON.parse(jsonStr);
      setAgents(data.success && data.AgentStatus ? data.AgentStatus : []);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load agent status:', err);
      setError('Unable to reach the server. Please try again.');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgentStatus(entryDate); }, [entryDate, fetchAgentStatus]);

  /* ── Stats ──────────────────────────────────── */
  const stats = useMemo(() => {
    const total = agents.length;
    const online = agents.filter(a => (a.Status || '').toLowerCase() === 'online').length;
    const offline = agents.filter(a => (a.Status || '').toLowerCase() === 'offline').length;
    const busy = agents.filter(a => !['online', 'offline'].includes((a.Status || '').toLowerCase())).length;
    const totalCallQ = agents.reduce((sum, a) => sum + parseInt(a.CallQ || '0', 10), 0);
    const onlinePct = total > 0 ? Math.round((online / total) * 100) : 0;
    return { total, online, offline, busy, totalCallQ, onlinePct };
  }, [agents]);

  /* ── Filter ─────────────────────────────────── */
  const filteredAgents = useMemo(() => {
    let list = agents;
    if (statusFilter !== 'All') {
      list = list.filter(a => (a.Status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.Agent || '').toLowerCase().includes(q) ||
        (a.Status || '').toLowerCase().includes(q) ||
        (a.Purpose || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [agents, statusFilter, searchQuery]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(agents.map(a => a.Status || 'Unknown'));
    return ['All', ...Array.from(set)];
  }, [agents]);

  /* ── Status config ──────────────────────────── */
  const getStatusConfig = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'online':  return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Online',  icon: 'fa-circle-check',  glow: '0 0 12px rgba(16,185,129,0.4)' };
      case 'offline': return { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Offline', icon: 'fa-circle-minus',  glow: 'none' };
      case 'busy':    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Busy',    icon: 'fa-circle-pause',  glow: '0 0 12px rgba(245,158,11,0.3)' };
      case 'break':   return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  label: 'Break',   icon: 'fa-mug-hot',       glow: '0 0 12px rgba(139,92,246,0.3)' };
      default:        return { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: status || 'Unknown', icon: 'fa-circle-dot', glow: 'none' };
    }
  };

  /* ── Donut chart SVG ────────────────────────── */
  const DonutChart = () => {
    const size = 120, stroke = 10, radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const segments = [
      { key: 'online',  count: stats.online,  color: '#10b981' },
      { key: 'offline', count: stats.offline, color: '#94a3b8' },
      { key: 'busy',    count: stats.busy,    color: '#f59e0b' },
    ].filter(s => s.count > 0);

    let offset = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
        {/* background ring */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map(seg => {
          const dash = (seg.count / (stats.total || 1)) * circumference;
          const el = (
            <circle
              key={seg.key}
              cx={size/2} cy={size/2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transition: 'all 0.8s ease' }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x="50%" y="46%" textAnchor="middle" className="donut-value">{stats.total}</text>
        <text x="50%" y="62%" textAnchor="middle" className="donut-label">agents</text>
      </svg>
    );
  };

  /* ── Animation variants ─────────────────────── */
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.06 } } };
  const itemVariants     = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 200 } } };
  const cardVariants     = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 260 } } };

  return (
    <div className={`agent-page ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><i className="fa-solid fa-headset"></i></div>
          {!isSidebarCollapsed && <span className="logo-text">Inpack</span>}
          <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>
        <nav className="nav-links">
          {navItems.map(item => (
            <a key={item.name} className={`nav-item ${item.name === 'Agent Status' ? 'active' : ''}`}
               href={item.href} title={isSidebarCollapsed ? item.name : ''} style={{ textDecoration: 'none' }}>
              <i className={`fa-solid ${item.icon}`}></i>
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="nav-item"><i className="fa-solid fa-right-from-bracket"></i>{!isSidebarCollapsed && <span>Logout</span>}</div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────── */}
      <motion.main className="as-main" initial="hidden" animate="visible" variants={containerVariants}>

        {/* Hero / Header Banner */}
        <motion.section className="as-hero" variants={itemVariants}>
          <div className="as-hero-bg"></div>
          <div className="as-hero-content">
            <div className="as-hero-left">
              <span className="as-hero-badge"><i className="fa-solid fa-signal"></i> Live Monitor</span>
              <h1>Agent Status</h1>

            </div>
            <div className="as-hero-right">
              <div className="as-date-input">
                <i className="fa-regular fa-calendar-days"></i>
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>
              <motion.button className="as-refresh-btn" onClick={() => fetchAgentStatus(entryDate)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isLoading}>
                <i className={`fa-solid fa-arrows-rotate ${isLoading ? 'fa-spin' : ''}`}></i>
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Metrics Row */}
        <motion.section className="as-metrics" variants={itemVariants}>
          {/* Left — Donut */}
          <motion.div className="as-donut-card" variants={cardVariants}>
            <DonutChart />
            <div className="as-donut-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span>Online <strong>{stats.online}</strong></div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#94a3b8' }}></span>Offline <strong>{stats.offline}</strong></div>
              {stats.busy > 0 && <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span>Busy <strong>{stats.busy}</strong></div>}
            </div>
          </motion.div>

          {/* Stat Cards */}
          {[
            { label: 'Total Agents',  value: stats.total,     icon: 'fa-users',          gradient: 'linear-gradient(135deg, #667eea, #764ba2)', lightBg: 'rgba(102,126,234,0.08)' },
            { label: 'Online Now',    value: stats.online,     icon: 'fa-circle-check',   gradient: 'linear-gradient(135deg, #10b981, #059669)', lightBg: 'rgba(16,185,129,0.08)' },
            { label: 'Offline',       value: stats.offline,    icon: 'fa-circle-minus',   gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', lightBg: 'rgba(148,163,184,0.08)' },
            { label: 'Call Queue',    value: stats.totalCallQ, icon: 'fa-phone-volume',   gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', lightBg: 'rgba(245,158,11,0.08)' },
          ].map((card, i) => (
            <motion.div className="as-metric-card" key={card.label} variants={cardVariants}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
              <div className="mc-icon" style={{ background: card.gradient }}><i className={`fa-solid ${card.icon}`}></i></div>
              <div className="mc-info">
                <span className="mc-label">{card.label}</span>
                <span className="mc-value">{card.value}</span>
              </div>
              {card.label === 'Online Now' && stats.total > 0 && (
                <div className="mc-pct-ring">
                  <svg viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${stats.onlinePct} ${100 - stats.onlinePct}`} strokeDashoffset="25"
                      strokeLinecap="round" style={{ transition: 'all 0.8s ease' }} />
                  </svg>
                  <span>{stats.onlinePct}%</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.section>

        {/* Toolbar */}
        <motion.section className="as-toolbar" variants={itemVariants}>
          <div className="as-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search by name, status, or purpose..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="as-search-clear" onClick={() => setSearchQuery('')}><i className="fa-solid fa-xmark"></i></button>}
          </div>
          <div className="as-toolbar-right">
            <div className="as-pills">
              {uniqueStatuses.map(s => (
                <button key={s} className={`as-pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s !== 'All' && <span className="pill-dot" style={{ background: getStatusConfig(s).color }}></span>}
                  {s}
                </button>
              ))}
            </div>
            <div className="as-view-toggle">
              <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} title="Card View">
                <i className="fa-solid fa-grip"></i>
              </button>
              <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} title="Table View">
                <i className="fa-solid fa-list"></i>
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── Loading / Error / Empty ─────────── */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div className="as-state-msg" key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="as-spinner"><div className="spinner-orbit"></div><i className="fa-solid fa-user-group"></i></div>
              <p>Fetching agent status…</p>
            </motion.div>
          )}
          {error && !isLoading && (
            <motion.div className="as-state-msg error" key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <p>{error}</p>
              <button onClick={() => fetchAgentStatus(entryDate)}>Retry</button>
            </motion.div>
          )}
          {!isLoading && !error && filteredAgents.length === 0 && (
            <motion.div className="as-state-msg empty" key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="empty-icon-wrap"><i className="fa-solid fa-user-slash"></i></div>
              <h3>No Agents Found</h3>
              <p>{agents.length === 0 ? `No data for ${entryDate}` : 'No agents match your filter'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card View ──────────────────────── */}
        {!isLoading && !error && filteredAgents.length > 0 && viewMode === 'cards' && (
          <motion.section className="as-card-grid" initial="hidden" animate="visible" variants={containerVariants}>
            {filteredAgents.map((agent, idx) => {
              const sc = getStatusConfig(agent.Status);
              const callQ = parseInt(agent.CallQ || '0', 10);
              return (
                <motion.div className="as-agent-card" key={agent.Agent + idx} variants={cardVariants}
                  whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
                  onClick={() => setSelectedAgent(agent)}>
                  {/* Status strip */}
                  <div className="ac-strip" style={{ background: sc.color }}></div>
                  {/* Avatar */}
                  <div className="ac-avatar" style={{ background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length] }}>
                    {getInitials(agent.Agent)}
                    <span className="ac-status-dot" style={{ background: sc.color, boxShadow: sc.glow }}></span>
                  </div>
                  {/* Name */}
                  <h4 className="ac-name">{agent.Agent}</h4>
                  {/* Status chip */}
                  <span className="ac-status-chip" style={{ color: sc.color, background: sc.bg }}>
                    <i className={`fa-solid ${sc.icon}`}></i> {sc.label}
                  </span>
                  {/* Meta */}
                  <div className="ac-meta">
                    {agent.Purpose && (
                      <div className="ac-meta-row">
                        <i className="fa-solid fa-clipboard-list"></i>
                        <span>{agent.Purpose}</span>
                      </div>
                    )}
                    {agent.BackIn && (
                      <div className="ac-meta-row">
                        <i className="fa-regular fa-clock"></i>
                        <span>Back in {agent.BackIn}</span>
                      </div>
                    )}
                    <div className="ac-meta-row">
                      <i className="fa-solid fa-headset"></i>
                      <span>Queue: <strong className={callQ > 0 ? 'q-active' : ''}>{callQ}</strong></span>
                    </div>
                  </div>
                  {/* Rank badge */}
                  <div className="ac-rank" title="Rank">{agent.Rank || idx + 1}</div>
                </motion.div>
              );
            })}
          </motion.section>
        )}

        {/* ── Table View ─────────────────────── */}
        {!isLoading && !error && filteredAgents.length > 0 && viewMode === 'table' && (
          <motion.section className="as-table-wrap" variants={itemVariants}>
            <div className="as-table-scroll">
              <table className="as-table">
                <thead>
                  <tr>
                    <th>#</th><th>Agent</th><th>Status</th><th>Purpose</th><th>Back In</th><th>Queue</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredAgents.map((agent, idx) => {
                      const sc = getStatusConfig(agent.Status);
                      const callQ = parseInt(agent.CallQ || '0', 10);
                      return (
                        <motion.tr key={agent.Agent + idx} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }} transition={{ delay: idx * 0.03 }}
                          onClick={() => setSelectedAgent(agent)} className="as-table-row">
                          <td><span className="t-rank">{agent.Rank || idx + 1}</span></td>
                          <td>
                            <div className="t-agent-cell">
                              <div className="t-avatar" style={{ background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length] }}>
                                {getInitials(agent.Agent)}
                                <span className="t-dot" style={{ background: sc.color, boxShadow: sc.glow }}></span>
                              </div>
                              <span className="t-name">{agent.Agent}</span>
                            </div>
                          </td>
                          <td>
                            <span className="t-status" style={{ color: sc.color, background: sc.bg }}>
                              <i className={`fa-solid ${sc.icon}`}></i> {sc.label}
                            </span>
                          </td>
                          <td className="t-purpose">{agent.Purpose || '—'}</td>
                          <td>
                            {agent.BackIn ? <span className="t-backin"><i className="fa-regular fa-clock"></i> {agent.BackIn}</span> : '—'}
                          </td>
                          <td><span className={`t-queue ${callQ > 0 ? 'active' : ''}`}>{callQ}</span></td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* Footer bar */}
        {!isLoading && filteredAgents.length > 0 && (
          <motion.div className="as-footer-bar" variants={itemVariants}>
            <span>Showing <strong>{filteredAgents.length}</strong> of <strong>{agents.length}</strong> agents</span>
            {lastFetched && <span className="as-timestamp"><i className="fa-regular fa-clock"></i> Updated {lastFetched}</span>}
          </motion.div>
        )}
      </motion.main>

      {/* ── Agent Detail Modal ──────────────── */}
      <AnimatePresence>
        {selectedAgent && (() => {
          const sc = getStatusConfig(selectedAgent.Status);
          const idx = agents.indexOf(selectedAgent);
          const callQ = parseInt(selectedAgent.CallQ || '0', 10);
          return (
            <motion.div className="as-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAgent(null)}>
              <motion.div className="as-modal" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }} onClick={e => e.stopPropagation()}>
                <button className="as-modal-close" onClick={() => setSelectedAgent(null)}><i className="fa-solid fa-xmark"></i></button>
                <div className="asm-header" style={{ background: AVATAR_GRADIENTS[Math.max(idx, 0) % AVATAR_GRADIENTS.length] }}>
                  <div className="asm-avatar">{getInitials(selectedAgent.Agent)}</div>
                  <h2>{selectedAgent.Agent}</h2>
                  <span className="asm-status" style={{ color: '#fff', background: 'rgba(255,255,255,0.2)' }}>
                    <i className={`fa-solid ${sc.icon}`}></i> {sc.label}
                  </span>
                </div>
                <div className="asm-body">
                  <div className="asm-detail"><span className="asm-key">Rank</span><span className="asm-val">{selectedAgent.Rank || '—'}</span></div>
                  <div className="asm-detail"><span className="asm-key">Status</span>
                    <span className="asm-val"><span className="asm-dot" style={{ background: sc.color }}></span>{sc.label}</span>
                  </div>
                  <div className="asm-detail"><span className="asm-key">Purpose</span><span className="asm-val">{selectedAgent.Purpose || '—'}</span></div>
                  <div className="asm-detail"><span className="asm-key">Back In</span><span className="asm-val">{selectedAgent.BackIn || '—'}</span></div>
                  <div className="asm-detail"><span className="asm-key">Call Queue</span>
                    <span className={`asm-val asm-queue ${callQ > 0 ? 'active' : ''}`}>{callQ}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Mobile Nav */}
      <div className="as-mobile-nav">
        {navItems.map(item => (
          <a key={item.name} className={`as-mn-item ${item.name === 'Agent Status' ? 'active' : ''}`} href={item.href}>
            <i className={`fa-solid ${item.icon}`}></i><span>{item.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default AgentStatus;
