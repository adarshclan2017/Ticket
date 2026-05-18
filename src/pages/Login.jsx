import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      // Use the proxy endpoint defined in vite.config.js
      const response = await fetch(`${API_BASE}/unniService.asmx/validateUserLogin?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const text = await response.text();
      
      // Parse ASMX XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const stringNode = xmlDoc.getElementsByTagName('string')[0];

      if (!stringNode) {
        throw new Error('Invalid response from server.');
      }

      const jsonString = stringNode.textContent || stringNode.innerText;
      const data = JSON.parse(jsonString);

      if (data.responseMessage === 'Success') {
        // Store user info for global use
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

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo-icon">
            <i className="fas fa-headset"></i>
          </div>
          <div className="login-brand-text">
            <span className="login-brand-name">SupportDesk</span>
            <span className="login-brand-sub">Ticket Management System</span>
          </div>
        </div>



        {/* Heading */}
        <div className="login-heading">
          <h1>Welcome back</h1>
        </div>

        <div className="login-divider"></div>

        {/* Status messages */}
        {error && (
          <div className="login-error-msg" style={{ marginBottom: 14 }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        {success && (
          <div className="login-success-msg" style={{ marginBottom: 14 }}>
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">

          {/* Username */}
          <div>
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
          </div>

          {/* Password */}
          <div>
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
          </div>

          {/* Remember + Forgot */}
          <div className="login-options-row">
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit-btn"
            id="login-submit"
            disabled={loading}
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
          </button>
        </form>

        <p className="login-footer-note">
          <i className="fas fa-arrow-left" />
          &nbsp;<Link to="/" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Back to role selection</Link>
        </p>

      </div>
    </div>
  );
}
