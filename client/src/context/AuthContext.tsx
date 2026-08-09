/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  email: string;
  role: 'admin' | 'client';
  full_name?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Base API URL connection
export const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;

// Helper to decode JWT payload without library dependency
const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const AUTO_EMAIL    = 'admin@dronemonitor.com';
  const AUTO_PASSWORD = 'admin123';

  useEffect(() => {
    const initializeAuth = async () => {
      // Try existing token first
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const decoded = parseJwt(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser({ email: decoded.sub, role: decoded.role });
          try {
            const res = await axios.get('/api/auth/me');
            setUser(prev => prev ? { ...prev, full_name: res.data.full_name } : null);
          } catch {
            // token invalid — fall through to auto-login
          }
          setLoading(false);
          return;
        }
      }

      // No valid token — auto-login silently
      try {
        const form = new URLSearchParams();
        form.append('username', AUTO_EMAIL);
        form.append('password', AUTO_PASSWORD);
        const res = await axios.post('/api/auth/login', form, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const newToken = res.data.access_token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        const decoded = parseJwt(newToken);
        setUser({ email: decoded.sub, role: decoded.role });
        try {
          const me = await axios.get('/api/auth/me');
          setUser(prev => prev ? { ...prev, full_name: me.data.full_name } : null);
        } catch { /* ignore */ }
      } catch (err) {
        console.warn('[Auth] Auto-login failed — manual login required:', err);
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const res = await axios.post('/api/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const newToken = res.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    const decoded = parseJwt(newToken);
    setUser({ email: decoded.sub, role: decoded.role });
    try {
      const me = await axios.get('/api/auth/me');
      setUser(prev => prev ? { ...prev, full_name: me.data.full_name } : null);
    } catch { /* ignore */ }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
