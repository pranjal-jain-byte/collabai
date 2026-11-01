// App Component - Router and Global Context Setup

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/doc/:docId" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
