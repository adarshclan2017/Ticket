import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './RoleSelect.css';

/* ── XML → JSON helper ─────────────────────────────────── */
function parseXmlJson(text) {
  try {
    const xml  = new DOMParser().parseFromString(text, 'text/xml');
    const node = xml.getElementsByTagName('string')[0];
    return JSON.parse(node ? node.textContent || node.innerText : text);
  } catch { return null; }
}

export default function RoleSelect() {
  const navigate = useNavigate();

  /* ── active section: null | 'customer' | 'employee' ── */
  const [active, setActive] = useState(null);

  /* ── CUSTOMER state ──────────────────────────────────── */
  const [branches,       setBranches]       = useState([]);
  const [branchLoading,  setBranchLoading]  = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchOpen,     setBranchOpen]     = useState(false);
  const [branchSearch,   setBranchSearch]   = useState('');
  const [pin,            setPin]            = useState(['', '', '', '']);
  const [custLoading,    setCustLoading]    = useState(false);
  const [custError,      setCustError]      = useState('');
  const pinRefs      = [useRef(), useRef(), useRef(), useRef()];
  const branchRef    = useRef();

  /* ── EMPLOYEE state ──────────────────────────────────── */
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError,   setEmpError]   = useState('');
  const [empSuccess, setEmpSuccess] = useState('');

  /* ── Fetch branches when customer section opens ──────── */
  useEffect(() => {
    if (active !== 'customer' || branches.length > 0) return;
    (async () => {
      setBranchLoading(true);
      try {
        const res  = await fetch(`${API_BASE}/unniService.asmx/loadBranch`);
        const text = await res.text();
        const data = parseXmlJson(text);
        const list = data?.Branch || data?.branch || data?.Branches
                   || (Array.isArray(data) ? data : []);
        setBranches(list);
      } catch { setBranches([]); }
      finally  { setBranchLoading(false); }
    })();
  }, [active]);

  /* ── Close branch dropdown on outside click ──────────── */
  useEffect(() => {
    const h = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target))
        setBranchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Filtered branches ───────────────────────────────── */
  const filteredBranches = branches.filter(b => {
    const name = (b.BranchName || b.branch_name || b.name || '').toLowerCase();
    const id   = String(b.BranchID || b.branch_id || b.id || '').toLowerCase();
    const q    = branchSearch.toLowerCase();
    return !q || name.includes(q) || id.includes(q);
  });

  /* ── PIN helpers ─────────────────────────────────────── */
  const handlePin = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin]; next[idx] = val.slice(-1);
    setPin(next); setCustError('');
    if (val && idx < 3) pinRefs[idx + 1].current?.focus();
  };
  const handlePinKey = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0)
      pinRefs[idx - 1].current?.focus();
  };
  const handlePinPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const next = ['', '', '', '']; [...digits].forEach((d, i) => { next[i] = d; });
    setPin(next);
    pinRefs[Math.min(digits.length, 3)].current?.focus();
  };

  /* ── Customer login ──────────────────────────────────── */
  const handleCustomerLogin = async () => {
    if (!selectedBranch) { setCustError('Please select your branch.'); return; }
    if (pin.join('').length < 4) { setCustError('Please enter your 4-digit PIN.'); return; }
    setCustLoading(true); setCustError('');
    try {
      const branchId   = selectedBranch.BranchID   || selectedBranch.branch_id   || selectedBranch.id   || '';
      const branchName = selectedBranch.BranchName || selectedBranch.branch_name || selectedBranch.name || '';
      /* Try PIN API — proceed regardless if endpoint missing */
      try {
        const res  = await fetch(`${API_BASE}/unniService.asmx/validateBranchLogin?BranchID=${branchId}&PIN=${pin.join('')}`);
        const data = parseXmlJson(await res.text());
        if (data?.success === false) { setCustError('Invalid PIN. Please try again.'); setCustLoading(false); return; }
      } catch { /* endpoint not available — skip */ }
      localStorage.setItem('userRole',       'customer');
      localStorage.setItem('customerBranch', JSON.stringify({ branchId, branchName }));
      navigate('/home');
    } catch { setCustError('Login failed. Please try again.'); }
    finally { setCustLoading(false); }
  };

  /* ── Employee login ──────────────────────────────────── */
  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    setEmpError(''); setEmpSuccess('');
    if (!username.trim()) { setEmpError('Please enter your username.'); return; }
    if (!password.trim()) { setEmpError('Please enter your password.'); return; }
    setEmpLoading(true);
    try {
      const res  = await fetch(
        `${API_BASE}/unniService.asmx/validateUserLogin?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`
      );
      const data = parseXmlJson(await res.text());
      if (data?.responseMessage === 'Success') {
        const u = data.user[0];
        localStorage.setItem('userData',   JSON.stringify(u));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole',   'employee');
        const empId  = Number(u.internalemployeeid ?? u.internal_employee_id ?? 0);
        const accLvl = Number(u.accesslevel        ?? u.access_level         ?? 0);
        localStorage.setItem('canAccessL3AndAssign', (empId === 82 || accLvl === 1) ? 'true' : 'false');
        setEmpSuccess('Login successful! Redirecting…');
        setTimeout(() => navigate('/home'), 900);
      } else { setEmpError('Invalid username or password.'); }
    } catch { setEmpError('Login failed. Please try again.'); }
    finally { setEmpLoading(false); }
  };

  /* ── helpers ─────────────────────────────────────────── */
  const getBranchLabel = (b) => b.BranchName || b.branch_name || b.name || 'Unknown';
  const getBranchId    = (b) => b.BranchID   || b.branch_id   || b.id   || '';

  const panelVariants = {
    hidden:  { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: 'auto', marginTop: 20,
               transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
    exit:    { opacity: 0, height: 0, marginTop: 0,
               transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  };

  return (
    <div className="sl-page">
      {/* ── Animated background ─────────────────────────── */}
      <div className="sl-bg-orb sl-orb-1" />
      <div className="sl-bg-orb sl-orb-2" />
      <div className="sl-bg-orb sl-orb-3" />

      <motion.div
        className="sl-wrapper"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* ── Brand ─────────────────────────────────────── */}
        <div className="sl-brand">
          <div className="sl-brand-icon">
            <i className="fa-solid fa-headset" />
          </div>
          <div>
            <span className="sl-brand-name">Inpack</span>
            <span className="sl-brand-tagline">Support Ticket System</span>
          </div>
        </div>

        <div className="sl-headline">
          <h1>Welcome Back</h1>
          <p>Select your role to continue</p>
        </div>

        {/* ════════════════════════════════════════════════
            CUSTOMER SECTION
            ════════════════════════════════════════════════ */}
        <div
          className={`sl-section sl-section--customer ${active === 'customer' ? 'expanded' : ''}`}
          id="sl-customer-section"
        >
          {/* Section header — always visible */}
          <button
            className="sl-section-header"
            onClick={() => setActive(active === 'customer' ? null : 'customer')}
            id="sl-customer-toggle"
            aria-expanded={active === 'customer'}
          >
            <div className="sl-section-icon sl-icon--cust">
              <i className="fa-solid fa-user" />
            </div>
            <div className="sl-section-label">
              <span className="sl-section-title">Customer</span>
              <span className="sl-section-desc">No login required — instant access</span>
            </div>
            <div className={`sl-section-arrow ${active === 'customer' ? 'open' : ''}`}>
              <i className="fa-solid fa-chevron-down" />
            </div>
          </button>

          {/* Collapsible form */}
          <AnimatePresence initial={false}>
            {active === 'customer' && (
              <motion.div
                key="cust-panel"
                className="sl-form-panel"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Customer info */}
                <div className="sl-cust-info">
                  <div className="sl-cust-info-icon">
                    <i className="fa-solid fa-bolt" />
                  </div>
                  <div>
                    <p className="sl-cust-info-title">Instant Access</p>
                    <p className="sl-cust-info-desc">No account needed. Raise a support ticket in seconds.</p>
                  </div>
                </div>

                <button
                  className="sl-submit-btn sl-btn--cust"
                  onClick={() => {
                    localStorage.setItem('userRole', 'customer');
                    navigate('/home');
                  }}
                  id="sl-customer-login-btn"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket" /> Login as Customer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="sl-divider"><span>or</span></div>

        {/* ════════════════════════════════════════════════
            EMPLOYEE SECTION
            ════════════════════════════════════════════════ */}
        <div
          className={`sl-section sl-section--employee ${active === 'employee' ? 'expanded' : ''}`}
          id="sl-employee-section"
        >
          {/* Section header */}
          <button
            className="sl-section-header"
            onClick={() => setActive(active === 'employee' ? null : 'employee')}
            id="sl-employee-toggle"
            aria-expanded={active === 'employee'}
          >
            <div className="sl-section-icon sl-icon--emp">
              <i className="fa-solid fa-user-tie" />
            </div>
            <div className="sl-section-label">
              <span className="sl-section-title">Employee</span>
              <span className="sl-section-desc">Login with username &amp; password</span>
            </div>
            <div className={`sl-section-arrow ${active === 'employee' ? 'open' : ''}`}>
              <i className="fa-solid fa-chevron-down" />
            </div>
          </button>

          {/* Collapsible form */}
          <AnimatePresence initial={false}>
            {active === 'employee' && (
              <motion.div
                key="emp-panel"
                className="sl-form-panel"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <form onSubmit={handleEmployeeLogin} className="sl-emp-form" noValidate>
                  {/* Username */}
                  <div className="sl-field">
                    <label className="sl-label" htmlFor="sl-username">
                      <i className="fa-solid fa-user" /> Username
                    </label>
                    <div className="sl-input-wrap">
                      <input
                        id="sl-username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setEmpError(''); }}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="sl-field" style={{ marginTop: 14 }}>
                    <label className="sl-label" htmlFor="sl-password">
                      <i className="fa-solid fa-lock" /> Password
                    </label>
                    <div className="sl-input-wrap">
                      <input
                        id="sl-password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setEmpError(''); }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="sl-eye-btn"
                        onClick={() => setShowPass(p => !p)}
                        id="sl-toggle-pass"
                      >
                        <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Error / Success */}
                  <AnimatePresence>
                    {empError && (
                      <motion.p className="sl-error"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <i className="fa-solid fa-circle-exclamation" /> {empError}
                      </motion.p>
                    )}
                    {empSuccess && (
                      <motion.p className="sl-success"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <i className="fa-solid fa-circle-check" /> {empSuccess}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    className="sl-submit-btn sl-btn--emp"
                    disabled={empLoading}
                    id="sl-employee-login-btn"
                  >
                    {empLoading
                      ? <><span className="sl-spinner" /> Signing in…</>
                      : <><i className="fa-solid fa-arrow-right-to-bracket" /> Login as Employee</>
                    }
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="sl-footer">
          <i className="fa-solid fa-shield-halved" />
          Your session is secured &amp; private
        </p>
      </motion.div>
    </div>
  );
}
