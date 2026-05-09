import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AgentStatus from './pages/AgentStatus';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/agent-status" element={<AgentStatus />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;