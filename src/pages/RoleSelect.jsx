import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';

export default function RoleSelect() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleEmployee = () => {
    localStorage.setItem('userRole', 'employee');
    navigate('/login');
  };

  const handleCustomer = () => {
    localStorage.setItem('userRole', 'customer');
    navigate('/home');
  };

  // Parallax effect for blobs
  const handlePageMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    setMousePos({ x, y });
  };

  // Card glow effect
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="role-page" onMouseMove={handlePageMouseMove}>
      {/* Animated background blobs with parallax wrapper */}
      <div className="role-blob-wrapper" style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}>
        <div className="role-blob role-blob-1" />
      </div>
      <div className="role-blob-wrapper" style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}>
        <div className="role-blob role-blob-2" />
      </div>
      <div className="role-blob-wrapper" style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * -20}px)` }}>
        <div className="role-blob role-blob-3" />
      </div>

      <div className="role-container">
        {/* Brand Header */}
        <div className="role-brand">
          <div className="role-brand-icon">
            <i className="fa-solid fa-headset" />
          </div>
          <div className="role-brand-text">
            <span className="role-brand-name">Inpack</span>
            <span className="role-brand-sub">Ticket Management System</span>
          </div>
        </div>

        {/* Heading */}
        <div className="role-heading">
          <h1>Select Your Role</h1>
        </div>

        {/* Role Cards */}
        <div className="role-cards">
          {/* Employee Card */}
          <button
            className="role-card role-card--employee"
            id="role-select-employee"
            onClick={handleEmployee}
            onMouseMove={handleCardMouseMove}
          >
            <div className="role-card-glow role-card-glow--employee" />
            <div className="role-card-icon-wrap role-icon-emp">
              <i className="fa-solid fa-user-tie" />
            </div>
            <div className="role-card-body">
              <h2>Employee</h2>
              <p>Access the full dashboard with pending tickets, assignments and recent records.</p>
            </div>
            <div className="role-card-arrow">
              <i className="fa-solid fa-arrow-right" />
            </div>
            <div className="role-card-badge role-badge--emp">
              <i className="fa-solid fa-lock" />
              Login Required
            </div>
          </button>

          {/* Customer Card */}
          <button
            className="role-card role-card--customer"
            id="role-select-customer"
            onClick={handleCustomer}
            onMouseMove={handleCardMouseMove}
          >
            <div className="role-card-glow role-card-glow--customer" />
            <div className="role-card-icon-wrap role-icon-cust">
              <i className="fa-solid fa-user" />
            </div>
            <div className="role-card-body">
              <h2>Customer</h2>
              <p>Quickly raise a support ticket without an account — no login needed.</p>
            </div>
            <div className="role-card-arrow">
              <i className="fa-solid fa-arrow-right" />
            </div>
            <div className="role-card-badge role-badge--cust">
              <i className="fa-solid fa-bolt" />
              Instant Access
            </div>
          </button>
        </div>

        <p className="role-footer">
          <i className="fa-solid fa-shield-halved" />
          &nbsp;Your session is secured and private
        </p>
      </div>
    </div>
  );
}
