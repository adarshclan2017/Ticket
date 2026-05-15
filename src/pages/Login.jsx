import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      // ── Replace this block with your real API call ──────────────────
      await new Promise((res) => setTimeout(res, 1200)); // simulate network
      // Example:
      // const res = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password }),
      // });
      // if (!res.ok) throw new Error('Invalid credentials');
      // const data = await res.json();
      // localStorage.setItem('token', data.token);
      // ────────────────────────────────────────────────────────────────
      setSuccess('Login successful! Redirecting…');
      setTimeout(() => navigate('/home'), 900);
    } catch (err) {
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


      </div>
    </div>
  );
}
