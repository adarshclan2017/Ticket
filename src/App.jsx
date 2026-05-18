import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AgentStatus from './pages/AgentStatus';
import PendingTickets from './pages/PendingTickets';
import Login from './pages/Login';
import RoleSelect from './pages/RoleSelect';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/agent-status" element={<AgentStatus />} />
        <Route path="/pending-tickets" element={<PendingTickets />} />
      </Routes>
    </Router>
  );
}

export default App;