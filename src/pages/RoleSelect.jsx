import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, INPACK_API_BASE } from '../apiConfig';
import './RoleSelect.css';

/* ── XML → JSON helper ─────────────────────────────────── */
function parseXmlJson(text) {
  try {
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const node = xml.getElementsByTagName('string')[0];
    return JSON.parse(node ? node.textContent || node.innerText : text);
  } catch { return null; }
}

export default function RoleSelect() {
  const navigate = useNavigate();

  /* ── active section: null | 'customer' | 'employee' ── */
  const [active, setActive] = useState(null);

  /* ── CUSTOMER state ──────────────────────────────────── */
  const [custPhone, setCustPhone] = useState('');
  const [custStep, setCustStep] = useState('phone'); // 'phone' | 'otp' | 'branch' | 'pin'
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [receivedOtp, setReceivedOtp] = useState('');
  const [receivedImei, setReceivedImei] = useState('');
  const [clientData, setClientData] = useState(null);
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState('');
  const [custSuccess, setCustSuccess] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const branchDropdownRef = useRef(null);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpPopupVal, setOtpPopupVal] = useState('');
  const [pinCode, setPinCode] = useState(['', '', '', '']);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus the first OTP or PIN box when entering those steps
  useEffect(() => {
    if (custStep === 'otp') {
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    } else if (custStep === 'pin') {
      setTimeout(() => {
        pinRefs[0].current?.focus();
      }, 100);
    }
  }, [custStep]);

  /* ── EMPLOYEE state ──────────────────────────────────── */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState('');
  const [empSuccess, setEmpSuccess] = useState('');

  /* ── OTP helpers ─────────────────────────────────────── */
  const handleOtpInput = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpCode]; next[idx] = val.slice(-1);
    setOtpCode(next); setCustError('');
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
  };
  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0)
      otpRefs[idx - 1].current?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const next = ['', '', '', ''];[...digits].forEach((d, i) => { next[i] = d; });
    setOtpCode(next);
    otpRefs[Math.min(digits.length, 3)].current?.focus();
  };

  /* ── PIN helpers ─────────────────────────────────────── */
  const handlePinInput = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pinCode]; next[idx] = val.slice(-1);
    setPinCode(next); setCustError('');
    if (val && idx < 3) pinRefs[idx + 1].current?.focus();
  };
  const handlePinKey = (idx, e) => {
    if (e.key === 'Backspace' && !pinCode[idx] && idx > 0)
      pinRefs[idx - 1].current?.focus();
  };
  const handlePinPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const next = ['', '', '', ''];[...digits].forEach((d, i) => { next[i] = d; });
    setPinCode(next);
    pinRefs[Math.min(digits.length, 3)].current?.focus();
  };

  /* ── Customer Send OTP ───────────────────────────────── */
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!custPhone.trim()) { setCustError('Please enter your phone number.'); return; }

    setCustLoading(true); setCustError(''); setCustSuccess('');
    try {
      const res = await fetch(`${INPACK_API_BASE}/InPackService.asmx/validatePhoneno?Phoneno=${encodeURIComponent(custPhone.trim())}`);
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const text = await res.text();
      const data = parseXmlJson(text);
      if (data && data.success) {
        const otpVal = data.OTP || '0000';
        setReceivedOtp(otpVal);
        console.log("Your OTP verification code is:", otpVal);
        console.log(`%c🔑 OTP CODE: ${otpVal} 🔑`, 'color: #06b6d4; font-size: 20px; font-weight: bold; background: #0f172a; padding: 8px 12px; border-radius: 4px; border: 1px solid #06b6d4;');
        setReceivedImei(data.IMEI || '');
        setCustStep('otp');
        // Reset the OTP inputs to empty for manual typing
        setOtpCode(['', '', '', '']);
        setOtpPopupVal(otpVal);
        setShowOtpPopup(true);
      } else {
        setCustError(data?.message || 'Phone number verification failed.');
      }
    } catch (err) {
      console.error('Phone validation error:', err);
      setCustError(err.message || 'Connection failed. Please try again.');
    } finally {
      setCustLoading(false);
    }
  };

  /* ── Customer Verify OTP & Login ─────────────────────── */
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const codeStr = otpCode.join('');
    if (codeStr.length < 4) { setCustError('Please enter the 4-digit OTP.'); return; }

    setCustLoading(true); setCustError(''); setCustSuccess('');
    try {
      const res = await fetch(
        `${INPACK_API_BASE}/InPackService.asmx/saveUserInfo?otp=${encodeURIComponent(codeStr)}&IMEI=${encodeURIComponent(receivedImei)}&phoneNo=${encodeURIComponent(custPhone.trim())}`
      );
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const text = await res.text();
      const data = parseXmlJson(text);

      if (data && (data.success === true || data.success === 'true' || data.responseMessage === 'Success')) {
        // Fetch branch list
        try {
          const resPhone = await fetch(
            `${INPACK_API_BASE}/InPackService.asmx/validatePhone?IMEI=${encodeURIComponent(receivedImei)}`
          );
          if (resPhone.ok) {
            const phoneText = await resPhone.text();
            const phoneData = parseXmlJson(phoneText);
            if (phoneData && phoneData.success && phoneData.Branches && phoneData.Branches.length > 0) {
              setClientData(phoneData);
              setBranches(phoneData.Branches);
              setSelectedBranch(phoneData.Branches[0]);
              setCustStep('branch');
              return;
            }
          }
        } catch (phoneErr) {
          console.error('Failed to validate phone details:', phoneErr);
        }

        // Fallback
        localStorage.setItem('userRole', 'customer');
        localStorage.setItem('customerPhone', custPhone.trim());
        localStorage.setItem('customerImei', receivedImei);
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        localStorage.setItem('customerBranchName', 'Inpack App Test');
        localStorage.setItem('customerBranchId', 'InpackAppTest');
        localStorage.setItem('customerUserName', 'OWNER');
        localStorage.setItem('customerBranchUserId', '41');

        setCustSuccess('OTP Verified!');
        setTimeout(() => {
          navigate('/home');
        }, 1200);
      } else {
        const rawMsg = data?.message || data?.responseMessage;
        const finalMsg = (rawMsg && !rawMsg.includes('went wrong')) ? rawMsg : 'Invalid OTP. Please try again.';
        setCustError(finalMsg);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setCustError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setCustLoading(false);
    }
  };

  /* ── Customer Proceed to PIN Entry ───────────────────── */
  const handleBranchSelectProceed = (e) => {
    if (e) e.preventDefault();
    if (!selectedBranch) { setCustError('Please select a branch.'); return; }
    
    setCustError('');
    setCustSuccess('');
    
    const expectedPin = selectedBranch.pin || selectedBranch.PIN || '2255';
    // Reset the PIN inputs to empty for manual typing
    setPinCode(['', '', '', '']);
    setCustStep('pin');
    console.log(`%c🔐 BRANCH PIN: ${expectedPin} 🔐`, 'color: #10b981; font-size: 20px; font-weight: bold; background: #0f172a; padding: 8px 12px; border-radius: 4px; border: 1px solid #10b981;');
  };

  /* ── Customer Verify PIN & Login ─────────────────────── */
  const handleVerifyPinAndLogin = (e) => {
    if (e) e.preventDefault();
    const enteredPin = pinCode.join('');
    if (enteredPin.length < 4) { setCustError('Please enter the 4-digit PIN.'); return; }

    const expectedPin = selectedBranch?.pin || selectedBranch?.PIN || '2255';
    if (enteredPin !== expectedPin) {
      setCustError('Invalid PIN. Please try again.');
      return;
    }

    setCustLoading(true); setCustError(''); setCustSuccess('');
    try {
      localStorage.setItem('userRole', 'customer');
      localStorage.setItem('customerPhone', custPhone.trim());
      localStorage.setItem('customerImei', receivedImei);
      localStorage.removeItem('userData');
      localStorage.removeItem('isLoggedIn');

      const branchName = selectedBranch.branch_name || selectedBranch.BranchName || 'Unknown Branch';
      const branchId = selectedBranch.branch_id || selectedBranch.BranchID || '';
      const userName = selectedBranch.user_name || selectedBranch.UserName || 'OWNER';
      const internalUserId = clientData?.companies?.[0]?.internaluserid || clientData?.companies?.[0]?.internal_user_id || '';
      const internalCompanyId = selectedBranch.internal_company_id || selectedBranch.InternalCompanyID || '';
      const licenseKey = selectedBranch.license_key || selectedBranch.LicenseKey || '';
      const isApprover = selectedBranch.is_approver || selectedBranch.IsApprover || '';
      
      const companyName = clientData?.companies?.[0]?.company_name || '';
      const clientId = clientData?.client_id || '';
      const clientName = clientData?.client_name || '';
      const contactPerson = clientData?.contact_person || '';
      const email = clientData?.email || '';
      const appVersion = clientData?.AppVersion?.[0]?.App_Version || '';

      localStorage.setItem('customerBranchName', branchName);
      localStorage.setItem('customerBranchId', branchId);
      localStorage.setItem('customerUserName', userName);
      localStorage.setItem('customerBranchUserId', internalUserId);
      localStorage.setItem('customerInternalUserId', internalUserId);
      localStorage.setItem('customerInternalCompanyId', internalCompanyId);
      localStorage.setItem('customerLicenseKey', licenseKey);
      localStorage.setItem('customerIsApprover', isApprover);
      
      localStorage.setItem('customerCompanyName', companyName);
      localStorage.setItem('customerClientId', clientId);
      localStorage.setItem('customerClientName', clientName);
      localStorage.setItem('customerContactPerson', contactPerson);
      localStorage.setItem('customerEmail', email);
      localStorage.setItem('customerAppVersion', appVersion);

      // Store direct keys for general use
      localStorage.setItem('branch', branchName);
      localStorage.setItem('branchId', branchId);
      localStorage.setItem('branchUserId', internalUserId);

      // Store full objects for any further references
      localStorage.setItem('customerBranch', JSON.stringify(selectedBranch));
      if (clientData) {
        localStorage.setItem('customerClientData', JSON.stringify(clientData));
      }

      setCustSuccess(`Logged in successfully for branch: ${branchName}`);
      setTimeout(() => {
        navigate('/home');
      }, 1200);
    } catch (err) {
      console.error('PIN verification login error:', err);
      setCustError('An error occurred during login. Please try again.');
    } finally {
      setCustLoading(false);
    }
  };

  /* ── Employee login ──────────────────────────────────── */
  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    setEmpError(''); setEmpSuccess('');
    if (!username.trim()) { setEmpError('Please enter your username.'); return; }
    if (!password.trim()) { setEmpError('Please enter your password.'); return; }
    setEmpLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/unniService.asmx/validateUserLogin?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`
      );
      const data = parseXmlJson(await res.text());
      if (data?.responseMessage === 'Success') {
        const u = data.user[0];
        localStorage.setItem('userData', JSON.stringify(u));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'employee');
        const empId = Number(u.internalemployeeid ?? u.internal_employee_id ?? 0);
        const accLvl = Number(u.accesslevel ?? u.access_level ?? 0);
        localStorage.setItem('canAccessL3AndAssign', (empId === 82 || accLvl === 1) ? 'true' : 'false');
        setEmpSuccess('Login successful! Redirecting…');
        setTimeout(() => navigate('/home'), 900);
      } else { setEmpError('Invalid username or password.'); }
    } catch { setEmpError('Login failed. Please try again.'); }
    finally { setEmpLoading(false); }
  };

  /* ── helpers ─────────────────────────────────────────── */
  const getBranchLabel = (b) => b.BranchName || b.branch_name || b.name || 'Unknown';
  const getBranchId = (b) => b.BranchID || b.branch_id || b.id || '';

  const panelVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: {
      opacity: 1, height: 'auto', marginTop: 20,
      transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
      opacity: 0, height: 0, marginTop: 0,
      transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
    },
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
              <span className="sl-section-desc">Login with phone verification</span>
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
                {custStep === 'phone' && (
                  <form onSubmit={handleSendOtp} className="sl-emp-form" noValidate>
                    <div className="sl-field">
                      <label className="sl-label">
                        <i className="fa-solid fa-phone" /> Phone Number
                      </label>
                      <div className="sl-input-wrap">
                        <i className="fa-solid fa-phone" style={{ color: '#00bcd4', fontSize: '14px', marginRight: '4px' }} />
                        <input
                          type="tel"
                          placeholder="Enter phone number (e.g. 8137028080)"
                          value={custPhone}
                          onChange={(e) => { setCustPhone(e.target.value); setCustError(''); }}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {custError && (
                        <motion.div className="sl-error"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-exclamation" /> {custError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      className="sl-submit-btn sl-btn--cust"
                      disabled={custLoading}
                      id="sl-customer-verify-phone-btn"
                    >
                      {custLoading ? (
                        <><span className="sl-spinner" /> Verifying...</>
                      ) : (
                        <><i className="fa-solid fa-paper-plane" /> Verify Phone Number</>
                      )}
                    </button>
                  </form>
                )}

                {custStep === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="sl-emp-form" noValidate>
                    <div className="sl-field">
                      <label className="sl-label">
                        <i className="fa-solid fa-key" /> Enter OTP Code
                      </label>
                      <div className="sl-pin-row" style={{ justifyContent: 'center', margin: '8px 0' }}>
                        {otpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={otpRefs[idx]}
                            type="text"
                            maxLength={1}
                            className={`sl-pin-box ${digit ? 'filled' : ''}`}
                            value={digit}
                            onChange={(e) => handleOtpInput(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKey(idx, e)}
                            onPaste={handleOtpPaste}
                            id={`sl-otp-box-${idx}`}
                          />
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {custError && (
                        <motion.div className="sl-error"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-exclamation" /> {custError}
                        </motion.div>
                      )}
                      {custSuccess && (
                        <motion.div className="sl-success"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-check" /> {custSuccess}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="sl-btn-row">
                      <button
                        type="button"
                        className="sl-submit-btn sl-btn--secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setCustStep('phone');
                          setCustError('');
                          setCustSuccess('');
                        }}
                      >
                        <i className="fa-solid fa-arrow-left" /> Back
                      </button>
                      <button
                        type="submit"
                        className="sl-submit-btn sl-btn--cust"
                        disabled={custLoading}
                        style={{ flex: 1.8 }}
                        id="sl-customer-verify-otp-btn"
                      >
                        {custLoading ? (
                          <><span className="sl-spinner" /> Verifying...</>
                        ) : (
                          <><i className="fa-solid fa-check" /> Verify &amp; Login</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {custStep === 'branch' && (
                  <form onSubmit={handleBranchSelectProceed} className="sl-emp-form" noValidate>
                    <div className="sl-field" ref={branchDropdownRef}>
                      <label className="sl-label">
                        <i className="fa-solid fa-building" /> Select Branch
                      </label>
                      <div className="sl-dropdown">
                        <button
                          type="button"
                          className={`sl-dd-trigger ${selectedBranch ? 'has-val' : ''} ${isBranchDropdownOpen ? 'open' : ''}`}
                          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                        >
                          <i className="fa-solid fa-store" style={{ color: '#00bcd4', fontSize: '14px' }}></i>
                          <span className="sl-dd-label">
                            {selectedBranch ? (selectedBranch.branch_name || selectedBranch.BranchName) : 'Select a branch...'}
                          </span>
                          <i className={`fa-solid fa-chevron-down sl-dd-chevron ${isBranchDropdownOpen ? 'rotated' : ''}`}></i>
                        </button>

                        <AnimatePresence>
                          {isBranchDropdownOpen && (
                            <motion.div
                              className="sl-dd-panel"
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                              <div className="sl-dd-search">
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <input
                                  type="text"
                                  placeholder="Search branch..."
                                  value={branchSearch}
                                  onChange={(e) => setBranchSearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="sl-dd-list">
                                {branches.filter(b => {
                                  const name = (b.branch_name || b.BranchName || '').toLowerCase();
                                  return name.includes(branchSearch.toLowerCase());
                                }).length === 0 ? (
                                  <div className="sl-dd-state">No branches found</div>
                                ) : (
                                  branches
                                    .filter(b => {
                                      const name = (b.branch_name || b.BranchName || '').toLowerCase();
                                      return name.includes(branchSearch.toLowerCase());
                                    })
                                    .map((b) => {
                                      const isSel = selectedBranch && (b.branch_id === selectedBranch.branch_id || b.BranchID === selectedBranch.BranchID);
                                      const name = b.branch_name || b.BranchName || 'Unknown';
                                      const id = b.branch_id || b.BranchID || '';
                                      return (
                                        <div
                                          key={id}
                                          className={`sl-dd-item ${isSel ? 'selected' : ''}`}
                                          onClick={() => {
                                            setSelectedBranch(b);
                                            setIsBranchDropdownOpen(false);
                                            setBranchSearch('');
                                          }}
                                        >
                                          <div className="sl-dd-avatar">
                                            {name.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="sl-dd-meta">
                                            <span className="sl-dd-name">{name}</span>
                                            <span className="sl-dd-id">ID: {id}</span>
                                          </div>
                                          {isSel && (
                                            <i className="fa-solid fa-check sl-dd-check"></i>
                                          )}
                                        </div>
                                      );
                                    })
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <AnimatePresence>
                      {custError && (
                        <motion.div className="sl-error"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-exclamation" /> {custError}
                        </motion.div>
                      )}
                      {custSuccess && (
                        <motion.div className="sl-success"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-check" /> {custSuccess}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="sl-btn-row">
                      <button
                        type="button"
                        className="sl-submit-btn sl-btn--secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setCustStep('otp');
                          setCustError('');
                          setCustSuccess('');
                        }}
                      >
                        <i className="fa-solid fa-arrow-left" /> Back
                      </button>
                      <button
                        type="submit"
                        className="sl-submit-btn sl-btn--cust"
                        disabled={custLoading}
                        style={{ flex: 1.8 }}
                        id="sl-customer-confirm-branch-btn"
                      >
                        {custLoading ? (
                          <><span className="sl-spinner" /> Proceeding...</>
                        ) : (
                          <><i className="fa-solid fa-arrow-right" /> Continue</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {custStep === 'pin' && (
                  <form onSubmit={handleVerifyPinAndLogin} className="sl-emp-form" noValidate>
                    <div className="sl-field">
                      <label className="sl-label">
                        <i className="fa-solid fa-lock" /> Enter Branch PIN
                      </label>
                      <div className="sl-pin-row" style={{ justifyContent: 'center', margin: '8px 0' }}>
                        {pinCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={pinRefs[idx]}
                            type="password"
                            maxLength={1}
                            className={`sl-pin-box ${digit ? 'filled' : ''}`}
                            value={digit}
                            onChange={(e) => handlePinInput(idx, e.target.value)}
                            onKeyDown={(e) => handlePinKey(idx, e)}
                            onPaste={handlePinPaste}
                            id={`sl-pin-box-${idx}`}
                          />
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {custError && (
                        <motion.div className="sl-error"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-exclamation" /> {custError}
                        </motion.div>
                      )}
                      {custSuccess && (
                        <motion.div className="sl-success"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <i className="fa-solid fa-circle-check" /> {custSuccess}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="sl-btn-row">
                      <button
                        type="button"
                        className="sl-submit-btn sl-btn--secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setCustStep('branch');
                          setCustError('');
                          setCustSuccess('');
                        }}
                      >
                        <i className="fa-solid fa-arrow-left" /> Back
                      </button>
                      <button
                        type="submit"
                        className="sl-submit-btn sl-btn--cust"
                        disabled={custLoading}
                        style={{ flex: 1.8 }}
                        id="sl-customer-verify-pin-btn"
                      >
                        {custLoading ? (
                          <><span className="sl-spinner" /> Verifying...</>
                        ) : (
                          <><i className="fa-solid fa-check" /> Confirm &amp; Login</>
                        )}
                      </button>
                    </div>
                  </form>
                )}
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
                      <i className="fa-solid fa-user" style={{ color: '#6366f1', fontSize: '14px', marginRight: '4px' }} />
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
                      <i className="fa-solid fa-lock" style={{ color: '#6366f1', fontSize: '14px', marginRight: '4px' }} />
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

      {/* ── OTP Verification Modal ── */}
      <AnimatePresence>
        {showOtpPopup && (
          <motion.div
            className="sl-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOtpPopup(false)}
          >
            <motion.div
              className="sl-modal-content"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sl-modal-header">
                <div className="sl-modal-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <i className="fa-solid fa-circle-check" />
                </div>
                <h3>OTP Generated</h3>
              </div>
              <div className="sl-modal-body">
                <p>Use the following OTP verification code to log in:</p>
                <div className="sl-modal-otp-display">
                  {otpPopupVal}
                </div>
                <p className="sl-modal-note">This is a temporary code for demo purposes.</p>
              </div>
              <button
                type="button"
                className="sl-modal-btn"
                onClick={() => setShowOtpPopup(false)}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
