// useAuth Hook - Authentication & Collaborator Session Context

import React, { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../services/api.js';

export const DEMO_USERS = [
  { id: 'alex-rivera', name: 'Alex Rivera', role: 'Frontend Lead', color: '#1a73e8' },
  { id: 'sarah-chen', name: 'Sarah Chen', role: 'AI Architect', color: '#7c3aed' },
  { id: 'david-kim', name: 'David Kim', role: 'Systems Engineer', color: '#059669' },
];

function getUserColor(userId) {
  const demo = DEMO_USERS.find(u => u.id === userId);
  if (demo) return demo.color;
  const colors = ['#1a73e8', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedId = localStorage.getItem('collabai_user_id');
    const savedName = localStorage.getItem('collabai_user_name') || savedId;
    if (savedId) {
      return { id: savedId, name: savedName, color: getUserColor(savedId) };
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  // Auto-provision demo session if no session exists
  useEffect(() => {
    const { accessToken } = api.getTokens();
    if (!accessToken && !user) {
      const defaultDemo = DEMO_USERS[0];
      login(defaultDemo.id, defaultDemo.name).catch(() => {});
    }
  }, []);

  const login = async (userId, customName = null) => {
    setLoading(true);
    try {
      const data = await api.login(userId);
      const demo = DEMO_USERS.find(u => u.id === userId);
      const displayName = customName || (demo ? demo.name : userId);

      localStorage.setItem('collabai_user_name', displayName);
      const newUser = {
        id: userId,
        name: displayName,
        color: getUserColor(userId),
      };
      setUser(newUser);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, demoUsers: DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
