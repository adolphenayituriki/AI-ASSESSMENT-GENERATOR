import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('ai_token')));

  useEffect(() => {
    const token = localStorage.getItem('ai_token');
    if (token && !user) {
      api
        .get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('ai_user', JSON.stringify(res.data.user));
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const login = useCallback(async (identifier, password) => {
    setLoading(true);
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const res = await api.post('/auth/login', {
        [isEmail ? 'email' : 'username']: identifier,
        password,
      });
      localStorage.setItem('ai_token', res.data.token);
      localStorage.setItem('ai_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ name, username, email, password }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, username, email, password });
      localStorage.setItem('ai_token', res.data.token);
      localStorage.setItem('ai_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ai_token');
    localStorage.removeItem('ai_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((next) => {
    setUser(next);
    try {
      localStorage.setItem('ai_user', JSON.stringify(next));
    } catch {}
  }, []);

  const value = { user, loading, checking, login, register, logout, updateUser, isAdmin: user?.role === 'admin' || user?.role === 'leader' };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
