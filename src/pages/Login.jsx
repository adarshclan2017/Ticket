import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE } from '../apiConfig';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [remember, setRemember]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) { setError('Please enter your username.'); return; }
    if (!password.trim()) { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/unniService.asmx/validateUserLogin?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const text = await response.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];

      if (!stringNode) {
        throw new Error('Invalid response from server.');
      }

      const jsonString = stringNode.textContent || stringNode.innerText;
      const data = JSON.parse(jsonString);

      if (data.responseMessage === 'Success') {
        const userData = data.user[0];
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        
        setSuccess('Login successful! Redirecting…');
        setTimeout(() => navigate('/home'), 900);
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 130
      }
    }
  };

  return (
    <div className="login-page">
      <motion.div 
        className="login-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Brand */}
        <motion.div className="login-brand" variants={itemVariants}>
          <div className="login-logo-icon">
            <i className="fas fa-headset"></i>
          </div>
          <div className="login-brand-text">
            <span className="login-brand-name">SupportDesk</span>
            <span className="login-brand-sub">Ticket Management System</span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div className="login-heading" variants={itemVariants}>
          <h1>Welcome back</h1>
        </motion.div>

        <motion.div className="login-divider" variants={itemVariants}></motion.div>

        {/* Status messages */}
        {error && (
          <motion.div className="login-error-msg" style={{ marginBottom: 14 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div className="login-success-msg" style={{ marginBottom: 14 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <i className="fas fa-check-circle"></i>
            {success}
          </motion.div>
        )}

        {/* Form */}
        <motion.form 
          className="login-form" 
          onSubmit={handleSubmit} 
          id="login-form"
          variants={containerVariants}
        >
          {/* Username */}
          <motion.div variants={itemVariants}>
            <span className="login-field-label">Username</span>
            <div className="login-input-box">
              <span className="login-input-icon">
                <i className="fas fa-user"></i>
              </span>
              <input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                autoComplete="username"
                autoFocus
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants}>
            <span className="login-field-label">Password</span>
            <div className="login-input-box">
              <span className="login-input-icon">
                <i className="fas fa-lock"></i>
              </span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass((p) => !p)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                id="login-toggle-password"
              >
                <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>
          </motion.div>

          {/* Remember + Forgot */}
          <motion.div className="login-options-row" variants={itemVariants}>
            <label className="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                className="login-checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              className="login-forgot"
              id="login-forgot-password"
            >
              Forgot password?
            </button>
          </motion.div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="login-submit-btn"
            id="login-submit"
            disabled={loading}
            variants={itemVariants}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Signing in…
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right-to-bracket"></i>
                Sign In
              </>
            )}
          </motion.button>
        </motion.form>

        <motion.p className="login-footer-note" variants={itemVariants}>
          <i className="fas fa-arrow-left" />
          &nbsp;<Link to="/" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Back to role selection</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
